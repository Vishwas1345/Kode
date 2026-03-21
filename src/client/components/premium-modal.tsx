"use client";

import { useState } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { usePremiumModal } from "@/client/store/use-premium-modal";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/client/components/ui/dialog";

const PLANS = [
    {
        name: "Free",
        price: "₹0",
        credits: 10,
        planId: "free",
        features: ["10 AI Generation credits", "Basic templates", "Community support"],
    },
    {
        name: "Standard",
        price: "₹499",
        credits: 100,
        planId: "standard",
        amount: 499,
        features: ["100 AI Generation credits", "Standard templates", "Email support", "Download raw code"],
    },
    {
        name: "Premium",
        price: "₹999",
        credits: 300,
        planId: "premium",
        amount: 999,
        features: ["300 AI Generation credits", "Pro templates", "Priority support", "Live Sandpack Previews", "Download raw code"],
    },
];

export const PremiumModal = () => {
    const { isOpen, onClose } = usePremiumModal();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const onBuyNow = async (planId: string, amount: number) => {
        try {
            setLoadingPlan(planId);

            const res = await loadRazorpayScript();
            if (!res) {
                alert("Razorpay SDK failed to load. Are you online?");
                setLoadingPlan(null);
                return;
            }

            const orderResponse = await fetch("/api/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planId, amount }),
            });

            if (!orderResponse.ok) {
                throw new Error("Failed to create order");
            }

            const { orderId } = await orderResponse.json();

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
                amount: amount * 100,
                currency: "INR",
                name: "Kode AI",
                description: `Kode ${planId} Plan`,
                order_id: orderId,
                handler: async function (response: any) {
                    setLoadingPlan(planId + "_verifying");
                    const verifyResponse = await fetch("/api/razorpay/payment-success", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                        }),
                    });

                    if (verifyResponse.ok) {
                        window.location.reload();
                    } else {
                        alert("Payment verification failed");
                        setLoadingPlan(null);
                    }
                },
                theme: {
                    color: "#00FF88",
                },
            };

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();

            razorpay.on('payment.failed', function () {
                setLoadingPlan(null);
            });

        } catch {
            setLoadingPlan(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-[#0A0A0A] border-[#1F1F1F] text-white p-0 overflow-hidden">
                <div className="p-8 pb-4">
                    <DialogTitle className="text-3xl font-bold text-center mb-2">Upgrade to Kode Pro</DialogTitle>
                    <DialogDescription className="text-center text-[#A0A0A0] mb-8">
                        Choose the perfect plan to build your Next.js ideas into reality.
                    </DialogDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 pt-0 bg-[#0A0A0A]">
                    {PLANS.map((plan) => (
                        <Card key={plan.planId} className="bg-[#131A15] border-[#1F1F1F] flex flex-col hover:border-[#00FF88]/50 transition-colors shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-[#00FF88]">
                                    {plan.price}
                                    <span className="ml-1 text-sm font-medium text-[#A0A0A0]">/{plan.credits} credits</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-[#E0E0E0]">
                                            <CheckIcon className="w-4 h-4 text-[#00FF88] mr-2 shrink-0 mt-0.5" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {plan.planId === "free" ? (
                                    <Button variant="outline" className="w-full border-[#1F1F1F] text-[#A0A0A0]" disabled>
                                        Current Plan
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => onBuyNow(plan.planId, plan.amount!)}
                                        disabled={loadingPlan !== null}
                                        className="w-full bg-[#00FF88] text-[#0B0F0C] hover:bg-[#00CC6A] font-semibold"
                                    >
                                        {loadingPlan === plan.planId ? <Loader2Icon className="animate-spin w-4 h-4 mr-2" /> : null}
                                        {loadingPlan === plan.planId + "_verifying" ? "Verifying..." : "Buy Now"}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};
