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
        return new Response(JSON.stringify({ error: "Missing required request parameters" }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    // PRODUCTION LIVE UPGRADE: Read secure merchant credentials directly from Cloudflare Settings Environment
    // Make sure you update these keys to your real OPay Live Production Keys inside your Cloudflare Dashboard!
    const privateKey = env.OPAY_PRIVATE_KEY; 
    const publicKey = env.OPAY_PUBLIC_KEY;

    if (!privateKey || !publicKey) {
        return new Response(JSON.stringify({ error: "System Configuration Error: Live OPay API Keys are missing in Cloudflare settings." }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }

    console.log(`Generating OPay LIVE funding cashier link for user: ${username}`);

    // CRITICAL FIX: Switched to official OPay LOCAL LIVE endpoint for real production money transactions in Nigeria
    const opayResponse = await fetch("https://api.opaycheckout.com/api/v1/local/cashier/create", {
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
        
        // Automated Live IPN Callback to trigger our secure atomic firebase wallet funding webhook
        callbackUrl: "https://cmnexussub.name.ng/api/webhook", 
        
        userEmail: email,
        userName: fullName,
        metadata: {
          username: username // Secure tracking to pass account ownership to the webhook engine
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
