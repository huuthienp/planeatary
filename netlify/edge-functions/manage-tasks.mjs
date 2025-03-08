import { fetchData } from '../../scripts/helpers.mjs';

const { env } = Netlify;
const url = new URL(`https://${env.get('QDC_ID')}.qualtrics.com`);
const respIdRegex = /^R_[a-zA-Z0-9]{15}$/;
const userIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


export default async (request) => {
    try {  // validate user request and fetch task data from Qualtrics
        /* check for required metadata */
        const isPostPutMethod = ['POST', 'PUT'].includes(request.method.toUpperCase());
        const reqJSON = isPostPutMethod ? await request.json() : null;  // error caught below if any
        let respId = request.headers.get('x-response-id') ?? reqJSON.id;
        let userId = request.headers.get('x-user-id') ?? reqJSON.userId;
        const badMtdt = [];
        if (!respIdRegex.test(respId)) { badMtdt.push(respId?respId:'missing response id'); }
        if (!userIdRegex.test(userId)) { badMtdt.push(userId?userId:'missing user id'); }
        if (badMtdt.length > 0) {
            const msg = `Bad request: ${badMtdt.join(', ')}`;
            console.error('[manage-tasks]', msg);
            return new Response(msg, { status: 400 });
        }  /* end of checking headers */
        /* send GET request to Qualtrics */
        url.pathname = `/API/v3/imported-data-projects/${env.get('TASKS_IDP_ID')}/records/${respId}`;
        const fetchOpt = { method: 'GET', headers: new Headers() };
        fetchOpt.headers.set('accept', 'application/json');
        fetchOpt.headers.set('x-api-token', env.get('Q_API_TOKEN'));
        let qResponse = await fetchData(url, fetchOpt);
        if (userId === qResponse.result.userId) {
            console.log(userId, 'authoriesd to manage tasks!');
        } else {  // quiz response does not match user
            const msg = 'Quiz response does not match user!';
            console.warn('[manage-tasks]', msg, respId);
            return new Response(msg, { status: 401 });
        } /* end of matching user ID */
        if (isPostPutMethod) {
            /* send PUT request to Qualtrics */
            validateTaskData(reqJSON);  // error caught below if any
            url.searchParams.append('nonDestructive', true);
            fetchOpt.method = 'PUT';
            fetchOpt.headers.set('content-type', 'application/json');
            fetchOpt.body = JSON.stringify(reqJSON);
            qResponse = await fetchData(url, fetchOpt);
        }  /* end of updating task data */
        console.log('[manage-tasks]', request.method, respId);
        return Response.json(qResponse); // default status is 200
    } catch (manaTaskErr) {  // e.g. invalid task data, response not ok
        console.error('[manage-tasks]', 'Caught:', manaTaskErr);
        return new Response(manaTaskErr.message, { status: manaTaskErr.status ?? 500 });
    }  /* end of catching error when managing task */
};  /* end of function handler */


export const config = {
    method: ['GET', 'PUT', 'POST'],  // POST for navigator.sendBeacon
    path: '/api/manage-tasks',
};  /* end of config */


function validateTaskData(data, requiredKeys = ['chosen']) {
    const missingKeys = requiredKeys.filter(key => !Object.hasOwn(data, key));
    if (missingKeys.length == 0) {
        return true;
    } else {  // throw invalid task data error
        const dataError = new Error(`Task data is missing: ${missingKeys.join(', ')}`);
        dataError.name = 'InvalidTaskDataError';
        dataError.status = 400;
        throw dataError;
    }  // interrupt fetching
}  // end of validateTaskData
