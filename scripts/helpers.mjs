export class LocalStorageService {
    setItem(key, value) {
        const oldValue = localStorage.getItem(key);
        localStorage.setItem(key, value);
        this.notifyChange(key, oldValue, value);
    }
    removeItem(key) {
        const oldValue = localStorage.getItem(key);
        localStorage.removeItem(key);
        this.notifyChange(key, oldValue, '<removed>');
    }
    notifyChange(key, oldValue, newValue) {
        const event = new CustomEvent('localStorageChange', { detail: { key, oldValue, newValue } });
        window.dispatchEvent(event);
    }
}


export function initiateSurvey(quizType, quizFrame) {
    const qDataCtId = 'uow.syd1';
    const qSurveyId = quizType === 'pre' ? 'SV_8es3au3sYKpwaii' : quizType === 'post' ? 'SV_5njEnh46h0tSueG' : undefined;
    let quizUrl = `https://${qDataCtId}.qualtrics.com/jfe/form/${qSurveyId}`;
    try {
        quizUrl += `?userId=${JSON.parse(localStorage['gotrue.user']).id || ''}`;  // contains sensitive info
    } catch(nonUserError) {
        console.warn(`Caught ${nonUserError}'\nYou are not logged in!`);
    }
    if (quizType === 'post') {
        try {
            quizUrl += `&preResponseId=${JSON.parse(localStorage['preResult']).responseId || ''}`;
        } catch(noPreResultError) {
            console.warn(`Caught ${noPreResultError}\nPre-quiz result is not found!`);
        }
    }
    quizFrame.contentWindow.location = quizUrl;  // load quiz frame, safer than src
    return quizUrl;
}


export function updateAnchors(anchors, hrefs=[]) {
    for (const [i, a] of Object.entries(anchors)) {
        const h = hrefs[i];
        if (h) {
            a.removeAttribute('Disabled');
            a.href = h;
            a.style.cursor = 'pointer';
        } else {
            a.removeAttribute('href');
            a.disabled = true;
            a.style.cursor = 'not-allowed';
        }
    }
}


export function updateButton(button, color='buttonface', cursor='default') {
    button.style.backgroundColor = color;
    button.style.borderColor = color;
    button.style.cursor = cursor;
    if (cursor == "not-allowed") {
        button.style.color = 'rgb(9, 59, 48)';
        button.style.boxShadow = 'none';
        button.style.opacity = 0.7;
        button.style.pointerEvents = "none";
    } else {
        button.style.color = 'white';
        button.style.boxShadow = '0 .125rem .25rem rgba(0, 0, 0, .075)';
        button.style.opacity = 1;
        button.style.pointerEvents = "auto";
    }
    
}


export async function fetchData(url, options) {
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            return await response.json();  // parsing-error be caught below
        } else {  // formulate and throw error
            const code = response.status;
            const msg = await response.text();
            const notOkErr = new Error(JSON.stringify({ code, msg }));
            notOkErr.name = 'FetchNotOkError';
            throw notOkErr;  // thrown error be caught below
        }  // v1.2
    } catch(fetchError) {
        throw fetchError;
    }
}


export async function fetchResponse(responseId, quizType, env) {
    const { PRE_QUIZ_ID, POST_QUIZ_ID } = env;
    const surveyId = (quizType === 'pre') ? PRE_QUIZ_ID : POST_QUIZ_ID;
    const { QDC_ID, Q_API_TOKEN } = env;
    const url = `https://${QDC_ID}.qualtrics.com/API/v3/surveys/${surveyId}/responses/${responseId}`;
    const options = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-API-TOKEN': Q_API_TOKEN,
        },
    };
    return await fetchData(url, options);
}


export function reformatResponseData(data) {
    try {
        const { result: { responseId, values } } = data;
        const orderedQIDs = [  // true order of questions
            'QID3', 'QID4', 'QID5',     // 1, 2, 3
            'QID6', 'QID7', 'QID8',     // 4, 5, 6
            'QID10', 'QID9', 'QID11',   // 7, 8, 9
            'QID13', 'QID12', 'QID14',  // 10, 11, 12
        ];  // QIDs are generated in the order of creation
        return {
            responseId: responseId,
            quizType: values.quizType,
            recordedDate: values.recordedDate,
            result: {
                totalScore: values.SC_4OW9P7VDYuDLVbw,
                pointArray: orderedQIDs.map(id => values[id] || 0),
            },
        };
    } catch (error) {
        console.warn('Caught', error, '\n', data);
    }
}


export function storeResponseData(reformattedData) {
    try {  // store response data locally as 'preResult' or 'postResult'
        const { quizType } = reformattedData;
        const storageService = new LocalStorageService();  // trigger 'localStorageChange' event
        storageService.setItem(quizType + 'Result', JSON.stringify(reformattedData));
    } catch (anyError) {  // e.g. storage error
        console.warn(`Caught ${anyError}\nwhile trying to store\n${reformattedData}`);
    }
}


