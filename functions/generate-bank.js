export async function onRequestOptions(context) {
  // Wannan yana kula da kiran preflight (OPTIONS) na wayoyin Android don hana CORS error
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Saita Headers na CORS don kowa ya iya kiran API din daga asalin App (APK)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    const body = await request.json();
    const { fullName, email, username } = body;

    if (!username) {
      return new Response(JSON.stringify({ error: "Username is required" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Karbo Variables na gaske (Live) daga Cloudflare Settings
    const MONNIFY_API_KEY = env.MONNIFY_API_KEY;
    const MONNIFY_SECRET_KEY = env.MONNIFY_SECRET_KEY;
    const MONNIFY_CONTRACT_CODE = env.MONNIFY_CONTRACT_CODE;
    
    // ASALIN LINK NA GASKIYA (LIVE) NA MONNIFY
    const MONNIFY_BASE_URL = "https://api.monnify.com"; 
    
    // Firebase URL dinka
    const FIREBASE_DB_URL = "https://cm-nexus-sub-default-rtdb.firebaseio.com"; 

    console.log(`Fara samar da asalin banki na gaske ga: ${fullName} (${email})`);

    // Step 1: Karbo Access Token na gaske daga Monnify
    const authHeader = btoa(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`);
    const tokenResponse = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    const tokenData = await tokenResponse.json();
    console.log("Monnify Live Token Response:", JSON.stringify(tokenData));

    if (!tokenData.requestSuccessful) {
      return new Response(JSON.stringify({ error: "Failed to get Monnify Live token", details: tokenData }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const accessToken = tokenData.responseBody.accessToken;

    // Step 2: Kirkiri Reserved Account na gaske a Monnify
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
    console.log("Monnify Live Account Reservation Response:", JSON.stringify(reservationData));

    if (reservationData.requestSuccessful && reservationData.responseBody.accounts.length > 0) {
      const primaryAccount = reservationData.responseBody.accounts[0];
      const bankName = primaryAccount.bankName;
      const accountNumber = primaryAccount.accountNumber;

      // Step 3: Adana bayanan banki a Firebase Database dumu-dumu
      const cleanUsername = username.replace(/[.#$[\]]/g, "_"); // Tsaftace username don Firebase
      
      const firebaseResponse = await fetch(`${FIREBASE_DB_URL}/users/${cleanUsername}/bankDetails.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bankName: bankName,
          accountNumber: accountNumber,
          accountName: fullName
        })
      });

      const firebaseData = await firebaseResponse.json();
      console.log("Firebase Save Response:", JSON.stringify(firebaseData));

      return new Response(JSON.stringify({
        status: "success",
        bank_name: bankName,
        account_number: accountNumber
      }), {
        status: 200,
        headers: corsHeaders
      });

    } else {
      return new Response(JSON.stringify({ error: "Reservation failed on Monnify Live", details: reservationData }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

  } catch (error) {
    console.error("Babban Kuskure na Gaske (Exception):", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
