export interface EmailTask {
    subject: string,
    command: string,
    skipReply?: boolean;
}