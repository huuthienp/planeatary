import axios from 'axios';
import { getStore } from '@netlify/blobs';


class CustomResponse extends Response {
  constructor(body = 'Success', status = 200) {
    const strBody = typeof body === 'string' ? body
      : JSON.stringify(body);

    let contentType;

    try {
      JSON.parse(strBody);
      contentType = 'application/json';
    } catch {
      contentType = 'text/plain';
    }

    const options = {
      status: status,
      headers: { 'Content-Type': contentType }
    };

    super(strBody, options);
  }
}


export default async (req, context) => {
  try {
    // Ensure the request method is POST
    const methodUpper = req.method.toUpperCase();
    if (methodUpper !== 'POST') {
      const message = `Method not allowed: ${methodUpper}.`;
      console.error(message);
      return new CustomResponse(message, 405);
    }

    // Extract quizType from query parameters
    const url = new URL(req.url.toLowerCase());
    const quizType = url.searchParams.get('quiztype');

    // Validate quizType
    if (quizType === null || quizType === undefined) {
      const message = `${url.href} is missing quiztype (case-insensitive, first occurence).`;
      console.error(message);
      return new CustomResponse(message, 400);

    } else if (quizType !== 'pre' && quizType !== 'post') {
      const emptyQuizType = quizType === '';
      const message = emptyQuizType ? `Empty quiz type.` : `${quizType} is an invalid quiz type.`;
      console.error(message);
      return new CustomResponse(message, 400);
    }

    // Convert quizType to lowercase
    const quizTypeLower = quizType.toLowerCase();

    // Determine the survey ID based on quiz type
    const { PRE_QUIZ_ID, POST_QUIZ_ID } = process.env;

    const surveyId = (quizTypeLower === 'pre') ? PRE_QUIZ_ID : POST_QUIZ_ID;

    const quizResponses = getStore(surveyId);

    // Extract responseId from request body
    const body = await req.json(); // error handled below

    const { responseId } = body;

    if (!responseId) {
      const strBody = JSON.stringify(body);
      const message = `${strBody} is missing a responseId (case-sensitive) or has an empty one.`;
      console.error(message);
      return new CustomResponse(message, 400);
    }

    // Check if responseId exists in Netlify Blobs
    const entry = await quizResponses.get(responseId, { consistency: 'strong' });

    if (entry === null) {
      const message = `${responseId} is not found in ${quizTypeLower}-quiz.`;
      console.error(message);
      return new CustomResponse(message, 404);
    }

    // Prepare API request to Qualtrics
    const { QDC_ID, Q_API_TOKEN } = process.env;

    const qUrl = `https://${QDC_ID}.qualtrics.com/API/v3/surveys/${surveyId}/responses/${responseId}`;

    const options = {
      method: 'GET',
      url: qUrl,
      headers: { Accept: 'application/json', 'X-API-TOKEN': Q_API_TOKEN },
    };

    // Make API request to Qualtrics
    const { data } = await axios.request(options);
    // axios throws error when status code is not 2xx

    // Return successful response
    return new CustomResponse(data); // default status is 200

  } catch (error) {
    // Handle any errors that occur during the process
    if (error.response) {
      // The request was made and the server responded with a non-2xx status code
      const message = error.response.data;
      console.error(message);
      return new CustomResponse(message, error.response.status);

    } else if (error.request) {
      // The request was made but no response was received
      const message = 'No response from Qualtrics.';
      console.error(message);
      return new CustomResponse(message, 503);

    } else if (error instanceof SyntaxError &&
      error.message.toLowerCase().includes('json')) {
      // Handle error from req.json()
      const body = await req.text();
      const message = `${body} is not valid JSON.`;
      return new CustomResponse(message, 400);

    } else {
      // Something happened in setting up the request that triggered an Error
      const message = error.message || error;
      console.error(message);
      return new CustomResponse(message, 500);
    }
  }
  // end of try-catch
}


export const config = { path: '/api/test-fetch-response' }
