import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { connectLambda } from '@netlify/blobs';
import { ReminderSender } from '../../scripts/custom-reminder.ts';

const { env } = process;
const { CLIENT_TZ: timeZone } = env;
const storeId = env.REMINDER_STORE_ID ?? 'default-store';
const endpoint = JSON.parse(env.TASK_REMINDER_ENDPOINT ?? '{}');
const offset = Number(env.REMINDER_OFFSET_DAYS);
/** my pitfalls
 * - re-defining imported value = fallback to legacy bundler,
 * which calls `require` and then throws error because this is .mjs not .cjs,
 * but error was missed because I did not read deploy (successful) log
 * - cannot access netlify blobs outside handler */


const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {  // lambda-compatible
    /* to my surprise, the function is invoked more than once every schedule */
    try {  /* Get stored user info to send task reminders via Qualtrics */
        connectLambda(event);
        const helper = new ReminderSender(storeId, context, endpoint, { timeZone, offset });
        helper.verbose = true;
        await helper.sendTaskReminders();
    } catch(sendRmdrErr) {
        console.error('Caught:\n', sendRmdrErr);
    }  /* End of main try-catch */
    return { body: 'OK', statusCode: 200 };  // prevent multiple invocations
};  /* End of function handler */


export { handler };
