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

    if (url.pathname === "/api/check-status" && request.method === "GET") {
      return handleCheckStatus(request, env);
    }

    // For non-API routes, return 404 to let assets handle it
    return new Response("Not Found", { status: 404 });
  },
};

async function handleRemoveBg(request, env) {
  try {
    const { image, token, model } = await request.json();

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

    // Select model based on parameter - use full model ID format
    const modelId = model === '851labs' 
      ? "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc"
      : "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1";

    console.log("Running model:", modelId);

    // Use replicate.run with stream option to get prediction ID
    const prediction = await replicate.run(modelId, { 
      input,
      wait: false  // Don't wait for completion
    });

    console.log("Prediction response:", prediction);

    // Check if we got a prediction object or direct output
    if (prediction && prediction.id) {
      // Got a prediction object, can poll it
      return jsonResponse({ 
        predictionId: prediction.id,
        status: prediction.status 
      });
    } else {
      // Got direct output (proxy may have waited), return it
      let outputUrl;
      if (typeof prediction === "string") {
        outputUrl = prediction;
      } else if (Array.isArray(prediction) && prediction.length > 0) {
        outputUrl = prediction[0];
      } else if (prediction && prediction.url) {
        outputUrl = prediction.url;
      } else {
        outputUrl = prediction;
      }
      
      return jsonResponse({ 
        status: 'succeeded',
        output: outputUrl 
      });
    }
  } catch (e) {
    console.error("Error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleCheckStatus(request, env) {
  try {
    const url = new URL(request.url);
    const predictionId = url.searchParams.get('id');
    const token = url.searchParams.get('token');

    if (!predictionId) {
      return jsonResponse({ error: "Missing prediction ID" }, 400);
    }

    if (!token) {
      return jsonResponse({ error: "Missing token" }, 400);
    }

    const replicate = new Replicate({
      auth: token,
      baseUrl: "https://ai.hackclub.com/proxy/v1/replicate",
    });

    const prediction = await replicate.predictions.get(predictionId);

    // Return status and output if available
    const response = {
      status: prediction.status,
    };

    if (prediction.status === 'succeeded' && prediction.output) {
      // Handle different output formats
      let outputUrl;
      if (typeof prediction.output === "string") {
        outputUrl = prediction.output;
      } else if (prediction.output && typeof prediction.output.url === "function") {
        outputUrl = prediction.output.url();
      } else if (prediction.output && prediction.output.url) {
        outputUrl = prediction.output.url;
      } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
        outputUrl = prediction.output[0];
      } else {
        outputUrl = prediction.output;
      }
      response.output = outputUrl;
    }

    if (prediction.status === 'failed') {
      response.error = prediction.error || 'Prediction failed';
    }

    return jsonResponse(response);
  } catch (e) {
    console.error("Error checking status:", e);
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
