import axios from 'axios';
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    // Ensure the request method is POST
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Extract quizType from query parameters
    const url = new URL(req.url.toLowerCase());

    const quizType = url.searchParams.get("quiztype").toLowerCase();

    // Determine the survey ID based on quiz type
    const surveyId = (quizType === "pre") ? process.env.PRE_QUIZ_ID
      : (quizType === "post") ? process.env.POST_QUIZ_ID : "";

    // Validate quiz type
    if (!surveyId) {
      const message = `Invalid quiz type: ${quizType}`;
      return new Response(message, { status: 400 });
    }

    // Extract responseId from request body
    const body = await req.json();
    const { responseId } = body;

    // Check if responseId exists in Netlify Blobs
    const quizResponses = getStore(surveyId);
    const entry = await quizResponses.get(responseId, { consistency: "strong" });
    if (!entry) {
      const message = `Cannot find: ${responseId}`;
      console.error(message);
      return new Response(message, { status: 403 });
    }

    // Prepare API request to Qualtrics
    const { QDC_ID, Q_API_TOKEN } = process.env;
    const options = {
      method: 'GET',
      url: `https://${QDC_ID}.qualtrics.com/API/v3/surveys/${surveyId}/responses/${responseId}`,
      headers: { Accept: 'application/json', 'X-API-TOKEN': Q_API_TOKEN },
    };

    // Make API request to Qualtrics
    const { data } = await axios.request(options);

    // Return successful response
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    const message = "Oops!";
    return new Response(message, { status: 500 }) // Re-throw the error to be handled by the caller
  }
}

export const config = { path: "/api/fetch-response" }
