// https://docs.netlify.com/functions/functions-and-identity/#trigger-functions-on-identity-events
export async function handler(event) {
    const { user } = JSON.parse(event.body);  // can modify user data
    user.app_metadata.last_login_at = (new Date()).toISOString();
    const body = JSON.stringify(user);
    let statusCode = 200;  // can block event with non-2xx status
    return ({ body, statusCode });
}  // end of login-event function
