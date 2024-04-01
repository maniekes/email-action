export interface EmailTask {
    subject: string,
    command: (text: string | undefined) => string,
    skipReply?: boolean;
    replyTo?: string;
}