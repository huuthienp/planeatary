import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  // Check for authentication token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (token !== process.env.QC_ID) {
    return new Response("Invalid token", { status: 403 });
  }

  // Ensure the request method is POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse the JSON body from the request
    const data = await req.json();

    // Get the store
    const store = getStore(process.env.RESPONSE_STORE_NAME);

    // Check for missing keys
    const EXPECTED_KEYS = ["recordedDate", "quizType", "responseId", "respondentEmail"];
    const missingKeys = EXPECTED_KEYS.filter(key => !(key in data));

    if (missingKeys.length > 0) {
      return new Response(`Missing keys in JSON: ${missingKeys.join(', ')}`, { status: 400 });
    }

    // Use response ID as key
    const key = data.responseId;

    // Store the data in Netlify Blobs
    await store.set(key, JSON.stringify({
      recordedDate: data.recordedDate,
      quizType: data.quizType,
      respondentEmail: data.respondentEmail,
    }));

    return new Response(`Success: ${key}`, { status: 200 });

  } catch (error) {
    console.error(error)
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return new Response(`Cannot parse JSON`, { status: 400 });
    }
    return new Response("My bad", { status: 500 });
  }
};

export const config = { path: "/api/store-response" };
