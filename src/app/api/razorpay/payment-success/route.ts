import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { prisma } from "@/server/db";
import { PLAN_PURCHASE_CREDITS, BASE_FREE_CREDITS } from "@/shared/constants";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Verify signature
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return new NextResponse("Invalid signature", { status: 400 });
        }

        // Get the payment record
        const paymentRecord = await prisma.paymentRecord.findUnique({
            where: { razorpayOrderId: razorpay_order_id },
        });

        if (!paymentRecord) {
            return new NextResponse("Order not found", { status: 404 });
        }

        // Update payment record
        await prisma.paymentRecord.update({
            where: { razorpayOrderId: razorpay_order_id },
            data: {
                status: "success",
                razorpayPaymentId: razorpay_payment_id,
            },
        });

        // Update or create user subscription
        await prisma.userSubscription.upsert({
            where: { userId: paymentRecord.userId },
            update: { plan: paymentRecord.plan },
            create: {
                userId: paymentRecord.userId,
                plan: paymentRecord.plan,
            },
        });

        // Directly add credits to Usage
        const creditsToAdd = PLAN_PURCHASE_CREDITS[paymentRecord.plan] ?? 0;
        if (creditsToAdd > 0) {
            await prisma.usage.upsert({
                where: { key: paymentRecord.userId },
                update: {
                    points: {
                        increment: creditsToAdd
                    }
                },
                create: {
                    key: paymentRecord.userId,
                    points: creditsToAdd + BASE_FREE_CREDITS
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
