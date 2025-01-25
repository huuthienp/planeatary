// /listen-to-qualtrics.mjs
import { storeResponse } from './helpers.mjs';
// Initialize a set to store allowed origins
const allowedOrigins = new Set();


// Function to add a new origin to the set
function addOrigin(origin) {
    allowedOrigins.add(origin);
    console.log('Updated allowed origins:', Array.from(allowedOrigins));
}


// Listen for messages from the iframe
window.addEventListener('message', (event) => {
    // Check if the received message is requesting the origin
    if (event.data === 'getParentOrigin') {
        // Add the origin of the message sender to the allowed list
        addOrigin(event.origin);
        // Prepare the response with the origin information
        const response = {
            type: 'originResponse',
            origin: window.location.origin
        };
        // Send the origin back to the iframe
        // Note: event.origin specifies the origin of the iframe
        event.source.postMessage(response, event.origin);
    } else if (allowedOrigins.has(event.origin)) {
        try {
            // Parse the JSON data from the event
            const data = JSON.parse(event.data); // error handled below
            console.log(`Parsed message from ${event.origin}!\n`, data);
            storeResponse(data);
        } catch (error) {
            console.warn('Caught', error, `\nfrom ${event.origin}!\n${event.data}`);
        }
    } else {
        console.warn(`Received message from ${event.origin}!\n${event.data}`)
    }
});
