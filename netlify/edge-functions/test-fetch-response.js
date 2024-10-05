import axios from "axios";
import { getStore } from "@netlify/blobs";

class CustomResponse extends Response {
  constructor(message = "Error", status = 500) {
    const body = JSON.stringify({ message: message });
    const options = {
      status: status,
      headers: { "Content-Type": "application/json" }
    };
    super(body, options);

    this.message = message;
    this.statusCode = status;
  }
}

export default async (req, context) => {
  try {
    // Ensure the request method is POST
    if (req.method !== "POST") {
      const message = "Method not allowed";
      return new CustomResponse(message, 405);
    }

    // Determine the survey ID based on quiz type
    const surveyId = process.env.PRE_QUIZ_ID;

    // Extract responseId from request body
    const responseId = "R_4EO2OMpi5JAYq0F";

    // Check if responseId exists in Netlify Blobs
    const quizResponses = getStore(surveyId);
    const entry = await quizResponses.get(responseId, { consistency: "strong" });
    if (!entry) {
      const message = `Invalid response ID: ${responseId}`;
      console.error(message);
      return new CustomResponse(message, 403);
    }

    // Prepare API request to Qualtrics
    const { QDC_ID, Q_API_TOKEN } = process.env;
    const options = {
      method: "GET",
      url: `https://${QDC_ID}.qualtrics.com/API/v3/surveys/${surveyId}/responses/${responseId}`,
      headers: { Accept: "application/json", "X-API-TOKEN": Q_API_TOKEN },
    };

    // Make API request to Qualtrics
    const { data } = await axios.request(options);

    // Return successful response
    return new CustomResponse(data, 200);

  } catch (error) {
    // Handle any errors that occur during the process
    if (error.response) {
      // The request was made and the server responded with a non-2xx status code
      const message = error.response.data;
      console.error(message);
      return new CustomResponse(message, error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      const message = "No response received";
      console.error(message);
      return new CustomResponse(message, 503);
    } else {
      // Something happened in setting up the request that triggered an Error
      const message = error.message || error;
      console.error(message);
      return new CustomResponse(message);
    }
  }
}

export const config = { path: "/api/test-fetch-response" }
