exports.handler = async function (event, context) {
    try {  // try verifying token and processing request to admin
        const { body: eventBody, headers: { authorization: eventAuth, user_id }, httpMethod } = event;
        const { identity, user } = context.clientContext;
        const { ADMIN_UUID, SECRET_AUTH_HEADER } = process.env;
        const hasAuth = SECRET_AUTH_HEADER === eventAuth;
        const iamAdmin = user && ADMIN_UUID === user.sub;
        const danger = 'DELETE' === httpMethod.toUpperCase() || hasDanger(JSON.parse(eventBody));
        const authDanger = danger && iamAdmin;
        const authNormal = !danger && (hasAuth || iamAdmin);
        let headers = {};
        if (authDanger || authNormal) {
            const response = await fetch(`${identity.url}/admin/users/${user_id || undefined}`/* prevent getting all users */, {
                method: httpMethod,
                headers: { Authorization: `Bearer ${identity.token}` },
                body: JSON.stringify(eventBody ? JSON.parse(eventBody) : undefined),
            });  // support GET, PUT, POST, DELETE a user
            const { ok, status: statusCode } = response;
            const __log = ok ? console.log : console.error;
            __log(httpMethod, danger?'DANGER':'NORMAL', statusCode);
            const body = await response.text();
            headers = addContentType(body, headers);
            return ({ body, headers, statusCode });
        } else {  // auth fails
            const statusCode = 401, statusText = 'Unauthorized';
            const body = JSON.stringify({ code: statusCode, msg: statusText });  // imitate netlify identity endpoints
            headers = addContentType(body, headers);
            console.error(httpMethod, danger?'DANGER':'NORMAL', statusCode);
            return ({ body, headers, statusCode, statusText });  // skip request to admin
        }
    } catch(internalError) {
        console.error(internalError);
        internalError.statusCode ??= 500;  // nullish coalescing operator (??) since ES11 (2020)
        return internalError;
    }  // end of function when internal error occurs
};


function hasDanger(obj, safeString='metadata') {
    for (const key of Object.keys(obj)) {
        if (!key.includes(safeString)) { return true; }
    }  // return true if any key lacks safe string in its name
    return false;
}


function addContentType(body, headers) {
    try {  // parse body as JSON and add proper content type
        JSON.parse(body);
        return { ...headers, 'Content-Type': 'application/json' };
    } catch(parseError) { return headers; }
}
