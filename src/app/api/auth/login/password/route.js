import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    const user = await Customer.findOne({ email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    return NextResponse.json({ message: "Login successful", user });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
