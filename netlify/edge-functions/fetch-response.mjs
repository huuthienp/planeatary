import { getStore } from '@netlify/blobs';
import { CustomResponse } from '../../scripts/custom-classes.mjs';


export default async (request) => {
    try {  // try searching blobs for newest cycle
        const { headers } = request;
        const id = headers.get('userId');
        const newestCycle = await getNewestCycle(id);
        if (!id || !newestCycle) {
            const message = `A cycle of ${id} cannot be found!`;
            console.warn(message);  // v2
            return new CustomResponse(message, 404);
        }  // end of function if id/response not found
        console.log(`Newest cycle of ${id} is found!`);
        return new CustomResponse(newestCycle); // default status is 200
    } catch(internalError) {
        console.warn('Caught', internalError);
        const { message, stack, status } = internalError;
        return new CustomResponse(stack || message, status || 500);
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
