// src/app/api/shipping/check-pincode/route.js
import { NextResponse } from "next/server";

const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const PICKUP_PINCODE = process.env.PICKUP_PINCODE || "125001"; // Your warehouse pincode

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
      // Token expires in 10 days, refresh earlier for safety
      tokenExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000; // 8 days
      return cachedToken;
    }

    console.error("Shiprocket auth failed:", data);
    throw new Error(data.message || "Failed to authenticate with Shiprocket");
  } catch (error) {
    console.error("Shiprocket authentication error:", error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const { pincode } = await request.json();

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Invalid PIN code format" },
        { status: 400 }
      );
    }

    const token = await getShiprocketToken();

    // First, get pincode details
    const pincodeResponse = await fetch(
      `${SHIPROCKET_API_URL}/open/postcode/details?postcode=${pincode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!pincodeResponse.ok) {
      return NextResponse.json(
        {
          error: "Unable to fetch location details for this PIN code",
          deliverable: false,
        },
        { status: 400 }
      );
    }

    const pincodeData = await pincodeResponse.json();

    if (!pincodeData.postcode_details || !pincodeData.postcode_details.city) {
      return NextResponse.json(
        {
          error: "Invalid PIN code or location not found",
          deliverable: false,
        },
        { status: 400 }
      );
    }

    // Check pincode serviceability
    const params = new URLSearchParams({
      pickup_postcode: 125001,
      delivery_postcode: pincode,
      weight: "0.5",
      cod: "0",
    });

    const serviceabilityResponse = await fetch(
      `${SHIPROCKET_API_URL}/courier/serviceability?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // THIS WAS MISSING - Parse the serviceability response
    const serviceabilityData = await serviceabilityResponse.json();

    console.log("Serviceability response:", serviceabilityData);

    // Check if delivery is available
    const isDeliverable =
      serviceabilityData.data?.available_courier_companies &&
      serviceabilityData.data.available_courier_companies.length > 0;

    if (!isDeliverable) {
      return NextResponse.json({
        deliverable: false,
        error: "Delivery not available to this PIN code",
        pincode,
        city: pincodeData.postcode_details.city,
        state: pincodeData.postcode_details.state,
      });
    }

    // Calculate estimated delivery time
    const courierData = serviceabilityData.data.available_courier_companies[0];
    const estimatedDays =
      courierData.estimated_delivery_days ||
      (courierData.etd_hours ? Math.ceil(courierData.etd_hours / 24) : null) ||
      7; // Default to 7 days if no estimate

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDays);

    return NextResponse.json({
      deliverable: true,
      pincode,
      city: pincodeData.postcode_details.city,
      state: pincodeData.postcode_details.state,
      district: pincodeData.postcode_details.district || "",
      estimatedDeliveryDays: estimatedDays,
      estimatedDeliveryDate: estimatedDelivery.toISOString(),
      shippingOptions: serviceabilityData.data.available_courier_companies.map(
        (courier) => ({
          name: courier.courier_name,
          cost: courier.rate || 0,
          estimatedDays: courier.estimated_delivery_days || estimatedDays,
          cod: courier.is_cod_available === 1,
        })
      ),
    });
  } catch (error) {
    console.error("Pincode check error:", error);
    return NextResponse.json(
      {
        error: "Unable to check delivery availability. Please try again.",
        deliverable: false,
      },
      { status: 500 }
    );
  }
}
