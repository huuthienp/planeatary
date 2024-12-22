export function reformatQualtricsData(data, type) {
  try {
    let reformatted = {};

    if (type === 'response') {
      reformatted.quizType = data['quizType'];
      reformatted.responseId = data['result']['responseId'];

      const values = data['result']['values'];

      reformatted.recordedDate = values['recordedDate'];

      // Array of the desired keys
      const orderedKeys = [
        'QID3', 'QID4', 'QID5',
        'QID6', 'QID7', 'QID8',
        'QID10', 'QID9', 'QID11',
        'QID13', 'QID12', 'QID14'];

      const pointArray = orderedKeys.map(key => values[key] || 0);

      reformatted.result = {
        totalScore: values['SC_4OW9P7VDYuDLVbw'],
        pointArray: pointArray
      }

    } else {
      throw Error(`Empty or invalid data type: ${type}`);
    }

    return reformatted;

  } catch (error) {
    if (error instanceof SyntaxError && error.message.toLowerCase().includes('json')) {
      console.error('Cannot parse as JSON:', data);
    } else {
      console.error(error);
    }
  }
}


export function saveLocalStorage(data, type) {

  // Iterate over each key-value pair in the parsed data
  for (const [key, value] of Object.entries(data)) {
    if (type === 'response') {
      const { quizType } = data;
      try {
        // Capitalize the first letter of the key
        const titleCaseKey = key.charAt(0).toUpperCase() + key.slice(1);

        // Process the value and store in localStorage
        const valueAsStr = typeof value === 'string';
        const strValue = valueAsStr ? value : JSON.stringify(value);

        localStorage.setItem(`${quizType}${titleCaseKey}`, strValue);

      } catch (storageError) {
        console.error(`Cannot store ${key} as ${value}.`, '\n', storageError);
        continue;
      }
    }
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
        const data = extractTaskData(await response.json());
        console.log('Task status fetched:', data);
        // hideSpinner(); // put this outside
        return data;
    } catch (error) {
        // hideSpinner(); // put this outside
        console.error('Error fetching task status:', error);
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
