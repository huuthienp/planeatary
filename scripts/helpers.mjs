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
export async function updateTaskStatus(preResponseId, taskData) {
    try {
        // showSpinner();  // to be called outside
        // const taskData = JSON.parse(localStorage.getItem('tasks'));  // to be called outside
        const mergedData = mergeTaskArrays(taskData);
        const requestBody = {
            id: preResponseId,
            chosen: mergedData.chosen,
            // done: mergedData.done,
            // time: mergedData.time,
        };
        const response = await fetch('/api/manage-tasks', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Q-RESPONSE-ID': preResponseId,
            },
            body: JSON.stringify(requestBody),
        });
        const { ok, status } = response;
        if (!ok) {
            throw new Error(JSON.stringify({
                status: status,  // fix error object
                response: await response.text(),
            }));
        }
        const responseBody = await response.json();
        console.log('Task updated successfully!\n', responseBody);
        // hideSpinner();  // to be called outside
    } catch (error) {
        // hideSpinner();  // to be called outside
        console.warn('Caught', error, '\nin updateTaskStatus');
    }
}


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
export async function fetchTaskStatus(preResponseId) {
    try {
        // showSpinner(); // put this outside
        const response = await fetch('/api/manage-tasks', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Q-RESPONSE-ID': preResponseId,
            }
        });
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


export async function confirmUser(identt, fragment) {  // not used
    if (fragment === null) {
        console.warn('Token is missing in attempt to confirm signup.');
        return null;
    }
    const token = fragment.value;
    try {
        const response = await identt.confirm(token, true);
        netlifyIdentity.open();
        return response;
    }
    catch(e) {
        console.error(e);
        netlifyIdentity.open();
        showFlashMessage('Email could not be confirmed.');
        return null;
    }
}


export function checkFragment(name) {
    let fragment = {};
    const _split = window.location.hash.substring(1).split('=');
    const exists = name === _split[0];
    if (exists) {
        fragment.name = name;
        fragment.value = _split[1] || '';
        return fragment;
    } else {
        return null;
    }
}


export function showFlashMessage(message) {  // not used
    const flashMessage = document.querySelector('div.modalContent div.flashMessage');
    if (flashMessage === null) {
        const container = document.createElement('div');
        const header = document.querySelector('div.modalContent div.header') || document.querySelector('body');
        container.classList.add('flashMessage', 'error');
        container.textContent = message;
        header.insertAdjacentHTML('afterEnd', container.outerHTML);
    } else {
        flashMessage.textContent = message;
    }
    return;
}
