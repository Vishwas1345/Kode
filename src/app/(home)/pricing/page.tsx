"use client";

import { useState } from "react";
import { Logo } from "@/client/components/logo";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { handleRazorpayPayment } from "@/client/lib/razorpay";

import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/client/components/ui/card";

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

const Page = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const onBuyNow = async (planId: string, amount: number) => {
    handleRazorpayPayment(
      amount,
      () => setLoadingPlan(planId), // onStart
      () => {
        // onSuccess
        alert("Payment successful!");
        window.location.reload();
      },
      (error) => {
        // onError
        alert(error || "Payment failed");
        setLoadingPlan(null);
      }
    );
  };

  return (
    <div className="flex flex-col max-w-5xl mx-auto w-full pb-24">
      <section className="space-y-6 pt-[8vh] 2xl:pt-24 border-b border-[#1F1F1F] pb-12">
        <div className="flex flex-col items-center">
          <div className="hidden md:block transform scale-150 mb-4">
            <Logo />
          </div>
        </div>
        <h1 className="text-xl md:text-3xl font-bold text-center">Pricing</h1>
        <p className="text-muted-foreground text-center text-sm md:text-base mb-8">
          Upgrade to Kode Pro to build without limits.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 w-full">
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
                  <Button variant="outline" className="w-full border-[#1F1F1F] text-[#A0A0A0] h-12" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => onBuyNow(plan.planId, plan.amount!)}
                    disabled={loadingPlan !== null}
                    className="w-full bg-[#00FF88] text-[#0B0F0C] hover:bg-[#00CC6A] font-semibold h-12"
                  >
                    {loadingPlan === plan.planId ? <Loader2Icon className="animate-spin w-4 h-4 mr-2" /> : null}
                    {loadingPlan === plan.planId + "_verifying" ? "Verifying..." : "Buy Now"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Page;