import { fetchData } from '../../scripts/helpers.mjs';
import { connectLambda, getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

const goodMethods = ['POST', 'PUT'];
const isBadString = x => 'string' !== typeof x || '' === x.trim();
const isBadObject = x => 'object' !== typeof x || null === x;
const passwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
var strongBlobUrl;


export async function handler(event, context) {
    const eventTime = Date.now();
    try {
        if (!goodMethods.includes(event.httpMethod)) {
            const badMthErr = new Error(`${event.httpMethod} not allowed, use ${goodMethods.join(' or ')}`);
            badMthErr.name = 'BadMethodError';
            badMthErr.status = 405;
            throw badMthErr;
        }  // reject if method is not allowed
        /* Pre-Processing */
        connectLambda(event);
        const eventBody = JSON.parse(event.body);
        const { identity } = context.clientContext;
        const { env } = process;
        const authHd = env.SECRET_AUTH_HEADER;
        const tkSpecs = JSON.parse(env.RECOVERY_TOKEN_SPECS);
        const tkStore = getStore(tkSpecs.storeId);
        strongBlobUrl = env.URL + '/api/get-strong-blob';
        if ('PUT' === event.httpMethod) {
            /* Validate decoy and token */
            const { decoy, token } = eventBody;
            const decoyBlob = await getStrongBlob(authHd, tkSpecs.storeId, decoy);
            const tk404Err = new Error('Decoy is not found, please try again');
            tk404Err.name = 'AuthorizationError';
            tk404Err.status = 401;
            if (null === decoyBlob) { throw tk404Err; }  // reject if decoy blob is not found
            const { data: userId, metadata: mtdt } = decoyBlob;
            if (eventTime >= mtdt.expiresAt) {
                const tkExpErr = new Error('Token is expired, please request another one');
                tkExpErr.name = 'AuthorizationError';
                tkExpErr.status = 401;
                throw tkExpErr;
            }  // reject if token is expired
            const tkBlob = await getStrongBlob(authHd, tkSpecs.storeId, userId);
            if (null === tkBlob)  /* unlikely */  { throw tk404Err; }  // reject if token blob is not found
            const isGoodTk = await compare(token, tkBlob.data /* hash */);
            if (!isGoodTk) {
                const badTkErr = new Error('Token does not match, please try again');
                badTkErr.name = 'AuthorizationError';
                badTkErr.status = 401;
                throw badTkErr;
            }  // reject if token does not match stored hash
            /* Delete decoy and token blobs */
            await tkStore.delete(decoy);
            await tkStore.delete(userId);
            const newPasswd = eventBody.password;
            if ('string' !== typeof newPasswd || !passwdRegex.test(newPasswd)) {
                const badPwErr = new Error('Password is invalid or weak, but token is now expired, please request another one');
                badPwErr.name = 'ValidationError';
                badPwErr.status = 400;
                throw badPwErr;
            }  // reject if password is weak
            const url = `${identity.url}/admin/users/${userId}`;
            const opt = {};
            opt.method = 'PUT';
            opt.headers = { Authorization: `Bearer ${identity.token}` };
            opt.body = JSON.stringify({ password: newPasswd });
            const { user_metadata: { full_name: name } } = await fetchData(url, opt);
            const msg = `Hi ${name}, your password has been updated`;
            console.log(msg);
            const resp = {};
            resp.body = msg;
            resp.statusCode = 200;
            return resp;
        } else {  /* start of POST */
            const { email } = eventBody;
            if (isBadString(email)) {
                const emErr = new Error('Please enter a valid email');
                emErr.name = 'EmailError';
                emErr.status = 400;
                throw emErr;
            }  // reject if email is bad
            /* Find user ID */
            const foundUser = await findUserByEmail(identity, email);
            if (isBadObject(foundUser)) {
                const emErr = new Error('User not found');
                emErr.name = 'EmailError';
                emErr.status = 404;
                throw emErr;
            }  // reject if user with email is not found
            const { id: userId, user_metadata: { full_name: name } } = foundUser;
            /* Check existing token */
            const blob = await getStrongBlob(authHd, tkSpecs.storeId, userId);
            const mtdt = null===blob ? null : blob.metadata;
            if (mtdt && eventTime < Number(mtdt.expiresAt)) {
                const retryTime = Math.ceil((Number(mtdt.expiresAt) - eventTime) / 1000 / 100) * 100;  // round up to hundred
                const manyReqErr = new Error(`A similar request is recent, please retry in ${retryTime} seconds`);
                manyReqErr.name = 'TooManyRequestsError';
                manyReqErr.status = 429;
                manyReqErr.headers = { 'Retry-After': retryTime };
                throw manyReqErr;
            };  // reject if token is alive
            mtdt && await tkStore.delete(mtdt.decoy);  // delete existing decoy
            /* Generate token */
            const expiresAt = eventTime + Number(tkSpecs.lifeMs);
            const token = randomBytes(Number(tkSpecs.sizeByte)).toString('hex');
            const decoy = randomBytes(Number(env.KEY_SIZE_BYTE)).toString('hex');
            const hashedTk = await hash(token, Number(env.HASH_SALT_ROUNDS));
            /* Save token */
            await tkStore.set(userId, hashedTk, { metadata: ({ decoy, expiresAt })
            });  // save hashed token along with expiration time
            await tkStore.set(decoy, userId, { metadata: ({ expiresAt })
            });  // save key for convenient access
            /* Send token via HTTP and email */
            const emEvent = JSON.parse(env.RECOVERY_EMAIL_EVENT);
            const urlObj = new URL(env.URL);
            urlObj.searchParams.set('decoy', decoy);
            urlObj.searchParams.set('token', token);
            const url = urlObj.href;
            const opt = {};
            opt.method = 'POST';
            opt.headers = { 'Content-Type': 'application/json', Authorization: emEvent.auth };
            opt.body = JSON.stringify(({ name, email, url }));
            console.log(await fetchData(emEvent.url, opt));  // may throw when response not ok
            const resp = {};
            resp.body = 'Request accepted, please check your email';
            resp.statusCode = 202;
            return resp;
        }  /* end of POST */
    } catch(anyErr) {  // catch any error and formulate response
        console.error(anyErr);
        anyErr.body = anyErr.toString();
        anyErr.statusCode ??= anyErr.status ?? 500;
        return anyErr;
    }  /* end of try-catch */
};  /* end of handler */


async function findUserByEmail(clientIdentity, emailToFind) {
    const usersUrl = `${clientIdentity.url}/admin/users`;
    const method = 'GET';
    const headers = { Authorization: `Bearer ${clientIdentity.token}` };
    const { users } = await fetchData(usersUrl, ({ method, headers }));  // may throw when response not ok
    return users.find(user => user.email === emailToFind);  // undefined if false
}  /* end of findUserByEmail */


async function getStrongBlob(authHd, tkStoreId, userId) {
    const method = 'GET';
    const headers = new Headers();
    headers.set('authorization', authHd);
    headers.set('netlify-store-id', tkStoreId);
    headers.set('netlify-blob-key', userId);
    return await fetchData(strongBlobUrl, ({ method, headers }));  // may return null
}  /* end of getStrongBlob */
