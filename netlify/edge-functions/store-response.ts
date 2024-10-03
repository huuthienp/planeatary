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
    const store = getStore("Response-Store");

    // Use response ID as key
    const key = data.responseId;

    const value = {
      endDate: data.endDate,
      respondentEmail: data.respondentEmail
    };

    // Store the data in Netlify Blobs
    await store.setJSON(key, value);

    return new Response(`Success: ${key}`, { status: 200 });

  } catch (error) {
    console.error("Error:", error);
    return new Response("Error", { status: 500 });
  }
};

export const config = { path: "/api/store-response" };
