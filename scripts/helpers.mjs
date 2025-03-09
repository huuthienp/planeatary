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
        button.style.opacity = 0.4;
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
        const { ok, status } = response;
        if (ok) {
            return await response.json();  // error caught below
        } else {  // throw error
            const notOkError = new Error(await response.text());
            notOkError.name = 'ResponseNotOkError';
            notOkError.status = status;
            throw notOkError;  // error caught below
        }  // v1.1
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
    // const done = [];
    // const time = [];
    Object.values(data).forEach(question => {
        question['tasks'].forEach(task => {
            if (task.choice === 'chosen') {
                const completed = task.status === 'Completed';
                const finishTime = task.finishTime || ''; // in case undefined
                const suffix = (completed || finishTime) ? separator+finishTime : '';
                chosen.push(task.taskNumber + suffix);
            }
            // if (task.status === 'Completed') {
            // done.push(task.taskNumber);
            // }
            // time.push(task.finish);
        });
    });
    return {
        chosen: chosen,
        // done: done,
        // time: time
    };
}


// Function to get task status from the API
export async function fetchTaskStatus(preResponseId, userId) {
    try {
        // showSpinner(); // put this outside
        const fetchOpt = { method: 'GET',
            headers: new Headers(),
        };  /* end of defining fetch options */
        fetchOpt.headers.set('content-type', 'application/json');
        fetchOpt.headers.set('x-response-id', preResponseId);
        fetchOpt.headers.set('x-user-id', userId);
        const response = await fetch('/api/manage-tasks', fetchOpt);
        const { ok, status } = response;
        if (!ok) {
            throw new Error(JSON.stringify({
                status: status,  // fix error object
                response: await response.text(),
            }));
        }
        const data = extractTaskData(await response.json());
        console.log('Task status fetched!\n', data);
        // hideSpinner(); // put this outside
        return data;
    } catch (error) {
        // hideSpinner(); // put this outside
        console.warn('Caught', error, '\nin fetchTaskStatus');
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
    const chosen = [];
    const done = [];
    const time = [];
    responseBody.result.chosen.forEach( (merged_string) => {
        const _split = merged_string.split(separator);
        const isDone = merged_string.includes(separator);
        const finishTime = _split[1] || '';
        chosen.push(_split[0]);
        time.push(finishTime);
        if (isDone) {
            done.push(_split[0]);
        }
    });
    return {
        chosen: chosen,
        done: done,
        time: time,
    }
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
