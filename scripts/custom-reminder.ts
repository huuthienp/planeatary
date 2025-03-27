import type { HandlerContext } from "@netlify/functions";
import { type Store, getStore } from '@netlify/blobs';
import { fetchData, fetchUserData } from './helpers.mjs';
import type { TaskData, QuizResponseCycle } from './custom-data.ts';
import { isTaskData } from './custom-data.ts';
import { userIdRegex, respIdWholeRegex } from './regex.js';


class NfBlobManager {
    private static keyHierDelim: string = '/';  // https://docs.netlify.com/blobs/overview/#hierarchy
    public static getHierKey({ basename = '', prefix = '' }: { basename: string, prefix: string|Array<string> }): string {
        if (Array.isArray(prefix)) { prefix = prefix.join(NfBlobManager.keyHierDelim); }
        if ('' !== prefix.trim()) prefix += NfBlobManager.keyHierDelim ;
        return prefix + basename;
    } /* end of getHierKey */
    public store: Store;
    public verbose: boolean = false;
    constructor(storeName: string) {
        this.store = getStore(storeName);
    }  /* end of NfBlobManager constructor */
}  /* end of NfBlobManager */


class ReminderSetter extends NfBlobManager {
    public static lastSeenPrfx: string = 'last-seen';
    public static optOutPrfx: string = 'opt-out';
    public static postQuizPrfx: string = 'post-quiz';
    public static getISODateString(date: Date): string {
        return date.toISOString().split('T')[0]
    }  /* end of getISODateString */
    public static checkAllDone(data: TaskData): boolean {
        return data.done.length === data.chosen.length && 0 === data.pending.length;
    }  /* end of checkAllDone */
    public static hasDonePostQuiz(respHist: Array<QuizResponseCycle>): boolean {
        // check any post-quiz ID in the last cycle
        return respIdWholeRegex.test(respHist.at(-1)?.postId ?? '');
    }  /* end of hasDonePostQuiz */
    public nowDate: Date;
    public timeZone: string;
    public offset: number;
    constructor(storeName: string, { timeZone = undefined, offset = 0 }: { timeZone?: string, offset?: number }) {
        super(storeName);
        this.offset = offset;
        this.nowDate = new Date();
        if (undefined !== timeZone) {
            this.timeZone = timeZone;
            this.nowDate = new Date(this.nowDate.toLocaleString(undefined, { timeZone }));
        }  /* end of checking timeZone */
    }  /* end of ReminderSetter constructor */
    public getDatedKey(basename: string = '', offset: number = 0): string {
        const keyDate = new Date(this.nowDate);
        if (offset > 0) keyDate.setDate(keyDate.getDate() + offset);
        const prefix = ReminderSetter.getISODateString(keyDate);
        return NfBlobManager.getHierKey({ basename, prefix });
    }  /* end of getDatedKey */
    public async setLastSeen(basename: string): Promise<void> {
        const prefix = ReminderSetter.lastSeenPrfx;
        await this.store.set(
            NfBlobManager.getHierKey({ basename, prefix }),
            ReminderSetter.getISODateString(this.nowDate)
        );  // store date when user is last seen
    }  /* end of setLastSeen */
    public async setReminder(basename: string, data: TaskData, prefix: string = ''): Promise<void> {
        /** blob structure
         * key: .../yyyy-mm-dd/user-id-in-uuid-format
         * value: { "chosen": [], "done": [], "pending":[] }
         * metadata: { ampm } */
        const datedKey = this.getDatedKey(basename, this.offset);
        const reminderKey = NfBlobManager.getHierKey({ basename: datedKey, prefix });
        const metadata = { ampm: (this.nowDate.getHours() < 12) ? 'am' : 'pm' };
        await this.store.setJSON(reminderKey, data, { metadata })
    }  /* end of setReminder */
    public async setTaskReminder(basename: string, data: TaskData): Promise<void> {
        await this.setReminder(basename, data); // key's format: yyyy-mm-dd/user-id-in-uuid-format
        if (this.verbose) { console.log('Task reminder is set!', basename.substring(9, 18)) };
    }  /* end of setTaskReminder */
    public async setPostQuizReminder(basename: string, data: TaskData, offset?: number): Promise<void> {
        const _offset = this.offset;
        this.offset = offset ?? this.offset;
        const prefix = ReminderSetter.postQuizPrfx;
        await this.setReminder(basename, data, prefix);
        // key's format: post-quiz/yyyy-mm-dd/user-id-in-uuid-format
        this.offset = _offset;
        if (this.verbose) { console.log('Post-quiz reminder is set!', basename.substring(9, 18)) };
    }  /* end of setPostQuizReminder */
    public async isOptOut(userId: string): Promise<boolean> {
        const prefix = ReminderSetter.optOutPrfx;
        const key = NfBlobManager.getHierKey({ basename: userId, prefix });
        return Boolean(await this.store.get(key));
    }  /* end of isOptOut */
    public async addOptOut(userId: string): Promise<void> {
        const prefix = ReminderSetter.optOutPrfx;
        const key = NfBlobManager.getHierKey({ basename: userId, prefix });
        await this.store.set(key, '1');  // create mini-blob in opt-out directory
    }  /* end of addOptOut */
}  /* end of ReminderSetter class */


