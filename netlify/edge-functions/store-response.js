import { getStore } from '@netlify/blobs';
import { CustomResponse } from '../../classes/http.mjs'; // /classes/http.mjs

export default async (req) => {
  // Ensure the request method is POST
  const methodUpper = req.method;
  if (methodUpper !== 'POST') {
    const message = `Method not allowed: ${methodUpper}`;
    console.error(message)
    return new CustomResponse(message, 405);
  }

  // Check for authentication token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const message = 'Unauthorised.';
    console.error(message, '\n', req.headers);
    return new CustomResponse(message, 401);
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.QC_ID) {
    const message = 'Invalid access token.';
    console.error(message, '\n', token)
    return new CustomResponse(message, 403);
  }

  try {
    // Parse the JSON body from the request
    const data = await req.json();

    // Check for missing keys
    const EXPECTED_KEYS = ['quizType'];
    const missingKeys = EXPECTED_KEYS.filter(key => !(key in data));

    if (missingKeys.length > 0) {
      const message = `Missing keys in JSON: ${missingKeys.join(', ')}`;
      console.error(message, '\n', data);
      return new CustomResponse(message, 400);
    }

    // Extract quizType to get the store and the key
    const { PRE_QUIZ_ID, POST_QUIZ_ID } = process.env;
    const quizTypeLower = data['quizType'].toLowerCase();
    const asPreQuiz = quizTypeLower === 'pre';
    const asPostQuiz = quizTypeLower === 'post';

    if (!asPreQuiz && !asPostQuiz) {
      const message = `Invalid quizType: ${quizTypeLower}`;
      console.error(message, '\n', data);
      return new CustomResponse(message, 400);
    }

    const quizResponses = asPreQuiz ? getStore(PRE_QUIZ_ID) : getStore(POST_QUIZ_ID);

    const key = data['responseId'];

    // Store the data in Netlify Blobs
    await quizResponses.set(key, JSON.stringify(data));

    const message = `Success: ${key}`;
    console.log(message);
    return new CustomResponse(message, 200);

  } catch (error) {
    console.error(error)
    if (error instanceof SyntaxError && error.message.toUpperCase.includes('JSON')) {
      const message = 'Cannot parse JSON.';
      console.error(message, '\n', error);
      return new CustomResponse(message, 400);
    }
    const message = 'Internal error.';
    console.error(message, '\n', error);
    return new CustomResponse(message, 500);
  }
};

export const config = { path: '/api/store-response' };
