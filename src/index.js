import Replicate from "replicate";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Handle API routes
    if (url.pathname === "/api/remove-bg" && request.method === "POST") {
      return handleRemoveBg(request, env);
    }

    // For non-API routes, return 404 to let assets handle it
    return new Response("Not Found", { status: 404 });
  },
};

async function handleRemoveBg(request, env) {
  try {
    const { image, token } = await request.json();

    if (!token) {
      return jsonResponse({ error: "Missing token" }, 400);
    }

    if (!image) {
      return jsonResponse({ error: "Missing image" }, 400);
    }

    const replicate = new Replicate({
      auth: token,
      baseUrl: "https://ai.hackclub.com/proxy/v1/replicate",
    });

    const input = { image };

    const output = await replicate.run(
      "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      { input }
    );

    // Handle different output formats
    let outputUrl;
    if (typeof output === "string") {
      outputUrl = output;
    } else if (output && typeof output.url === "function") {
      outputUrl = output.url();
    } else if (output && output.url) {
      outputUrl = output.url;
    } else {
      outputUrl = output;
    }

    return jsonResponse({ output: outputUrl });
  } catch (e) {
    console.error("Error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