class ReminderSender extends ReminderSetter {
    private endpoint: { auth: string, url: string };
    private netlifyIdentity: { url: string, token: string };
    constructor(storeName: string, context: HandlerContext, endpoint: { auth: string, url: string },
        { timeZone = undefined, offset = 0 }: { timeZone?: string, offset?: number }) {
        super(storeName, { timeZone, offset });
        this.endpoint = endpoint;
        this.netlifyIdentity = context.clientContext?.identity;
    }  /* end of ReminderSender constructor */
    public async sendReminders({ prefix }: { prefix: string }): Promise<void> {
        const { blobs } = await this.store.list({ directories: true, prefix });
        // list() returns { blobs: [], directories: [] }
        if (this.verbose) console.log(blobs.map(x=>x.key));
        for (const { key } of blobs) {  // array of { etag, key }
            const userId = key.match(userIdRegex)?.[0] ?? '';
            if (await this.isOptOut(userId)) {
                await this.store.delete(key);
                continue;
            }  // skip if user has opted out of reminder
            const { email, user_metadata: { full_name: name, responseHistory: respHist } } = await fetchUserData(userId, this.netlifyIdentity);
            const taskData = await this.getTaskData(userId);
            const isAllDone = ReminderSetter.checkAllDone(taskData);
            const diffDays = (this.nowDate.getTime() - (await this.getLastSeen(userId)).getTime()) / 1000 / 3600 / 24;
            /* send reminder if user has not opened tasks recently or is done with all tasks */
            if (isAllDone || diffDays >= this.offset) {
                try {  // call email endpoint
                    const respBody = await this.callEmailEndpoint(JSON.stringify({ email, name, ...taskData }));
                    if (this.verbose) { console.log(userId.substring(9, 18), JSON.stringify(respBody)); }
                } catch(respErr) {
                    console.error('For', userId.substring(9, 18), 'Caught:\n', respErr);
                }  /* end of try-catch */
            }  /* end of checking difference in days between last seen and today */
            await this.store.delete(key);  // remove current reminder to free storage
            /* set another reminder */
            if (isAllDone) {
                if (!ReminderSetter.hasDonePostQuiz(respHist))
                // set post-quiz reminder if all tasks are done and post-quiz is not done
                await this.setPostQuizReminder(userId, taskData);
            } else {  // set task reminder if some tasks remain
                await this.setTaskReminder(userId, taskData);
            }  /* end of setting another reminder */
        }  /* end of looping through all blobs that match prefix */
    }  /* end of sendReminders */
    public async sendTaskReminders(): Promise<void> {
        const prefix = this.getDatedKey();  // returns yyyy-mm-dd/
        await this.sendReminders({ prefix });
    }  /* end of sendTaskReminders */
    public async sendPostQuizReminders(): Promise<void> {
        const prefix = NfBlobManager.getHierKey({
            basename: this.getDatedKey(),
            prefix: ReminderSetter.postQuizPrfx,
        });  // prefix's format: post-quiz/yyyy-mm-dd/
        await this.sendReminders({ prefix });
    }  /* end of sendPostQuizReminders */
    private async callEmailEndpoint(payload: string): Promise<void> {
        const opt = { body: '', headers: new Headers(), method: 'POST' };
        opt.body = payload.replace(/`/g, '\`');
        opt.headers.set('content-type', 'application/json');
        opt.headers.set('authorization', this.endpoint.auth);
        return await fetchData(this.endpoint.url, opt);  // may throw ResponseNotOkError
    }  /* end of callEmailEndpoint */
    private async getTaskData(basename: string): Promise<TaskData> {
        const storedData = JSON.parse(await this.store.get(this.getDatedKey(basename)));
        if (storedData && isTaskData(storedData)) {
            return storedData as TaskData;
        } else {  // throw data error
            const dataErr = new Error('Invalid task data for ' + basename.substring(9, 18));
            dataErr.name = 'DataError';
            throw dataErr;
        }  /* end of validating task data */
    }  /* end of getTaskData */
    private async getAmPm(basename: string): Promise<any> {
        const { metadata } = await this.store.getMetadata(this.getDatedKey(basename)) ?? {};
        return metadata?.ampm;
    }  /* end of getAmPm */
    private async getLastSeen(basename: string): Promise<Date> {
        const prefix = ReminderSetter.lastSeenPrfx;
        const key = NfBlobManager.getHierKey({ basename, prefix });
        return new Date(await this.store.get(key));
    }  /* end of getLastSeen */
}  /* end of ReminderSender */


export { ReminderSetter, ReminderSender };
