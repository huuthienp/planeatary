// /listen-to-qualtrics.js

// Initialize a set to store allowed origins
const allowedOrigins = new Set();


// Function to add a new origin to the set
function addOrigin(origin) {
  allowedOrigins.add(origin);
  console.log("Updated allowed origins:", Array.from(allowedOrigins));
}


// Listen for messages from the iframe
window.addEventListener("message", (event) => {
  // Check if the received message is requesting the origin
  if (event.data === "getParentOrigin") {

    // Add the origin of the message sender to the allowed list
    addOrigin(event.origin);

    // Prepare the response with the origin information
    const response = {
      type: "originResponse",
      origin: window.location.origin
    };

    // Send the origin back to the iframe
    // Note: event.origin specifies the origin of the iframe
    event.source.postMessage(response, event.origin);

  } else if (allowedOrigins.has(event.origin)) {
    try {
      // Parse the JSON data from the event
      const data = JSON.parse(event.data); // error handled below

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
      if (error instanceof SyntaxError && error.message.toLowerCase().includes('json')) {
        console.error('Cannot parse as JSON:', event.data);
      } else {
        console.error('\n', error.message || error);
      }
    }
  } else {
    console.warn("Received message from unauthorized origin:", event.origin);
  }
});
