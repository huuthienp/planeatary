import axios from 'axios';
import { getStore } from '@netlify/blobs';
import { CustomResponse } from '../../classes/http.mjs';


export default async (req) => {
  try {
    // Ensure the request method is POST
    const methodUpper = req.method.toUpperCase();
    if (methodUpper !== 'GET' && methodUpper !== 'PUT') {
      const message = `Method not allowed: ${methodUpper}.`;
      console.error(message);
      return new CustomResponse(message, 405);
    }

    // Check if id exists in Netlify Blobs
    const { ID_HEADER, PRE_QUIZ_ID } = process.env;
    const id = req.headers.get(ID_HEADER);

    if (!id) {
      const message = 'Unauthorized.';
      console.error(message, '\n', req.headers);
      return new CustomResponse(message, 401);
    }

    // Search Netlify Blobs for ID
    const preQuizResponses = getStore(PRE_QUIZ_ID);

    const entry = await preQuizResponses.get(id, { consistency: 'strong' });

    if (entry === null) {
      const message = 'Invalid ID.';
      console.error(message, id);
      return new CustomResponse(message, 403);
    }

    // Prepare API request to Qualtrics
    const { QDC_ID, Q_API_TOKEN, TASKS_IDP_ID } = process.env;

    const qUrl = `https://${QDC_ID}.qualtrics.com/API/v3/imported-data-projects/${TASKS_IDP_ID}/records/${id}`

    let options = {
      method: methodUpper,
      url: qUrl,
      headers: {
        Accept: 'application/json',
        'X-API-TOKEN': Q_API_TOKEN
      },
    };

    if (methodUpper === 'PUT') {
      const parsedBody = await req.json(); // error handled below

      const { taskData } = parsedBody;
      
      if (!taskData) {
        const message = 'taskData is empty/missing in body of request.';
        console.error(message, parsedBody);
        return new CustomResponse(message, 400);
      }

      options.headers['Content-Type'] = 'application/json';
      options.params = {nonDestructive: 'true'};
      options.data = taskData;
    }

    // Make API request to Qualtrics
    const { data } = await axios.request(options);
    // axios throws error when status code is not 2xx

    // Return successful response
    console.log('Some user tasks are managed.', methodUpper);
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

    } else if (error instanceof SyntaxError &&
      error.message.toLowerCase().includes('json')) {
      // Handle error from req.json()
      const strBody = await req.text();
      const message = strBody.length > 0 ? `Payload is not valid JSON.`
        : 'Nothing inside request.';
      console.error(message, '\n', strBody);
      return new CustomResponse(message, 400);

    } else {
      // Something happened in setting up the request that triggered an Error
      const message = 'Internal error.';
      console.error(error);
      return new CustomResponse(message, 500);
    }
  }
  // end of try-catch
}


export const config = { path: '/api/manage-tasks' }
