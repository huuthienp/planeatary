import { CustomResponse } from '../../scripts/custom-classes.mjs';
import { fetchData } from '../../scripts/helpers.mjs';


export default async (request) => {
    try {  // validate user request and fetch task data from Qualtrics
        const { headers: reqHeaders, method: reqMethod } = request;
        const id = reqHeaders.get('q-response-id');
        const userId = reqHeaders.get('user-id');
        if (!id || !userId) {
            const message = `Bad headers: ${id?id:'empty q-response-id'}, ${userId?userId:'empty user-id'}`;
            console.error(message);
            return new CustomResponse(message, 400);
        }
        const { env } = Netlify;  // follow Netlify's documentation
        const method = 'GET';
        const url = new URL(`https://${env.get('QDC_ID')}.qualtrics.com`);
        const headers = new Headers();
        url.pathname = `/API/v3/imported-data-projects/${env.get('TASKS_IDP_ID')}/records/${id}`;
        headers.set('accept', 'application/json');
        headers.set('x-api-token', env.get('Q_API_TOKEN'));
        const options = ({ method, headers });
        let qResponse = await fetchData(url, options);
        if (userId !== qResponse.result.userId) {
            const message = 'User ID does not match!';
            console.warn(message);
            return new CustomResponse(message, 401);
        } // end of matching user ID
        if ('PUT' === reqMethod.toUpperCase()) {
            const reqJSON = await request.json();  // error caught below
            validateTaskData(reqJSON);  // error caught below
            url.searchParams.append('nonDestructive', true);
            options.method = reqMethod;
            options.headers.set('content-type', 'application/json');
            options.body = JSON.stringify(reqJSON);
            qResponse = await fetchData(url, options);
        }  // end of updating task data
        console.log(reqMethod, id);
        return new CustomResponse(qResponse); // default status is 200
    } catch (manageTaskError) {  // e.g. invalid task data, response not ok
        console.error('Caught:', manageTaskError);
        const { message, status } = manageTaskError;
        return new CustomResponse(message, status || 500);
    }  // end of catching error when managing task
};


export const config = { method: ['GET', 'PUT'], path: '/api/manage-tasks' };


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
