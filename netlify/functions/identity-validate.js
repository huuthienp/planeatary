import { isDisposableEmail } from 'disposable-email-domains-js';

const requiredMtdtKeys = JSON.parse(process.env.REQUIRED_USER_METADATA_KEYS);

// function handler (must be lambda-compatible)
export async function handler(event) {  // v3
    const response = {};
    const payload = JSON.parse(event.body);
    payload.errors = [];
    // https://docs.netlify.com/functions/functions-and-identity/#trigger-functions-on-identity-events
    // check for disposable domain and required user metadata
    const { email, user_metadata } = payload.user;
    if (isDisposableEmail(email)) payload.errors.push('\'' + email + '\' may be disposable');
    const missingMtdt = checkKeys(user_metadata ?? {});
    if (0 < missingMtdt.length) payload.errors.push('missing: ' + missingMtdt.join(','));
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
}  // function handler v3


function checkKeys(dataObject, keys = requiredMtdtKeys) {
    return keys.filter(key => !Object.hasOwn(dataObject, key));
}  // checkKeys v1.1
