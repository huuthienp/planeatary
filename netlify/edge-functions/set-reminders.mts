import type { Config } from '@netlify/edge-functions';
import { extractWithNames } from '../../scripts/custom-data.ts';
import { ReminderSetter } from '../../scripts/custom-reminder.ts';
import { formulateErrorResponse } from '../../scripts/custom-http.ts';

const { env } = Netlify;
const taskStoreId = env.get('REMINDER_STORE_ID') ?? 'default-store';
const timeZone = env.get('CLIENT_TZ');
const reminderOffset = Number(env.get('TASK_REMINDER_OFFSET_DAYS'));
const congratsOffset = Number(env.get('TASK_CONGRATS_OFFSET_DAYS'));
const postQuizOffset = Number(env.get('POST_QUIZ_REMINDER_OFFSET_DAYS'));


export default async (request: Request) => {
    /**
     * @route POST /api/set-task-reminder
     * @desc Schedule reminders to user about their tasks
     * @access Private
     *
     * @param {Object} request.body
     * @param {string[]} request.body.chosen - Array of chosen task number(s)
     * @param {string} request.body.userId - Unique identifier of the user
     *
     * @returns {Object} JSON object with status and message
     * @returns {204} No Content - If a reminder is set
     * @throws {401} Unauthorized - If no valid authorization token is provided
     * @throws {500} Server Error - For other errors
     */
    const { headers } = request;
    try {  /* check if auth and set reminder */
        if (env.get('SECRET_AUTH_HEADER') !== headers.get('authorization')) {
            const msg = 'Unauthorized';
            console.error(msg);
            return Response.json({ code: 401, msg }, { status: 401 });
        } else {  // continue if auth
            const { chosen, userId }: { chosen: Array<string>, userId: string } = await request.json();
            const taskData = extractWithNames({ chosen });
            const isAllDone = ReminderSetter.checkAllDone(taskData);
            const helper = new ReminderSetter(taskStoreId,
                { timeZone, offset: isAllDone ? congratsOffset : reminderOffset },
            );  // initiate a helper to set a reminder
            if (await helper.isOptOut(userId)) {
                const code = 422;
                const msg = 'User has opted out of reminders.';
                const optOutErr = new Error(JSON.stringify({ code, msg }));
                optOutErr.name = 'UserOptOutError';
                throw optOutErr;
            }  // continue if user has not opted out
            await helper.setLastSeen(userId);
            await helper.setReminder(userId, taskData);
            if (isAllDone) {  /* set post-quiz reminder */
                helper.setPostQuizReminder(userId, taskData, postQuizOffset);
            }  // use another offset value for post-quiz reminder
            return new Response(null, { status: 204 });
        }  /* end of checking auth header */
    } catch(setRmdrErr) {
        console.error('Caught:\n', setRmdrErr);
        return formulateErrorResponse(setRmdrErr);
    }  /* end of main try-catch block */
};  /* end of function handler */


export const config: Config = { method: 'POST', path: '/api/set-reminders' };
