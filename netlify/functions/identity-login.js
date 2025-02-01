// https://docs.netlify.com/functions/functions-and-identity/#trigger-functions-on-identity-events
export async function handler(event) {
    const body = event.body.user;  // can modify user data
    let statusCode = 200;  // can block event with non-2xx status
    return ({ body, statusCode });
}  // end of login-event function
