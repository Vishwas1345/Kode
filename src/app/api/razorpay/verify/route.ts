import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await req.json();

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            return NextResponse.json({ message: "Payment verified successfully" });
        } else {
            return NextResponse.json(
                { error: "Invalid signature sent!" },
                { status: 400 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: "Payment verification failed" },
            { status: 500 }
        );
    }
}
