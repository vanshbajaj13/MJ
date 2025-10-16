// src/app/api/shipping/create-shipment/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Order } from "@/models";
import Razorpay from "razorpay";

const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const PICKUP_PINCODE = process.env.PICKUP_PINCODE || "125001";

// Cache for Shiprocket token
let cachedToken = null;
let tokenExpiry = null;

async function getShiprocketToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(`${SHIPROCKET_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      cachedToken = data.token;
      tokenExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000; // 8 days
      return cachedToken;
    }

    console.error("❌ Shiprocket auth failed:", data);
    throw new Error(data.message || "Failed to authenticate with Shiprocket");
  } catch (error) {
    console.error("❌ Shiprocket authentication error:", error);
    throw error;
  }
}

/**
 * Create shipment on Shiprocket
 * Called after order is confirmed and payment is completed
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { orderId, orderNumber } = await request.json();

    if (!orderId && !orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID or Order Number is required",
        },
        { status: 400 }
      );
    }

    // ========================================
    // 1. FETCH ORDER FROM DATABASE
    // ========================================
    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderNumber });
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    // ========================================
    // 2. VALIDATION: Check if shipment already created (early exit)
    // ========================================
    if (
      order.shipmentDetails &&
      order.shipmentDetails.shipmentId &&
      order.shipmentDetails.awbCode
    ) {
      return NextResponse.json(
        {
          success: true,
          message: "Shipment already created for this order",
          shipment: {
            shipmentId: order.shipmentDetails.shipmentId,
            awbCode: order.shipmentDetails.awbCode,
            courierName: order.shipmentDetails.courierName,
            trackingUrl: order.shipmentDetails.trackingUrl,
          },
        },
        { status: 200 }
      );
    }

    // ========================================
    // 3. ATOMIC LOCK: Prevent concurrent shipment creation
    // ========================================
    const lockedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        $or: [
          { "shipmentDetails.creationInProgress": { $exists: false } },
          { "shipmentDetails.creationInProgress": false },
        ],
      },
      { $set: { "shipmentDetails.creationInProgress": true } },
      { new: true }
    );

    if (!lockedOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Shipment creation already in progress for this order",
          details: "Please wait for the previous request to complete",
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Refresh order reference
    order = lockedOrder;

    try {
      // ========================================
      // 4. VALIDATION: Check order status
      // ========================================
      if (
        order.orderStatus !== "confirmed" &&
        order.orderStatus !== "processing"
      ) {
        throw new Error(
          `Cannot create shipment for order with status: ${order.orderStatus}`
        );
      }

      // ========================================
      // 5. PREPARE SHIPMENT PAYLOAD
      // ========================================
      const [firstName, ...restName] = order.shippingAddress.fullName.split(" ");
      const lastName = restName.join(" ") || ".";

      const shipmentPayload = {
        order_id: order.orderNumber,
        order_date: order.orderDate
          ? new Date(order.orderDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        pickup_location: "Home",
        channel_id: "",
        comment: `Order ${order.orderNumber} - ${order.items.length} items`,
        shipping_is_billing: true,
        billing_customer_name: order.shippingAddress.fullName,
        billing_last_name: lastName,
        billing_email: order.shippingAddress.email || order.customerEmail,
        billing_phone: order.customerPhone,
        billing_address: order.shippingAddress.addressLine1,
        billing_city: order.shippingAddress.city,
        billing_pincode: order.shippingAddress.pincode,
        billing_state: order.shippingAddress.state,
        billing_country: "India",

        shipping_customer_name: order.shippingAddress.fullName,
        shipping_email: order.shippingAddress.email || order.customerEmail,
        shipping_phone: order.customerPhone,
        shipping_address: order.shippingAddress.addressLine1,
        shipping_city: order.shippingAddress.city,
        shipping_pincode: order.shippingAddress.pincode,
        shipping_state: order.shippingAddress.state,
        shipping_country: "India",

        order_items: order.items.map((item) => ({
          name: item.name,
          sku: item.slug || `SKU-${item.productId}`,
          units: item.quantity,
          selling_price: item.price,
        })),

        payment_method: "Prepaid",
        sub_total: order.totals.finalTotal,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5,
      };

      if (order.shippingAddress.landmark) {
        shipmentPayload.billing_address_type =
          order.shippingAddress.addressType || "home";
        shipmentPayload.shipping_address_type =
          order.shippingAddress.addressType || "home";
      }

      // ========================================
      // 6. GET SHIPROCKET TOKEN
      // ========================================
      let token;
      try {
        token = await getShiprocketToken();
      } catch (error) {
        throw new Error(`Shiprocket auth failed: ${error.message}`);
      }

      // ========================================
      // 7. CREATE SHIPMENT ON SHIPROCKET
      // ========================================
      const shipmentResponse = await fetch(
        `${SHIPROCKET_API_URL}/orders/create/adhoc`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shipmentPayload),
        }
      );

      const shipmentData = await shipmentResponse.json();

      if (!shipmentResponse.ok) {
        console.error("❌ Shiprocket shipment creation failed:", shipmentData);
        throw new Error(
          shipmentData.message || JSON.stringify(shipmentData.errors)
        );
      }

      console.log("✅ Shiprocket shipment created successfully:", shipmentData);

      // ========================================
      // 8. UPDATE ORDER WITH SHIPMENT DETAILS
      // ========================================
      order.shipmentDetails = {
        shipmentId: shipmentData.shipment_id,
        awbCode: shipmentData.awb_code || null,
        courierName: shipmentData.courier_company_name || "Pending",
        trackingUrl: shipmentData.tracking_data?.track_url || null,
        estimatedDelivery: shipmentData.estimated_delivery_date
          ? new Date(shipmentData.estimated_delivery_date)
          : null,
        creationInProgress: false, // Unlock after successful creation
      };

      if (order.orderStatus === "confirmed") {
        order.orderStatus = "processing";
        order.shippedAt = new Date();
      }

      await order.save();

      return NextResponse.json({
        success: true,
        message: "Shipment created successfully",
        shipment: {
          shipmentId: shipmentData.shipment_id,
          awbCode: shipmentData.awb_code || null,
          courierName: shipmentData.courier_company_name || "Pending",
          trackingUrl: shipmentData.tracking_data?.track_url || null,
          estimatedDeliveryDays: shipmentData.estimated_delivery_days || null,
          estimatedDeliveryDate: shipmentData.estimated_delivery_date || null,
        },
        order: {
          orderNumber: order.orderNumber,
          status: order.orderStatus,
        },
      });
    } catch (error) {
      // ========================================
      // 9. UNLOCK ON ERROR
      // ========================================
      console.error("❌ Error during shipment creation:", error);

      await Order.findByIdAndUpdate(order._id, {
        $set: { "shipmentDetails.creationInProgress": false },
      }).catch((unlockErr) =>
        console.error("❌ Failed to unlock order:", unlockErr)
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Error creating shipment",
          details:
            process.env.NODE_ENV === "development" ? error.toString() : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Create shipment error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create shipment. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch shipment details from Shiprocket
 */
export async function GET(request) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const shipmentId = searchParams.get("shipmentId");
    const orderNumber = searchParams.get("orderNumber");

    if (!shipmentId && !orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Shipment ID or Order Number is required",
        },
        { status: 400 }
      );
    }

    let order;
    if (orderNumber) {
      order = await Order.findOne({ orderNumber });

      if (!order || !order.shipmentDetails?.shipmentId) {
        return NextResponse.json(
          {
            success: false,
            error: "Shipment not found for this order",
          },
          { status: 404 }
        );
      }
    }

    const shippingShipmentId = shipmentId || order.shipmentDetails.shipmentId;

    // Get Shiprocket token
    const token = await getShiprocketToken();

    // Fetch shipment details from Shiprocket
    const response = await fetch(
      `${SHIPROCKET_API_URL}/shipments/track?shipment_id=${shippingShipmentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch shipment details",
          details: data.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      shipment: {
        shipmentId: data.shipment_id,
        awbCode: data.awb_code,
        status: data.status,
        courierName: data.courier_name,
        trackingUrl: data.track_url,
        currentLocation: data.current_location || null,
        expectedDelivery: data.expected_delivery_date || null,
        deliveredDate: data.delivered_date || null,
      },
    });
  } catch (error) {
    console.error("❌ Fetch shipment error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch shipment details",
      },
      { status: 500 }
    );
  }
}
