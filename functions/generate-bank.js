export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context; 
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    const body = await request.json();
    const { amount, email, fullName, username } = body;

    if (!amount || !email || !fullName || !username) {
        return new Response(JSON.stringify({ error: "Missing required request parameters" }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    // Force strict integer datatype formatting for OPay production gateway compliance
    const cleanAmount = Math.round(parseFloat(amount));

    // LIVE PRODUCTION KEYS: 
    // If env variable injection is delayed, replace the text strings below with your active live production credentials directly for an immediate fix.
    const privateKey = env.OPAY_PRIVATE_KEY || "SAKA_LIVE_PRIVATE_KEY_DINKA_ANAN_IDAN_ENV_YA_GANA"; 
    const publicKey = env.OPAY_PUBLIC_KEY || "SAKA_LIVE_PUBLIC_KEY_DINKA_ANAN_IDAN_ENV_YA_GANA";

    const opayResponse = await fetch("https://api.opaycheckout.com/api/v1/local/cashier/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${privateKey}`
      },
      body: JSON.stringify({
        publicKey: publicKey,
        amount: cleanAmount.toString(), // Strict structural verification
        currency: "NGN",
        reference: "CMN-" + Date.now(),
        returnUrl: "https://cmnexussub.name.ng/success",
        callbackUrl: "https://cmnexussub.name.ng/api/webhook", 
        userEmail: email,
        userName: fullName,
        metadata: {
          username: username
        }
      })
    });

    const opayData = await opayResponse.json();
    return new Response(JSON.stringify(opayData), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("LIVE Cashier Creation API Bridge Failure:", error.message);
    return new Response(JSON.stringify({ error: "Internal live payment processing engine crash", details: error.message }), { 
        status: 500, 
        headers: corsHeaders 
    });
  }
}
