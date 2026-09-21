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

        if (!reference || !expectedAmount) {
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

        const amountMatches =
            Number(payment.amount) === Number(expectedAmount);

        const paymentSuccessful =
            payment.status === "success";

        const currencyMatches =
            payment.currency === "NGN";

        if (!paymentSuccessful || !amountMatches || !currencyMatches) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: "Payment verification failed"
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
        console.error(error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Server error while verifying payment"
            })
        };
    }
};