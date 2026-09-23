exports.handler = async function (event) {
    try {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405,
                body: JSON.stringify({
                    success: false,
                    message: "Method not allowed"
                })
            };
        }

        const { reference, expectedAmount } = JSON.parse(event.body || "{}");

        if (!reference || expectedAmount === undefined) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: "Reference and expected amount are required"
                })
            };
        }

        const response = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const result = await response.json();

        console.log("Paystack response:", JSON.stringify(result));

        if (!result.status || !result.data) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: "Could not verify payment"
                })
            };
        }

        const payment = result.data;

        // Convert expected amount from Naira to Kobo
        const expectedAmountInKobo = Math.round(Number(expectedAmount) * 100);

        const amountMatches =
            Number(payment.amount) === expectedAmountInKobo;

        const paymentSuccessful =
            payment.status === "success";

        const currencyMatches =
            payment.currency === "NGN";

        if (!paymentSuccessful || !amountMatches || !currencyMatches) {

            console.log("Verification failed:", {
                paystackAmount: payment.amount,
                expectedAmountInKobo,
                status: payment.status,
                currency: payment.currency
            });

            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: "Payment verification failed",
                    details: {
                        paystackAmount: payment.amount,
                        expectedAmount: expectedAmountInKobo,
                        status: payment.status,
                        currency: payment.currency
                    }
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Payment verified successfully",
                reference: payment.reference,
                amount: payment.amount,
                currency: payment.currency
            })
        };

    } catch (error) {

        console.error("Verification error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Server error while verifying payment"
            })
        };
    }
};