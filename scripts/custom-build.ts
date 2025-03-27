export {};

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ADMIN_UUID: string;
            CLIENT_TZ: string;
            HASH_SALT_ROUNDS: string;
            ID_PREFIX: string;
            ID_PREFIX_LENGTH: string;
            KEY_SIZE_BYTE: string;
            POST_QUIZ_ID: string;
            POST_QUIZ_REMINDER_ENDPOINT: string;
            POST_QUIZ_REMINDER_OFFSET_DAYS: string;
            PRE_QUIZ_ID: string;
            Q_API_TOKEN: string;
            QC_ID: string;
            QC_SECRET: string;
            QDC_ID: string;
            RECOVERY_EMAIL_EVENT: string;
            RECOVERY_TOKEN_SPECS: string;
            REMINDER_STORE_ID: string;
            SECRET_AUTH_HEADER: string;
            TASK_CONGRATS_OFFSET_DAYS: string;
            TASK_REMINDER_ENDPOINT: string;
            TASK_REMINDER_OFFSET_DAYS: string;
            TASKS_IDP_ID: string;
        }
    }
}
