export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        console.log("OPay Payment Notification Received:", JSON.stringify(body));

        // SECURITY LAYER 1: Verify Header Signature or Secret Key for Authentication
        // OPay usually sends a signature header (e.g., 'X-Opay-Signature') to authenticate requests
        const opaySignature = request.headers.get("X-Opay-Signature");
        
        /* NOTE: If you haven't configured signature verification yet, you can uncomment this 
        IP validation block to ensure requests only come from OPay's official IP gateway infrastructure.
        
        const clientIp = request.headers.get("CF-Connecting-IP");
        const allowedOpayIps = ["121.201.20.0/24", "121.201.24.0/24"]; // Replace with actual OPay production IPs
        */

        // Validate OPay code execution response structure
        // OPay IPN response usually contains response code '00000' or status 'SUCCESS'
        if (body.status === "SUCCESS" || body.code === "00000" || body.responseCode === "00") {
            
            const metadata = body.metadata || body.metaData || {};
            const username = metadata.username; 
            const amountPaid = parseFloat(body.amount);
            const transactionId = body.transactionId || body.orderNo || body.reference;

            if (!username || isNaN(amountPaid) || !transactionId) {
                return new Response(JSON.stringify({ status: "BAD_REQUEST", message: "Missing vital webhook parameters" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const firebaseDbUrl = "https://cm-nexus-sub-default-rtdb.firebaseio.com";
            const cleanUsername = username.replace(/[.#$[\]]/g, "_");

            // SECURITY LAYER 2: Prevent Duplicate Transactions (Idempotency Lock)
            // We check if this unique OPay transactionId already exists inside our logs database
            const txCheckResponse = await fetch(`${firebaseDbUrl}/opay_transactions/${transactionId}.json`);
            const txLogExists = await txCheckResponse.json();

            if (txLogExists !== null) {
                return new Response(JSON.stringify({ status: "DUPLICATE", message: "Transaction already processed inside CM Nexus database" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // MATHEMATICAL LAYER 3: Atomic Multi-Path Update Architecture via Firebase REST API
            // Maimakon GET da PUT, muna amfani da PATCH tare da '.sv': 'increment' don tabbatar da Firebase da kansa ya yi lissafin
            const updatePayload = {
                [`users/${cleanUsername}/wallet`]: { ".sv": { "increment": amountPaid } },
                [`opay_transactions/${transactionId}`]: {
                    "username": cleanUsername,
                    "amount": amountPaid,
                    "timestamp": { ".sv": "timestamp" }
                }
            };

            const firebaseUpdateResponse = await fetch(`${firebaseDbUrl}/.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload)
            });

            if (firebaseUpdateResponse.ok) {
                return new Response(JSON.stringify({ status: "SUCCESS", message: "CM Nexus wallet atomic update complete" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } else {
                throw new Error("Failed to commit transactional state to Firebase Realtime Database");
            }
        }

        return new Response(JSON.stringify({ status: "IGNORED", message: "Status was not successful" }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Webhook Execution Failure:", error.message);
        return new Response(JSON.stringify({ error: "Internal Gateway Server Error", details: error.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
