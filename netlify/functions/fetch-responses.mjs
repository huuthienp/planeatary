import axios from 'axios';
import { CustomResponse } from '../../classes/http.mjs';


export default async (req) => {
  try {
    // Extract quizType from query parameters
    const url = new URL(req.url.toLowerCase());
    const quizType = url.searchParams.get('quiztype');
    const quizTypeLower = quizType.toLowerCase();
    // Determine the survey ID based on quiz type
    const { ID_HEADER, PRE_QUIZ_ID, POST_QUIZ_ID } = process.env;
    const surveyId = (quizTypeLower === 'pre') ? PRE_QUIZ_ID : POST_QUIZ_ID;
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
}


export const config = { path: '/api/fetch-response-aws' }
