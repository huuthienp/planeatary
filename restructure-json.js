export function restructureDataFromQualtrics(data, type) {
  try {
    let restructuredData;

    const dataAsStr = typeof data === 'string';

    // Parse the JSON if it's a string
    const responseObject = dataAsStr ? JSON.parse(data) : data;

    if (type === 'response') {
      const result = data.result;

      restructuredData.responseId = result.responseId;

      restructuredData.recordedDate = result.recordedDate;

      // Array of the desired keys
      const orderedKeys = [
        'QID3', 'QID4', 'QID5',
        'QID6', 'QID7', 'QID8',
        'QID10', 'QID9', 'QID11',
        'QID13', 'QID12', 'QID14'];

      const pointArray = orderedKeys.map(key => result[key]);

      restructuredData.result = {
        totalScore: result.SC_4OW9P7VDYuDLVbw,
        pointArray: pointArray
      }

    } else {
      throw Error('Empty or invalid type:', `'${type}'`);
    }

    return restructuredData;

  } catch (error) {
    if (error instanceof SyntaxError && error.message.toLowerCase().includes('json')) {
      console.error('Cannot parse as JSON:', data);
    } else {
      console.error(error);
    }
  }
}
