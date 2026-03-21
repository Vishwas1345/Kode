interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(false);
            return;
        }

        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const handleRazorpayPayment = async (
    amount: number,
    onStart?: () => void,
    onSuccess?: () => void,
    onError?: (error?: string) => void
) => {
    try {
        if (onStart) onStart();

        const isLoaded = await loadRazorpayScript();

        if (!isLoaded) {
            if (onError) onError("Razorpay SDK failed to load. Please check your connection.");
            return;
        }

        const orderResponse = await fetch("/api/razorpay/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok || orderData.error) {
            if (onError) onError(orderData.error || "Failed to create order");
            return;
        }

        const options = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Kode AI",
            description: "Payment Transaction",
            order_id: orderData.order_id,
            handler: async function (response: RazorpayResponse) {
                try {
                    const verifyResponse = await fetch("/api/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(response),
                    });

                    const verifyData = await verifyResponse.json();

                    if (verifyResponse.ok && verifyData.message) {
                        if (onSuccess) onSuccess();
                    } else {
                        if (onError) onError(verifyData.error || "Payment verification failed");
                    }
                } catch {
                    if (onError) onError("Error verifying payment");
                }
            },
            prefill: {
                name: "Test User",
                email: "test@example.com",
                contact: "9999999999",
            },
            theme: {
                color: "#00FF88",
            },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();

        paymentObject.on("payment.failed", function (response: { error: { description: string } }) {
            if (onError) onError("Payment failed! Reason: " + response.error.description);
        });
    } catch {
        if (onError) onError("Something went wrong initializing the payment.");
    }
};
