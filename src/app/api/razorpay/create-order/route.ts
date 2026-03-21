import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
    try {
        const { amount } = await req.json();

        if (!amount) {
            return NextResponse.json(
                { error: "Amount is required" },
                { status: 400 }
            );
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
            key_secret: process.env.RAZORPAY_KEY_SECRET as string,
        });

        const options = {
            amount: amount * 100, // Amount should be in smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to create Razorpay order" },
            { status: 500 }
        );
    }
}
