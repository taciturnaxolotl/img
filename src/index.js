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

    if (url.pathname === "/api/ic-light-background" && request.method === "POST") {
      return handleIcLightBackground(request, env);
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

    // Select model based on parameter
    const modelId = model === '851labs'
      ? "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc"
      : "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1";

    const output = await replicate.run(modelId, { input });

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

async function handleIcLightBackground(request, env) {
  try {
    const {
      subject_image,
      background_image,
      token,
      prompt = "high quality relit image",
      appended_prompt = "best quality",
      negative_prompt = "lowres, bad anatomy, bad hands, cropped, worst quality",
      width = 512,
      height = 640,
      steps = 25,
      cfg = 2,
      highres_scale = 1.5,
      highres_denoise = 0.5,
      light_source = "Use Background Image",
      output_format = "png",
      output_quality = 90
    } = await request.json();

    if (!token) {
      return jsonResponse({ error: "Missing token" }, 400);
    }

    if (!subject_image) {
      return jsonResponse({ error: "Missing subject_image" }, 400);
    }

    if (!background_image) {
      return jsonResponse({ error: "Missing background_image" }, 400);
    }

    const replicate = new Replicate({
      auth: token,
      baseUrl: "https://ai.hackclub.com/proxy/v1/replicate",
    });

    const input = {
      subject_image,
      background_image,
      prompt,
      appended_prompt,
      negative_prompt,
      width,
      height,
      steps,
      cfg,
      highres_scale,
      highres_denoise,
      light_source,
      output_format,
      output_quality
    };

    const modelId = "zsxkib/ic-light-background:60015df78a8a795470da6494822982140d57b150b9ef14354e79302ff89f69e3";

    const output = await replicate.run(modelId, { input });

    // Handle different output formats - IC-Light returns an array
    let outputUrl;
    if (Array.isArray(output) && output.length > 0) {
      outputUrl = output[0];
    } else if (typeof output === "string") {
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
    console.error("IC-Light Error:", e);
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
