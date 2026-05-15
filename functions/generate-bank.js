export async function onRequestOptions(context) {
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

    // Strict formatting for sandbox gateway compliance
    const cleanAmount = Math.round(parseFloat(amount));

    // Hardcoded sandbox credentials directly from your active staging dashboard
    const privateKey = env.OPAY_PRIVATE_KEY || "OPAYPRV17784871036800.9285314107105687"; 
    const publicKey = env.OPAY_PUBLIC_KEY || "OPAYPUB17784871036800.8971411104862697";

    console.log(`Generating OPay SANDBOX checkout session link for user: ${username}`);

    // FIXED ENVIRONMENT: Routing explicitly to OPay international sandbox checkout engine
    const opayResponse = await fetch("https://sandbox-api.opaycheckout.com/api/v1/international/cashier/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${privateKey}`
      },
      body: JSON.stringify({
        publicKey: publicKey,
        amount: cleanAmount.toString(),
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
    console.error("SANDBOX Cashier Creation API Bridge Failure:", error.message);
    return new Response(JSON.stringify({ error: "Internal sandbox payment engine crash", details: error.message }), { 
        status: 500, 
        headers: corsHeaders 
    });
  }
}
