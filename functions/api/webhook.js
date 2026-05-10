export async function onRequestPost(context) {
    const { request } = context;

    try {
        const body = await request.json();
        console.log("Monnify Notification Received:", body);

        // 1. Tabbatar da cewa biyan kudin ya yi nasara (SUCCESSFUL_TRANSACTION)
        if (body.eventData && body.eventType === "SUCCESSFUL_TRANSACTION") {
            const transaction = body.eventData;
            const customerEmail = transaction.customer.email.toLowerCase().trim();
            const amountPaid = parseFloat(transaction.amountPaid);

            // Firebase Realtime Database URL dinka
            const firebaseDbUrl = "https://cm-nexus-sub-default-rtdb.firebaseio.com";

            // 2. Nemo user a Firebase dake da wannan Email din
            const usersResponse = await fetch(`${firebaseDbUrl}/users.json`);
            const users = await usersResponse.json();

            if (users) {
                let targetUsername = null;
                let currentWalletBalance = 0;

                // Binciko username din dake da wannan email din dumu-dumu
                for (const username in users) {
                    if (users[username].email && users[username].email.toLowerCase().trim() === customerEmail) {
                        targetUsername = username;
                        currentWalletBalance = parseFloat(users[username].wallet || 0);
                        break;
                    }
                }

                // 3. Idan an sami user din, a kara masa kudin a wallet dinsa
                if (targetUsername) {
                    const newBalance = currentWalletBalance + amountPaid;

                    // Tura sabon balance din zuwa Firebase
                    const updateResponse = await fetch(`${firebaseDbUrl}/users/${targetUsername}/wallet.json`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(newBalance)
                    });

                    if (updateResponse.ok) {
                        return new Response(JSON.stringify({ status: "SUCCESS", message: "Wallet funded successfully" }), {
                            status: 200,
                            headers: { "Content-Type": "application/json" }
                        });
                    } else {
                        return new Response(JSON.stringify({ status: "ERROR", message: "Failed to update Firebase" }), { status: 500 });
                    }
                } else {
                    return new Response(JSON.stringify({ status: "ERROR", message: "User not found" }), { status: 404 });
                }
            }
        }

        return new Response(JSON.stringify({ status: "IGNORED" }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ status: "ERROR", message: error.message }), { status: 500 });
    }
}
