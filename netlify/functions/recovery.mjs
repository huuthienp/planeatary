import { fetchData } from '../../scripts/helpers.mjs';
import { connectLambda, getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';

const isBadString = x => 'string' !== typeof x || '' === x.trim();
const isBadObject = x => 'object' !== typeof x || null === x;


export async function handler(event, context) {
    const eventTime = Date.now();
    const { RECOVERY_HANDLER_TIMEOUT: timeout } = process.env;
    await new Promise(x => setTimeout(x, timeout));
    try {
        /* Process request */
        const { identity } = context.clientContext;
        const { email } = JSON.parse(event.body);
        if (isBadString(email)) {
            const emailError = new Error('Please enter a valid email');
            emailError.name = 'EmailError';
            emailError.status = 400;
            throw emailError;
        }  // reject if email is bad
        /* Find user ID */
        const foundUser = await findUserByEmail(identity, email);
        if (isBadObject(foundUser)) {
            const emailError = new Error('User not found');
            emailError.name = 'EmailError';
            emailError.status = 404;
            throw emailError;
        }  // reject if user with email is not found
        const { id: userId, user_metadata: { full_name: userName } } = foundUser;
        /* Check existing token */
        const { RECOVERY_TOKEN_SPECS, RECOVERY_EMAIL_EVENT, HASH_SALT_ROUNDS: saltRounds } = process.env;
        const { tokenStoreId, tokenLifeMs, tokenSizeByte } = JSON.parse(RECOVERY_TOKEN_SPECS);
        connectLambda(event);
        const tokenStore = getStore(tokenStoreId);
        const tokenEntry = await tokenStore.getMetadata(userId);
        const tokenAlive = tokenEntry && eventTime < tokenEntry.metadata.expiresAt;
        if (tokenAlive) {
            const retryTime = Math.ceil((tokenEntry.metadata.expiresAt - eventTime) / 1000 / 100) * 100;  // round up to hundred
            const tooManyReqError = new Error(`A similar request was recently received, please retry in ${retryTime} seconds`);
            tooManyReqError.name = 'TooManyRequestsError';
            tooManyReqError.status = 429;
            tooManyReqError.headers = { 'Retry-After': retryTime };
            throw tooManyReqError;
        };  // reject if token is alive
        /* Generate token */
        const expiresAt = eventTime + Number(tokenLifeMs);
        const token = randomBytes(Number(tokenSizeByte)).toString('hex');
        const hashedToken = await hash(token, Number(saltRounds));
        await tokenStore.set(userId, hashedToken, {
            metadata: ({ expiresAt })
        });  // save hashed token along with expiration time
        /* Send token via HTTP and email */
        const { url: qEventUrl, authHeader } = JSON.parse(RECOVERY_EMAIL_EVENT);
        const options = { method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
            body: JSON.stringify(({ email, token, userName }))
        };
        console.log(await fetchData(qEventUrl, options));  // may throw when response not ok
        await new Promise(x => setTimeout(x, timeout));
        return { body: 'Request accepted, please check your email', statusCode: 202 };
    } catch(setTokenError) {
        console.error(setTokenError);
        setTokenError.body = setTokenError.toString();
        setTokenError.statusCode = setTokenError.status ?? 500;  // operator '??' since ES11 (2020)
        return setTokenError;
    }
};


async function findUserByEmail(clientIdentity, emailToFind) {  /* v1 */
    const usersUrl = `${clientIdentity.url}/admin/users`;
    const method = 'GET';
    const headers = { Authorization: `Bearer ${clientIdentity.token}` };
    const { users } = await fetchData(usersUrl, ({ method, headers }));  // may throw when response not ok
    return users.find(user => user.email === emailToFind);  // undefined if false
}  /* end of findUserByEmail v1 */
