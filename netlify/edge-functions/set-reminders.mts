import type { Config } from '@netlify/edge-functions';
import { extractTaskData } from '../../scripts/helpers.mjs';
import { ReminderSetter } from '../../scripts/custom-reminder.ts';
import { formulateErrorResponse } from '../../scripts/custom-http.ts';

const { env } = Netlify;
const taskStoreId = env.get('REMINDER_STORE_ID') ?? 'default-store';
const timeZone = env.get('CLIENT_TZ');
const reminderOffset = Number(env.get('REMINDER_OFFSET_DAYS'));
const congratsOffset = Math.floor(reminderOffset / ReminderSetter.earlyFactor);


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
    const refMethod = headers.get('x-referer-method')?.toUpperCase() ?? '';
    try {  /* check if auth and set reminder */
        if (env.get('SECRET_AUTH_HEADER') !== headers.get('authorization')) {
            const msg = 'Unauthorized';
            const code = 401;
            const authErr = new Error(JSON.stringify({ code, msg }));
            authErr.name = 'AuthorizationError';
            throw authErr;
        }  /* end of checking auth header */
        // continue if authorised
        const { chosen, userId }
            : { chosen: Array<string>, userId: string }
            = await request.json();
        const helper = new ReminderSetter(taskStoreId, { timeZone });
        if (await helper.isOptOut(userId)) {
            const code = 422;
            const msg = 'User has opted out of reminders.';
            const optOutErr = new Error(JSON.stringify({ code, msg }));
            optOutErr.name = 'UserOptOutError';
            throw optOutErr;
        }  // continue if user has not opted out
        await helper.setLastSeen(userId);
        if (['POST', 'PUT'].includes(refMethod)) {
            const taskData = extractTaskData({ result: chosen });  // imitate Qualtrics response
            const isAllDone = ReminderSetter.checkAllDone(taskData);
            helper.offset = isAllDone ? congratsOffset : reminderOffset;
            await helper.setTaskReminder(userId);
        }  // end of setting reminder
        return new Response(null, { status: 204 });
    } catch(setRmdrErr) {
        console.error('Caught:\n', setRmdrErr);
        return formulateErrorResponse(setRmdrErr);
    }  /* end of main try-catch block */
};  /* end of function handler */


export const config: Config = { method: 'POST', path: '/api/set-reminders' };
