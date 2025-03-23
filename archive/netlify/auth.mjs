import fetch from 'node-fetch';


export default async (request, context) => {
    try {
        const { url } = context.site;
        const nf_jwt = context.cookies.get('nf_jwt');
        const authHeader = nf_jwt ? `Bearer ${nf_jwt}` : request.headers.get('Authorization');
        const response = await fetch(url + '/.netlify/identity/user', {
            method: request.method,
            headers: {
                Authorization: authHeader,
            },
        });
        const { status } = response;
        const __log = response.ok ? console.log : console.error;
        __log(status);
        return new Response(await response.text(), {
            status: status,
        });
    } catch(error) {
        console.warn('Caught', error);
        return new Response(JSON.stringify(error), {
            status: 500,
            statusText: 'Internal error at endpoint. Check body for full error.',
        });
    }
};


export const config = {
    path: '/esm/auth',
};
