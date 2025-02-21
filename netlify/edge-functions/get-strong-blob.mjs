import { getStore } from "@netlify/blobs";


export default async (request) => {
    const { headers } = request;
    if (Netlify.env.get('SECRET_AUTH_HEADER') !== headers.get('authorization')) {
        return new Response('Unauthorized', { status: 401 });
    }  // reject if unauthorized
    const storeId = headers.get('netlify-store-id');
    if (null === storeId) { return new Response('Missing netlify-store-id', { status: 400 }); }
    const store = getStore(storeId);
    const key = headers.get('netlify-blob-key');
    if (null === key) { return new Response('Missing netlify-blob-key', { status: 400 }); }
    return Response.json(await store.getWithMetadata(key, { consistency: 'strong' }));
};

export const config = { method: 'GET', path: '/api/get-strong-blob' };
