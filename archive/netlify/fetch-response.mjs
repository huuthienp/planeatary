import { getStore } from '@netlify/blobs';
import { formulateErrorResponse } from '../../scripts/custom-http.ts';


export default async (request) => {
    try {  // try searching blobs for newest cycle
        const { headers } = request;
        const id = headers.get('userId');
        const newestCycle = await getNewestCycle(id);
        if (!id || !newestCycle) {
            const code = 404;
            const msg = `A cycle of ${id} cannot be found!`;
            console.error(message);
            return Response.json({ code, msg }, { status: code });
        }  // end of function if id/response not found
        console.log(`Newest cycle of ${id} is found!`);
        return Response.json(newestCycle); // default status is 200
    } catch(fetchErr) {
        console.warn('Caught:\n', fetchErr);
        return formulateErrorResponse(fetchErr);
    }  // end of catching internal error, which interrupts searching
};


export const config = { method: 'GET', path: '/api/fetch-response' };


async function getNewestCycle(key) {
    if (key) {  // access blobs with key
        return await getStore('newestCycles').get(key, { consistency: 'strong' });
    } else { return null; }
}  // end of getNewestCycle


function validateURL(url) {  // unused
    const urlLower = new URL(url.toLowerCase());
    const quizType = urlLower.searchParams.get('quiztype');
    if (!['pre', 'post', ''].includes(quizType)) {
        const message = `Valid quiz type: 'pre', 'post', or empty (not '${quizType}').`;
        const status = 400;
        throw ({ message, status });
    }  // end of function if quiz type invalid
}
