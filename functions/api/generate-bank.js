export async function onRequestPost(context) {
    const { request } = context;

    try {
        const body = await request.json();
        const { fullName, email } = body;

        const MONNIFY_API_KEY = "MK_TEST_618ZWPXNG0";
        const MONNIFY_SECRET_KEY = "LNAJQPMZ2W47N7RQTUGCRPBK8N2LVU9M";
        const MONNIFY_CONTRACT_CODE = "1133314277";
        const MONNIFY_BASE_URL = "https://sandbox.monnify.com";

        // Step 1: Samu Access Token daga Monnify
        const authHeader = btoa(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`);
        const tokenResponse = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json'
            }
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.requestSuccessful) {
            return new Response(JSON.stringify({ error: "Failed to get token" }), { status: 400 });
        }

        const accessToken = tokenData.responseBody.accessToken;

        // Step 2: Kirkiro Reserved Account
        const accountReference = "REF-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now();
        const reservationResponse = await fetch(`${MONNIFY_BASE_URL}/api/v1/bank-transfer/reserved-accounts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountReference: accountReference,
                accountName: fullName,
                currencyCode: "NGN",
                contractCode: MONNIFY_CONTRACT_CODE,
                customerEmail: email,
                customerName: fullName,
                getAllAvailableBanks: true
            })
        });

        const reservationData = await reservationResponse.json();
        if (reservationData.requestSuccessful && reservationData.responseBody.accounts.length > 0) {
            const primaryAccount = reservationData.responseBody.accounts[0];
            return new Response(JSON.stringify({
                bank_name: primaryAccount.bankName,
                account_number: primaryAccount.accountNumber
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else {
            return new Response(JSON.stringify({ error: "Reservation failed" }), { status: 400 });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
