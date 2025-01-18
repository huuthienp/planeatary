import fetch from 'node-fetch';


export default async (event, context) => {
    const authHeader = event.headers.get('Authorization');
    const { url } = context.site;
    try {
        const options = {
            method: event.method,
            headers: {
                Authorization: authHeader,
            },
        };
        const response = await fetch(url + '/.netlify/identity/user', options);
        const status = response.status;
        if (response.ok) {
            console.log(status);
        } else {
            console.error(status);
        }
        return new Response(await response.text(), {
            status: status,
        });
    } catch(error) {
        console.error(JSON.stringify(error));
        return new Response(JSON.stringify(error), {
            status: 500,
            statusText: 'Internal error at endpoint. Check body for full error.',
        });
    }
};


export const config = {
    path: '/esm/auth',
};
