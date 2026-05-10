export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { fullName, email, username } = body; // Tabbatar ka turo da username shima daga register.html

    // Karbo Variables daga Cloudflare Settings
    const MONNIFY_API_KEY = env.MONNIFY_API_KEY;
    const MONNIFY_SECRET_KEY = env.MONNIFY_SECRET_KEY;
    const MONNIFY_CONTRACT_CODE = env.MONNIFY_CONTRACT_CODE;
    const MONNIFY_BASE_URL = "https://sandbox.monnify.com"; // Ko kuma "https://api.monnify.com" idan na gaske ne (Live)
    
    // Sanya Firebase URL ɗinka a nan daidai
    const FIREBASE_DB_URL = "https://cm-nexus-sub-default-rtdb.firebaseio.com"; 

    console.log(`Fara samar da banki ga: ${fullName} (${email})`);

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
    console.log("Monnify Token Response:", JSON.stringify(tokenData));

    if (!tokenData.requestSuccessful) {
      return new Response(JSON.stringify({ error: "Failed to get Monnify token", details: tokenData }), { status: 400 });
    }

    const accessToken = tokenData.responseBody.accessToken;

    // Step 2: Kirkiri Reserved Account a Monnify
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
    console.log("Monnify Account Reservation Response:", JSON.stringify(reservationData));

    if (reservationData.requestSuccessful && reservationData.responseBody.accounts.length > 0) {
      const primaryAccount = reservationData.responseBody.accounts[0];
      const bankName = primaryAccount.bankName;
      const accountNumber = primaryAccount.accountNumber;

      // Step 3: Adana bayanan banki a Firebase Database na mai amfani (User)
      // Muna amfani da 'username' na user ɗin don gano shi a Firebase
      const cleanUsername = username.replace(/[.#$[\]]/g, "_"); // Tsaftace username don Firebase key
      
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
        headers: { "Content-Type": "application/json" }
      });

    } else {
      return new Response(JSON.stringify({ error: "Reservation failed on Monnify", details: reservationData }), { status: 400 });
    }

  } catch (error) {
    console.error("Babban Kuskure (Exception):", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
