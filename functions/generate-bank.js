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

    // Validate incoming parameters from the mobile app runtime environment
    if (!amount || !email || !fullName || !username) {
        return new Response(JSON.stringify({ error: "Missing required request parameters (amount, email, fullName, username)" }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    // SANDBOX FALLBACK: Prioritize Cloudflare environment variables, fallback to test keys for active staging logs
    const privateKey = env.OPAY_PRIVATE_KEY || "OPAYPRV17784871036800.9285314107105687"; 
    const publicKey = env.OPAY_PUBLIC_KEY || "OPAYPUB17784871036800.8971411104862697";

    console.log(`Generating OPay secure sandbox funding cashier link for: ${username}`);

    // Call official OPay payment endpoint architecture
    const opayResponse = await fetch("https://api.opaycheckout.com/api/v1/international/cashier/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${privateKey}`
      },
      body: JSON.stringify({
        publicKey: publicKey,
        amount: amount,
        currency: "NGN",
        reference: "CMN-" + Date.now(),
        returnUrl: "https://cmnexussub.name.ng/success",
        
        // Automated IPN Callback to trigger the atomic worker webhook backend we built earlier
        callbackUrl: "https://cmnexussub.name.ng/api/webhook", 
        
        userEmail: email,
        userName: fullName,
        metadata: {
          username: username // Secure tunneling parameter to trace balance wallet allocation
        }
      })
    });

    const opayData = await opayResponse.json();
    return new Response(JSON.stringify(opayData), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("Cashier Creation API Bridge Failure:", error.message);
    return new Response(JSON.stringify({ error: "Internal payment processing engine crash", details: error.message }), { 
        status: 500, 
        headers: corsHeaders 
    });
  }
}
