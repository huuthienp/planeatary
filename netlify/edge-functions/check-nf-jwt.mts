import type { Config, Context } from '@netlify/edge-functions';


export default async (request: Request, { cookies }: Context) => {
    const requestURL = new URL(request.url);
    const homePathname = '/#signin';
    const jwt: string = cookies.get('nf_jwt') ?? '';
    if ('' === jwt.trim()) {  // if jwt is an empty string
        return getRedirect({ requestURL, pathname: homePathname });
    } else {  // if jwt is a non-empty string
        const checkResponse = await checkJWT(jwt, requestURL);
        if (checkResponse.ok) return;  // continue the request chain
        else return getRedirect({ requestURL, pathname: homePathname, headers: checkResponse.headers });
    }  // jwt has been checked
}  // function handler


function getRedirect(params: {requestURL: URL, pathname: string, headers?: Headers}): Response {
    const { requestURL, pathname } = params;
    const url = new URL(pathname, requestURL.origin);
    const opt = { status: 302, headers: new Headers() };
    opt.headers.set('location', url.href);
    for (const [name, value] of params.headers?.entries() ?? []) opt.headers.set(name, value);
    console.log('Redirected to', url.href, 'from', requestURL.pathname);
    return new Response(null, opt);
}  // getRedirect


async function checkJWT(jwt: string, requestURL: URL, pathname = '.netlify/identity/user'): Promise<Response> {
    const url = new URL(pathname, requestURL.origin);
    const opt = { headers: new Headers(), method: 'GET'};
    opt.headers.set('authorization', 'Bearer ' + jwt);
    const response = await fetch(url, opt);
    return response;
}  // checkJWT


export const config: Config = {
    method: 'GET',
    path: '/([^./]+){.html}?',
    excludedPath: ['/404{.html}?', '/index{.html}?']
};  // config
