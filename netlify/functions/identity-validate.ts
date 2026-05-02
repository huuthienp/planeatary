import type { Handler, HandlerEvent } from "@netlify/functions";
import { isDisposableEmail } from 'disposable-email-domains-js';

const requiredMtdtKeys = ['status'];

// function handler (must be lambda-compatible)
export async function handler(event: HandlerEvent): Handler {  // v3
    const response = {};
    const payload = JSON.parse(event.body);
    payload.errors = [];
    // https://docs.netlify.com/functions/functions-and-identity/#trigger-functions-on-identity-events
    // check for disposable domain and required user metadata
    if (isDisposableEmail(payload.user.email)) payload.errors.push('Email may be disposable!');
    const missingMtdt = checkKeys(payload.user.user_metadata ?? {});
    if (0 < missingMtdt.length) payload.errors.push('Missing: ' + missingMtdt.join(', '));
    const approved = 0 === payload.errors.length;
    if (approved) {  // approve sign-up
        response.body = JSON.stringify(payload.user);
        response.statusCode = 200;
        console.log(payload.event, 'Approved!');
    } else {  // reject sign-up
        const code = 400;  // non-2xx rejects sign-up
        const msg = payload.errors;
        response.body = JSON.stringify({ code, msg });
        response.statusCode = code;
        console.error(payload.event, 'Rejected:', payload.errors.join('; '));
    }  // payload is checked and response is created
    return response;
}  // end of handler v3


function checkKeys(dataObject, keys = requiredMtdtKeys) {
    return keys.filter(key => !Object.hasOwn(dataObject, key));
}  // checkKeys v1.1
