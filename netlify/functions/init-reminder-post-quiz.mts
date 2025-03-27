import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { connectLambda } from '@netlify/blobs';
import { ReminderSender } from '../../scripts/custom-reminder.ts';

const { env } = process;
const { CLIENT_TZ: timeZone, REMINDER_STORE_ID: storeId } = env;
const endpoint: { auth: string, url: string } = JSON.parse(env.POST_QUIZ_REMINDER_ENDPOINT);
const offset = Number(env.TASK_REMINDER_OFFSET_DAYS);  // for setting another reminder


const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {  // lambda-compatible
    /* to my surprise, the function is invoked more than once every schedule */
    try {  /* Get stored user info to send task reminders via Qualtrics */
        connectLambda(event);
        const helper = new ReminderSender(storeId ?? 'default-store',
            context, endpoint,
            { timeZone, offset }
        );  // initiate a helper to send reminders
        helper.verbose = true;
        await helper.sendPostQuizReminders();  // always send regardless of offset
    } catch(sendRmdrErr) {
        console.error('Caught:\n', sendRmdrErr);
    }  /* End of main try-catch */
    return { body: 'OK', statusCode: 200 };  // prevent multiple invocations
};  /* End of function handler */


export { handler };
