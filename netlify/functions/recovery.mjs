import { connectLambda, getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { fetchData, getStrongBlob, isEmpty } from '../../scripts/helpers.mjs';
import { passwdWholeRegex } from '../../scripts/regex.js';
import { formulateErrorResponse } from '../../scripts/custom-http.ts';

const goodMethods = ['POST', 'PUT'];


export async function handler(event, context) {
    const eventTime = Date.now();
    try {
        if (!goodMethods.includes(event.httpMethod)) {
            const code = 405;
            const msg = `${event.httpMethod} not allowed, use ${goodMethods.join(' or ')}`;
            const badMthErr = new Error(JSON.stringify({ code, msg }));
            badMthErr.name = 'BadMethodError';
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
        if ('PUT' === event.httpMethod) {
            /* Validate decoy and token */
            const { decoy, token } = eventBody;
            console.warn('Use `env.URL` in `getStrongBlob` for production!')
            const decoyBlob = await getStrongBlob(env.URL, authHd, tkSpecs.storeId, decoy);
            const authErr = new Error();
            const authErrCode = 401;
            authErr.name = 'AuthorizationError';
            if (null === decoyBlob) {
                const msg = 'Decoy is not found, please try again';
                authErr.message = JSON.stringify({ code: authErrCode, msg });
                throw authErr;
            }  // reject if decoy blob is not found
            const { data: userId, metadata: mtdt } = decoyBlob;
            if (eventTime >= mtdt.expiresAt) {
                const msg = 'Token is expired, please request another one';
                authErr.message = JSON.stringify({ code: authErrCode, msg });
                throw authErr;
            }  // reject if token is expired
            const tkBlob = await getStrongBlob(env.URL, authHd, tkSpecs.storeId, userId);
            if (null === tkBlob)  /* unlikely */  { throw tk404Err; }  // reject if token blob is not found
            const isGoodTk = await compare(token, tkBlob.data /* hash */);
            if (!isGoodTk) {
                const msg = 'Token does not match, please try again';
                authErr.message = JSON.stringify({ code: authErrCode, msg });
                throw authErr;
            }  // reject if token does not match stored hash
            /* Delete decoy and token blobs */
            await tkStore.delete(decoy);
            await tkStore.delete(userId);
            const newPasswd = eventBody.password;
            if ('string' !== typeof newPasswd || !passwdWholeRegex.test(newPasswd)) {
                const code = 400;
                const msg = 'Password is invalid or weak, but token is now expired, please request another one';
                const badPwErr = new Error(JSON.stringify({ code, msg }));
                badPwErr.name = 'ValidationError';
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
            if (isEmpty(email)) {
                const code = 400;
                const msg = 'Please enter a valid email';
                const emErr = new Error(JSON.stringify({ code, msg }));
                emErr.name = 'EmailError';
                throw emErr;
            }  // reject if email is bad
            /* Find user ID */
            const foundUser = await findUserByEmail(identity, email);
            if (isEmpty(foundUser)) {
                const code = 404;
                const msg = 'User not found';
                const emErr = new Error(JSON.stringify({ code, msg }));
                emErr.name = 'EmailError';
                throw emErr;
            }  // reject if user with email is not found
            const { id: userId, user_metadata: { full_name: name } } = foundUser;
            /* Check existing token */
            const blob = await getStrongBlob(env.URL, authHd, tkSpecs.storeId, userId);
            const mtdt = null===blob ? null : blob.metadata;
            if (mtdt && eventTime < Number(mtdt.expiresAt)) {
                const code = 429;
                const headers = { 'Retry-After': retryTime };
                const retryTime = Math.ceil((Number(mtdt.expiresAt) - eventTime) / 1000 / 100) * 100;  // round up to hundred
                const msg = `A similar request is recent, please retry in ${retryTime} seconds`;
                const manyReqErr = new Error(JSON.stringify({ code, headers, msg }));
                manyReqErr.name = 'TooManyRequestsError';
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
    } catch(rcvrErr) {  // catch any error and formulate response
        console.error('Caught:\n', rcvrErr);
        return formulateErrorResponse(rcvrErr, { lambda: true });
    }  /* end of try-catch */
};  /* end of handler */


async function findUserByEmail(clientIdentity, emailToFind) {
    const usersUrl = `${clientIdentity.url}/admin/users`;
    const method = 'GET';
    const headers = { Authorization: `Bearer ${clientIdentity.token}` };
    const { users } = await fetchData(usersUrl, ({ method, headers }));  // may throw when response not ok
    return users.find(user => user.email === emailToFind);  // undefined if false
}  /* end of findUserByEmail */
