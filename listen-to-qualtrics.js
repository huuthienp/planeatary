window.addEventListener("message", (event) => {
  if (event.origin == "https://uow.au1.qualtrics.com") {
    try {
      // Parse the JSON data from the event
      const data = JSON.parse(event.data);

      // Check if quizType exists in data
      if (!data.hasOwnProperty('quizType')) {
        throw new Error('quizType is missing from the data.');
      }

      const { quizType } = data;

      // Function to process the value before storage
      function processValue(value) {
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      }

      // Function to capitalize the first letter of a string
      function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }

      // Iterate over each key-value pair in the parsed data
      for (const [key, value] of Object.entries(data)) {
        try {
          // Capitalize the first letter of the key
          const capitalizedKey = capitalizeFirstLetter(key);
          // Process the value and store in localStorage
          const processedValue = processValue(value);
          localStorage.setItem(`${quizType}${capitalizedKey}`, processedValue);

        } catch (storageError) {
          console.error(`Failed to store ${key}.`, '\n', storageError);
          // Optionally, handle specific storage errors (e.g., QuotaExceededError)
        }
      }
    } catch (error) {
      console.error('\n', error.message || error);
      // Optionally, handle the parsing error (e.g., log it, show user feedback)
    }
  }
});
