import { connectLambda, getStore } from '@netlify/blobs';
import { fetchData, fetchUserData } from '../../scripts/helpers.mjs';
// import { getStrongBlob } from '../../scripts/helpers.mjs';
import { userIdRegex } from '../../scripts/regex.js';

const { env } = process;
const emEvent = JSON.parse(env.REMINDER_EMAIL_EVENT);
const { CLIENT_TZ: timezone, TASK_REMINDER_STORE_ID: storeId } = env;
const hierDelim = '/';  // https://docs.netlify.com/blobs/overview/#hierarchy
const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getPrefix = now => '' + now.getDay() + '-' + weekdays[now.getDay()];
/* remove `^` and `$` for partial match (blobKey: weekday/22-user-id-4444) */
/** pitfall
 * re-defining imported value = fallback to legacy bundler,
 * which calls `require` and then throws error because this is .mjs not .cjs,
 * but error was missed because I did not read deploy (successful) log */


export async function handler(event, context) {
    const now = new Date();
    console.log(now.toISOString());
    const nowTz = new Date(now.toLocaleString(undefined, { timezone }));
    const prefix = getPrefix(nowTz);
    // getStore must be inside handler
    try {  /* Get stored user info to send task reminders via Qualtrics */
        connectLambda(event);
        const taskRmdrStore = getStore(storeId);
        const { blobs } = await taskRmdrStore.list({
            directories: true, prefix
        });  // list() returns { blobs: [], directories: [] }
        console.log(blobs.length, 'reminder(s)');
        for (const { key: blobKey } of blobs) {  // array of { etag, key }
            const userId = blobKey.match(userIdRegex)[0];
            const lastSentKey = 'last-sent' + hierDelim + userId;
            /* unexpectedly, the function is invoked more than once every schedule */
            // if (now - new Date(lastSentISO) < 60000) { continue; }  // skip sending if last sent less than 1 minute ago
            const { email, user_metadata: { full_name: name } } = await fetchUserData(userId, context.clientContext.identity);
            let taskData;
            try { taskData = JSON.parse(await taskRmdrStore.get(blobKey)); } catch { console.error('Caught non-JSON!', blobKey); continue; }
            const opt = { body: '', headers: new Headers(), method: 'POST' };
            opt.body = JSON.stringify({ email, name, ...taskData }).replaceAll('`', '\`');
            opt.headers.set('content-type', 'application/json');
            opt.headers.set('authorization', emEvent.basicAuth);
            console.log(JSON.stringify(await fetchData(emEvent.taskEventUrl, opt)));  // may throw ResponseNotOkError
            await taskRmdrStore.set(lastSentKey, now.toISOString());
        }  /* End of looping through task reminder store */
    } catch(taskRmdrErr) {
        console.error('Caught:\n', taskRmdrErr);
    }  /* End of main try-catch */
    return { body: 'OK', statusCode: 200 };  // prevent multiple invocations
};  /* End of function handler */

// export const config = { schedule: '0 0/8 * * *' };  // see netlify.toml
