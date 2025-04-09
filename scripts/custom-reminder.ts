import type { HandlerContext } from "@netlify/functions";
import { type Store, getStore } from '@netlify/blobs';
import { fetchData, fetchTaskStatus, fetchUserData } from './helpers.mjs';
import type { TaskData, QuizResponseCycle } from './custom-data.ts';
import { mapTaskNumberToName } from './custom-data.ts';
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
    public async deleteBlob(key: string): Promise<void> {
        await this.store.delete(key);  // remove current reminder to free storage
    } /* end of deleteBlob */
}  /* end of NfBlobManager */


class ReminderSetter extends NfBlobManager {
    public static earlyFactor = 2;
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
    public static matchUserId(key: string) {
        return key.match(userIdRegex)?.[0] ?? '';
    } /* end of matchUserId */
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
    public async setReminder(basename: string, prefix: string = ''): Promise<void> {
        const datedKey = this.getDatedKey(basename, this.offset);
        const reminderKey = NfBlobManager.getHierKey({ basename: datedKey, prefix });
        const metadata = { ampm: (this.nowDate.getHours() < 12) ? 'am' : 'pm' };
        await this.store.set(reminderKey, '1', { metadata })
    }  /* end of setReminder */
    public async setTaskReminder(basename: string): Promise<void> {
        // key's format: yyyy-mm-dd/user-id-in-uuid-format
        await this.setReminder(basename);
        if (this.verbose) console.log('Task reminder is set!', basename.substring(9, 18));
    }  /* end of setTaskReminder */
    public async setPostQuizReminder(basename: string, offset?: number): Promise<void> {
        const offsetTemp = this.offset;
        this.offset = offset ?? this.offset;
        const prefix = ReminderSetter.postQuizPrfx;
        // key's format: post-quiz/yyyy-mm-dd/user-id-in-uuid-format
        await this.setReminder(basename, prefix);
        this.offset = offsetTemp;
        if (this.verbose) console.log('Post-quiz reminder is set!', basename.substring(9, 18));
    }  /* end of setPostQuizReminder */
    public async hasPostQuizReminder(userId: string): Promise<boolean> {
        const prefix = ReminderSetter.postQuizPrfx;
        const { blobs } = await this.store.list({ prefix });
        for (const { key } of blobs) {  // array of { etag, key }
            if (key.includes(userId)) return true;
        }  /* end of looping through all blobs that match prefix */
        return false;
    }  /* end of hasPostQuizReminder */
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
    private siteURL: URL;
    constructor(storeName: string, context: HandlerContext, endpoint: { auth: string, url: string },
        { timeZone = undefined, offset = 0 }: { timeZone?: string, offset?: number }) {
        super(storeName, { timeZone, offset });
        this.endpoint = endpoint;
        this.netlifyIdentity = context.clientContext?.identity;
        this.siteURL = new URL(this.netlifyIdentity.url);
    }  /* end of ReminderSender constructor */
    private async inspectUser(userId: string): Promise<{
        email: string, data: TaskData, diffDays: number, hasDonePostQuiz: boolean,
        hasPostQuizReminder: boolean, isAllDone: boolean, userName: string
    }> {
        const lastSeenDate = await this.getLastSeen(userId);
        const diffDays = (this.nowDate.getTime() - lastSeenDate.getTime()) / 1000 / 3600 / 24;
        const hasPostQuizReminder = await this.hasPostQuizReminder(userId);
        const userData = await fetchUserData(userId, this.netlifyIdentity);
        const { email, user_metadata: userMtDt }: { email: string, user_metadata: any } = userData;
        const userName: string = userMtDt.full_name;
        const respHist: Array<QuizResponseCycle> = userMtDt.responseHistory;
        const preResponseId = respHist.at(-1)?.preId ?? '';
        const data = await this.getTaskData(preResponseId, userId);
        const isAllDone = ReminderSetter.checkAllDone(data);
        const hasDonePostQuiz = !ReminderSetter.hasDonePostQuiz(respHist);
        return { email, data, diffDays, hasDonePostQuiz, hasPostQuizReminder, isAllDone, userName };
    }  /* end of inspectUser */
    public async sendTaskReminders(): Promise<void> {
        const prefix = this.getDatedKey();  // returns yyyy-mm-dd/
        const { blobs } = await this.store.list({ directories: true, prefix });
        // list() returns { blobs: [], directories: [] }
        if (this.verbose) console.log(blobs.map(x=>x.key));
        for (const { key } of blobs) {  // array of { etag, key }
            const userId = ReminderSetter.matchUserId(key);
            if (await this.isOptOut(userId)) continue;  // skip if user has opted out of reminder
            const { email, data, diffDays, hasPostQuizReminder, isAllDone, userName } = await this.inspectUser(userId);
            // 1. send reminder if user has not done all tasks and not opened tasks recently, or
            // 2. send congrats if user has done all tasks and not had a post-quiz reminder
            const sendRmdrFlag: boolean = !isAllDone && diffDays >= this.offset;
            const sendCngrFlag: boolean = isAllDone && !hasPostQuizReminder;
            if (sendCngrFlag || sendRmdrFlag) {
                await this.callEmailEndpoint(email, { userName, data: mapTaskNumberToName(data) });
            }  /* end of checking difference in days between last seen and today */
            // set task reminder if some tasks remain
            if (sendRmdrFlag) await this.setTaskReminder(userId);
            if (sendCngrFlag) await this.setPostQuizReminder(userId,
                Math.floor(this.offset / ReminderSetter.earlyFactor));  // set first post-quiz reminder earlier
            if (this.verbose) {
                const logOutput = { data, diffDays, hasPostQuizReminder, isAllDone, sendRmdrFlag, sendCngrFlag };
                console.log(logOutput);
            }  // end of verbose logging
            await this.deleteBlob(key);
        }  /* end of looping through all blobs that match prefix */
    }  /* end of sendTaskReminders */
    public async sendPostQuizReminders(): Promise<void> {
        const prefix = NfBlobManager.getHierKey({
            basename: this.getDatedKey(),
            prefix: ReminderSetter.postQuizPrfx,
        });  // prefix's format: post-quiz/yyyy-mm-dd/
        const { blobs } = await this.store.list({ directories: true, prefix });
        // list() returns { blobs: [], directories: [] }
        if (this.verbose) console.log(blobs.map(x=>x.key));
        for (const { key } of blobs) {  // array of { etag, key }
            const userId = ReminderSetter.matchUserId(key);
            if (await this.isOptOut(userId)) continue;  // skip if user has opted out of reminder
            const { email, data, hasDonePostQuiz, isAllDone, userName } = await this.inspectUser(userId);
            const sendRmdrFlag: boolean = isAllDone && hasDonePostQuiz;
            if (sendRmdrFlag) {
                await this.callEmailEndpoint(email, { userName, data });
                await this.setPostQuizReminder(userId);  // normal offset
            }  /* end of checking if all tasks are done and post-quiz not done */
            if (this.verbose) {
                const logOutput = { data, hasDonePostQuiz, isAllDone, sendRmdrFlag };
                console.log(logOutput);
            }  // end of verbose logging
            await this.deleteBlob(key);
        }  /* end of looping through all blobs that match prefix */
    }  /* end of sendPostQuizReminders */
    private async callEmailEndpoint(email: string, { userName, data }: { userName: string, data: TaskData }): Promise<void> {
        try {  // call email endpoint
            const payload = JSON.stringify({ email, userName, ...data });
            const opt = { body: '', headers: new Headers(), method: 'POST' };
            opt.body = payload.replace(/`/g, '\`');
            opt.headers.set('content-type', 'application/json');
            opt.headers.set('authorization', this.endpoint.auth);
            const respBody = await fetchData(this.endpoint.url, opt);  // error be caught
            if (this.verbose) { console.log(JSON.stringify(respBody)); }
        } catch(respErr) {
            console.error('Caught:\n', respErr);
        }  /* end of try-catch */
    }  /* end of callEmailEndpoint */
    private async getTaskData(preResponseId: string, userId: string): Promise<TaskData> {
        const storedData = await fetchTaskStatus(preResponseId, userId, { origin: this.siteURL.origin });
        if (storedData && isTaskData(storedData)) {
            return storedData as TaskData;
        } else {  // throw data error
            const dataErr = new Error('Invalid task data for ' + userId.substring(9, 18));
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
