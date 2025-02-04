import { CustomResponse } from '../../scripts/custom-classes.mjs';
import { fetchData, fetchResponse, reformatResponseData } from '../../scripts/helpers.mjs';


export default async (request, context) => {
    const query = {};
    const { env } = process;
    const data = [];  // an array of fetched responses grouped by cycle and quiz type
    query.length = 0;
    query.lengthOk = 0;
    try {  // authenticate request by token and fetch all responses
        const requestUrl = new URL(request.url.toLowerCase());
        query.requestedTypes = requestUrl.searchParams.get('quiztype') || ['pre', 'post'];
        const targetUrl = context.site.url + '/.netlify/identity/user';
        const nf_jwt = context.cookies.get('nf_jwt');
        const authHeader = nf_jwt ? `Bearer ${nf_jwt}` : request.headers.get('Authorization');
        if (!authHeader) {  // when neither nf_jwt cookie nor auth header can be found
            return new CustomResponse('Unauthorised!', 401);
        }  // else, send token for verification
        const { id, user_metadata: { responseHistory } } = await fetchData(targetUrl, {
            method: 'GET',
            headers: { Authorization: authHeader },
        });  // get id of user and their response history
        console.log(`${id} authorised for fetching responses!`);
        for (let cycle of responseHistory) {
            const { preId, postId } = cycle;
            const preResponse = await tryDecideFetchResponse(query, 'pre', preId, env);
            const postResponse = await tryDecideFetchResponse(query, 'post', postId, env);
            data.push(({ preResponse, postResponse }));
        }  // end of fetching all cycles
        console.log('Fetching is done!', query.lengthOk, '/', query.length);
        return new CustomResponse(data, query.lengthOk === query.length ? 200 : query.lengthOk === 0 ? 404 : 207);
    } catch(breakError) {  // e.g. invalid token
        console.warn('Caught', breakError);
        const { message, stack, status } = breakError;
        return new CustomResponse(stack || message, status || 500);
    }  // end of catching breaking error, which interrupts fetching
};


export const config = { method: 'GET', path: '/api/fetch-responses' };


async function tryDecideFetchResponse(query, quizType, responseId, env) {
    try {  // decide whether to fetch a quiz response
        if (query.requestedTypes.includes(quizType) && responseId) {
            query.length += 1;
            const fetchedResponse = reformatResponseData(await fetchResponse(responseId, quizType, env));
            query.lengthOk += 1;
            console.log(responseId, 'is fetched!');
            return fetchedResponse;
        } else {  // when the request specifies just either 'pre' or 'post'
            return null;  // skip fetching
        }  //  or when response ID is not found in history (user has not done post-quiz)
    } catch (fetchError) {  // not breaking, moving on to next quiz type or cycle
        console.warn('Caught', fetchError);
        return ({ fetchError });
    }  // end of try deciding to fetch a response
}
