import axios from 'axios';
import { getStore } from '@netlify/blobs';
import { CustomResponse } from '../../classes/http.mjs';


export default async (req) => {
  try {
    // Ensure the request method is POST
    const methodUpper = req.method.toUpperCase();
    if (methodUpper !== 'GET') {
      const message = `Method not allowed: ${methodUpper}.`;
      console.error(message);
      return new CustomResponse(message, 405);
    }

    // Extract quizType from query parameters
    const url = new URL(req.url.toLowerCase());
    const quizType = url.searchParams.get('quiztype');

    // Validate quizType
    if (quizType === null || quizType === undefined) {
      const message = 'URL is missing quiztype (case-insensitive, first occurence).';
      console.error(message, req.url);
      return new CustomResponse(message, 400);

    } else if (quizType !== 'pre' && quizType !== 'post') {
      const emptyQuizType = quizType === '';
      const message = emptyQuizType ? `Empty quiz type.` : `${quizType} is an invalid quiz type.`;
      console.error(message);
      return new CustomResponse(message, 400);
    }

    // Check if id exists in Netlify Blobs
    const { ID_HEADER } = process.env;
    const _id = req.headers.get(ID_HEADER);
    if (!_id) {
      const message = 'Unauthorized.';
      console.error(message, '\n', req.headers);
      return new CustomResponse(message, 401);
    }

    // Add prefix to id if necessary
    const { ID_PREFIX, ID_PREFIX_LENGTH } = process.env;
    const _hasPrefix = _id.slice(0, ID_PREFIX_LENGTH) === ID_PREFIX;
    const id = _hasPrefix ? _id : ID_PREFIX + _id;

    // Determine the survey ID based on quiz type
    const { PRE_QUIZ_ID, POST_QUIZ_ID } = process.env;
    const surveyId = (quizType === 'pre') ? PRE_QUIZ_ID : POST_QUIZ_ID;

    // Search Netlify Blobs for ID
    const quizResponses = getStore(surveyId);
    const entry = await quizResponses.get(id, { consistency: 'strong' });
    if (entry === null) {
      const message = `Invalid ID for ${quizType}-quiz.`;
      console.error(message);
      return new CustomResponse(message, 403);
    }

    // Prepare API request to Qualtrics
    const { QDC_ID, Q_API_TOKEN } = process.env;
    const qUrl = `https://${QDC_ID}.qualtrics.com/API/v3/surveys/${surveyId}/responses/${id}`;
    const options = {
      method: methodUpper,
      url: qUrl,
      headers: {
        Accept: 'application/json',
        'X-API-TOKEN': Q_API_TOKEN
      },
    };

    // Make API request to Qualtrics
    const { data } = await axios.request(options);
    // axios throws error when status code is not 2xx

    // Return successful response
    console.log(`A response is fetched.`);
    return new CustomResponse(data); // default status is 200

  } catch (error) {
    // Handle any errors that occur during the process
    if (error.response) {
      // The request was made and the server responded with a non-2xx status code
      const message = error.response.data.meta.error.errorMessage
        || 'Server responded with error.';
      console.error(message, '\n', error.response.data);
      return new CustomResponse(message, error.response.status);

    } else if (error.request) {
      // The request was made but no response was received
      const message = 'No response, try again.';
      console.error(message, '\n', error.request);
      return new CustomResponse(message, 503);

    } else {
      // Something happened in setting up the request that triggered an Error
      const message = 'Internal error.';
      console.error(error);
      return new CustomResponse(message, 500);
    }
  }
  // end of try-catch
}


export const config = { path: '/api/fetch-response' }
