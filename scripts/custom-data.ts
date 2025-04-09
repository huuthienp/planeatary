import type { QualtricsPayload } from './custom-http.ts';
import { extractTaskData } from './helpers.mjs';
import masterData from '../updated_tasks_final.json' with { type: 'json' };


interface TaskData {
    chosen: Array<string>;
    done: Array<string>;
    pending: Array<string>;
    time: Array<null|string>;
}  /* end of TaskData */


interface ImportedTaskData {
    id: string;
    chosen: Array<string>;
    userId?: string
}  /* end of ImportedTaskData */


interface QTaskPayload extends QualtricsPayload {
    result: ImportedTaskData;
}  /* end of QTaskPayload */


interface QuizResponseCycle {
    preId: string;
    lastTask: string | undefined;
    postId: string | undefined;
}  /* end of QuizResponseCycle */


function isTaskData(data: unknown): data is TaskData {
    if (typeof data !== 'object' || data === null) { return false; }
    const { chosen, done, pending, time } = data as TaskData;
    return (
        Array.isArray(chosen) &&
        Array.isArray(done) &&
        Array.isArray(pending) &&
        Array.isArray(time) &&
        chosen.every(item => typeof item === 'string') &&
        done.every(item => typeof item === 'string') &&
        pending.every(item => typeof item === 'string') &&
        time.every(item => item === null || typeof item === 'string')
    );
}  /* end of isTaskData */


function isImportedTaskData(data: unknown): data is ImportedTaskData {
    if (typeof data !== 'object' || data === null) { return false; }
    const { id, chosen } = data as ImportedTaskData;
    return (
        typeof id === 'string' &&
        Array.isArray(chosen) &&
        chosen.every(item => typeof item === 'string')
    );
}  /* end of isImportedTaskData */


function mapTaskNumberToName(taskData: TaskData, props: Array<string> = ['done', 'pending']): TaskData {
    /** taskNumber format: txxyy (string type)
     * t is a literal and short for "task"
     * xx is question number with leading zero: 01-12 (t1213)
     * yy is task number per question with leading zero: 01-22 (t1022) */
    const matchName = (taskNumber: string) => {
        for (const entry of masterData[Number(taskNumber.substring(1, 3))].tasks) {
            if (taskNumber === entry.taskNumber)
                return entry.taskName;
        }  /* end of looping through tasks of related question */
        return '404';
    }  /* end of matchName */
    for (const prop of props) taskData[prop] = taskData[prop].map(matchName);
    return taskData;
}  /* end of mapTaskNumberToName */


export { TaskData, ImportedTaskData, QTaskPayload, QuizResponseCycle };
export { isTaskData, isImportedTaskData, mapTaskNumberToName };
