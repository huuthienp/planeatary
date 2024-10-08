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