// Function to update task status using the API
export async function updateTaskStatus(preResponseId, userId, taskData) {
    try {
        const mergedData = mergeTaskArrays(taskData);
        const requestBody = {
            id: preResponseId,
            chosen: mergedData.chosen,
        };
        const fetchOpt = { method: 'PUT',
            body: JSON.stringify(requestBody),  // unchanged, while fetch options are rewritten
            headers: new Headers(),
        };  /* end of defining fetch options */
        fetchOpt.headers.set('content-type', 'application/json');
        fetchOpt.headers.set('x-response-id', preResponseId);
        fetchOpt.headers.set('x-user-id', userId);
        const udTaskResp = await fetch('/api/manage-tasks', fetchOpt);
        if (!udTaskResp.ok) {
            const code =  udTaskResp.status;
            const msg = await udTaskResp.text();
            const udTaskErr = new Error();
            udTaskErr.message = JSON.stringify({ code, msg });
            udTaskErr.name = 'UpdateTaskError';
            throw udTaskErr;
        }  /* end of checking if updating task is ok */
        const responseBody = await udTaskResp.json();
        console.log('Tasks updated!\n', responseBody);
    } catch (udTaskErr) {
        console.warn('Caught', udTaskErr, '\nin updateTaskStatus');
    }  /* end of catching task-updating error */
}  /* end of updateTaskStatus */


export function mergeTaskArrays(data, separator = '@') {
    /**
 * @param {Object} data - The input data object.
 * @returns {Object} An object containing an array named chosen.
 *
 * Expected structure of data:
 * {
 *   '1': {
 *     tasks: [
 *       {
 *         taskNumber: string,
 *         choice: string,
 *         status: string,
 *         finishTime: string,
 *       },
 *       // ... more tasks
 *     ]
 *   },
 *   '2': {
 *     // Similar structure as '1'
 *   },
 *   // ... more numbered keys
 * }
 */
    const chosen = [];
    for (const qNumber of Object.keys(data)) {
        for (const task of data[qNumber].tasks) {
            if ('chosen' === task.choice) {
                const { taskNumber, finishTime } = task;
                if (!isEmpty(finishTime)) {
                    chosen.push([taskNumber, finishTime].join(separator));
                } else { chosen.push(taskNumber); }
            }  /* end of checking if task is chosen */
        }  /* end of looping through tasks per question */
    }  /* end of looping through questions */
    return { chosen };
}  /* end of mergeTaskArrays */


// Function to get task status from the API
export async function fetchTaskStatus(preResponseId, userId, { origin = '', pathname = '/api/manage-tasks' } = {}) {
    try {
        let url = pathname;
        if (!isEmpty(origin)) {  // define origin if called outside browser
            url = new URL(origin);
            url.pathname = pathname;
        }  // if origin is not empty, it is used to construct url

        const opt = { method: 'GET', headers: new Headers() };
        opt.headers.set('content-type', 'application/json');
        opt.headers.set('x-response-id', preResponseId);
        opt.headers.set('x-user-id', userId);
        const data = await fetchData(url, opt); // error be caught
        console.log('Tasks fetched!', preResponseId);
        return extractTaskData(data);
    } catch (fetchTaskErr) {
        console.warn('Caught:\n', fetchTaskErr);
        return null;
    }
}


export function extractTaskData(responseBody, separator='@') {
    /* 
     * Example of response body
     * {                                                        
     *   "result": {                                            
     *     "id": "example-id",                           
     *     "chosen": [                                          
     *       "t0101@1728420121",                                
     *       "t0102",                                           
     *       "t0103",                                           
     *       "t0302@1728423461",                                
     *       "t0303@1728422505"                                 
     *     ]                                                    
     *   },                                                     
     *   "meta": {                                              
     *     "requestId": "example-id", 
     *     "httpStatus": "200 - OK"                             
     *   }                                                      
     * }
     * @returns {Object} An object containing arrays: chosen, done, and time.
     */
    const chosen = [], done = [], pending = [], time = [];
    for (const mergedString of responseBody.result?.chosen ?? []) {
        // if "chosen" is undefined, fall back to empty array so empty arrays are returned
        const [ taskNumber, finishTime ] = mergedString.split(separator);
        chosen.push(taskNumber);
        if (!isEmpty(finishTime)) {
            time.push(finishTime);
            done.push(taskNumber);
        } else {  // task string has empty finish time or none
            time.push(null);
            pending.push(taskNumber);
        }  /* end of checking task is done or not */
    }  /* end of looping through task data fetched from Qualtrics */
    return { chosen, done, pending, time };
}

export async function fetchResponses(userId) {
    try {
        const response = await fetch('/api/fetch-responses', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Q-RESPONSE-ID': userId,
            }
        });
        const { ok, status } = response;
        if (!ok) {
            throw new Error(JSON.stringify({
                status: status,  
                response: await response.text(),
            }));
        }
        const data = await response.json();
        console.log('Responses fetched!\n', data);
        localStorage.setItem(`${userId}:allResponses`, JSON.stringify(data));
        return data;
        
    } catch (error) {
        console.warn('Caught', error, '\nin fetchResponse');
        return null;
    }
}


export async function getStrongBlob(siteUrl, authHd, storeId, userId) {
    const strongBlobUrl = siteUrl + '/api/get-strong-blob';
    const opt = { headers: new Headers(), method: 'GET' };
    opt.headers.set('authorization', authHd);
    opt.headers.set('netlify-store-id', storeId);
    opt.headers.set('netlify-blob-key', userId);
    return await fetchData(strongBlobUrl, opt);  // may return null
}  /* end of getStrongBlob v1.1 */


export async function fetchUserData(userId, identity) {
    const url = `${identity.url}/admin/users/${userId}`;
    const opt = { headers: new Headers(), method: 'GET' };
    opt.headers.set('authorization', `Bearer ${identity.token}`);
    return await fetchData(url, opt);
}  /* end of fetchUserData v1.0 */


export function isEmpty(x) {
    if (typeof x === 'string') return x.trim() === '';
    if (typeof x === 'object') return x === null || Object.keys(x).length === 0;
    return !x;
};  /* end of isEmpty v1.0 */
