exports.handler = async function (event, context) {
    try {  // try verifying token and processing request to admin
        const { body, headers: { authorization, user_id }, httpMethod } = event;
        const { identity } = context.clientContext;
        const { SECRET_AUTH_HEADER } = process.env;
        if (authorization !== SECRET_AUTH_HEADER) {
            console.error('Unauthorized!');
            return {  // imitate response from identity endpoints
                body: JSON.stringify({ code: 401, msg: 'Unauthorized' }),
                statusCode: 401,
            };  // skip request to admin
        }  // end of function if unauthorized
        const response = await fetch(`${identity.url}/admin/users/${user_id}`, {
            method: httpMethod,
            headers: { Authorization: `Bearer ${identity.token}` },
            body: JSON.stringify(body ? JSON.parse(body) : undefined),
        });  // support GET, POST, PUT, DELETE
        const { ok, status } = response;
        const __log = ok ? console.log : console.error;
        __log('Response:', status);
        return { body: await response.text(), statusCode: status };
    } catch(internalError) {
        console.error(internalError);
        internalError.statusCode ??= 500;  // nullish coalescing operator (??) since ES11 (2020)
        return internalError;
    }  // end of function when internal error occurs
};
