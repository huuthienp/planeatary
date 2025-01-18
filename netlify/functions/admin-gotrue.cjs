exports.handler = async function (event, context) {
    const { body, headers, httpMethod } = event;
    const { identity, user } = context.clientContext;
    const { ADMIN_UUID } = process.env;
    if (!user || user.sub != ADMIN_UUID) {
        console.error('Unauthorized');
        return {
            body: JSON.stringify({ error: 'Unauthorized' }),
            statusCode: 401,
        };
    }
    const targetUrl = `${identity.url}/admin/users/${headers.user_id}`;
    const authHeader = `Bearer ${identity.token}`;
    const data = body ? JSON.parse(body) : undefined;
    const response = await fetch(targetUrl, {
        method: httpMethod,
        headers: { Authorization: authHeader },
        body: JSON.stringify(data),
    });
    const { status } = response;
    const __log = response.ok ? console.log : console.error;
    __log(status);
    return {
        body: await response.text(),
        statusCode: status,
    };
};
