import type { Config } from '@netlify/edge-functions';
import type { ImportedTaskData, QTaskPayload } from '../../scripts/custom-data.ts';
import { isImportedTaskData } from '../../scripts/custom-data.ts';
import { fetchData } from '../../scripts/helpers.mjs';
import { respIdWholeRegex, userIdWholeRegex } from '../../scripts/regex.js';
import { formulateErrorResponse } from '../../scripts/custom-http.ts';

const { env } = Netlify;
const endpoint = new URL(`https://${env.get('QDC_ID')}.qualtrics.com`);


export default async (request: Request) => {
    try {  // validate user request and fetch task data from Qualtrics
        /* declare some variables */
        let respBody: QTaskPayload;
        /* check for required metadata */
        const badReqErrors: Array<string> = [];
        const isPostPut = ['POST', 'PUT'].includes(request.method.toUpperCase());
        const reqBody: ImportedTaskData = isPostPut ? await request.json() : null;  // error be caught below
        if (isPostPut && !isImportedTaskData(reqBody)) { badReqErrors.push('payload is invalid'); }
        const respId: string = reqBody?.id ?? request.headers.get('x-response-id') ?? 'missing response ID';
        const userId: string = reqBody?.userId ?? request.headers.get('x-user-id') ?? 'missing user ID';
        if (!respIdWholeRegex.test(respId)) { badReqErrors.push(respId + ' is invalid'); }
        if (!userIdWholeRegex.test(userId)) { badReqErrors.push(userId + ' is invalid'); }
        if (badReqErrors.length > 0) {
            const code = 400;
            const msg = `Bad request: [${badReqErrors.join(', ')}]`;
            console.error(msg);
            return Response.json({ code, msg }, { status: code });
        }  /* end of checking metadata */
        /* send GET request to Qualtrics */
        endpoint.pathname = `/API/v3/imported-data-projects/${env.get('TASKS_IDP_ID')}/records/${respId}`;
        const fetchOpt: RequestInit = { method: 'GET' };
        fetchOpt.headers = new Headers();
        fetchOpt.headers.set('accept', 'application/json');
        fetchOpt.headers.set('x-api-token', env.get('Q_API_TOKEN') ?? '');
        respBody = await fetchData(endpoint, fetchOpt) as QTaskPayload;  // may throw response-not-ok error
        /** qualtrics response example:
         * { meta: { httpStatus:'', requestId:'', notice:'' },
         * result: { id:'', userId:'', chosen:[] } } */
        /* match user ID in fetched task data with provided user ID */
        if (userId === respBody.result.userId) {
            console.log(userId.substring(9, 18), 'Authorised!');
        } else {  // quiz response does not match user
            const code = 401;
            const msg = 'Quiz response does not match user!';
            console.warn(msg, respId);
            return Response.json({ code, msg }, { status: code });
        } /* end of matching user ID */
        /** shallow copy:
         * top-level properties are duplicated,
         * but nested objects still share references */
        if (isPostPut) { /* send PUT request to Qualtrics */
            endpoint.searchParams.append('nonDestructive', 'true');
            fetchOpt.body = JSON.stringify(reqBody);
            fetchOpt.headers.set('content-type', 'application/json');
            fetchOpt.method = 'PUT';
            respBody.meta = (await fetchData(endpoint, fetchOpt) as QTaskPayload).meta;
            respBody.result.chosen = reqBody.chosen;
        }  /* end of updating task data v3.1 */
        requestReminder({ ...respBody.result, userId }, new URL(request.url).origin);
        console.log(request.method, respId.substring(2, 8));
        return Response.json(respBody); // default status is 200
    } catch (manaTaskErr) {  // e.g. response from Qualtrics not ok
        console.error('Caught:\n', manaTaskErr);
        return formulateErrorResponse(manaTaskErr);
    }  /* end of catching error when managing task */
};  /* end of function handler */


export const config: Config = {
    method: ['GET', 'PUT', 'POST'],  // POST for navigator.sendBeacon
    path: '/api/manage-tasks',
};  /* end of config */


function requestReminder(data: ImportedTaskData, origin: string): void {  // fire and forget
    const endpoint: string = origin + '/api/set-reminders';
    const fetchOpt: RequestInit = { method: 'POST' };
    fetchOpt.body = JSON.stringify(data);
    fetchOpt.headers = new Headers();
    fetchOpt.headers.set('authorization', env.get('SECRET_AUTH_HEADER') ?? '');
    fetchOpt.headers.set('content-type', 'application/json');
    fetch(endpoint, fetchOpt).catch(err => console.error('Caught:\n', err));
}  /* end of requestReminder */
