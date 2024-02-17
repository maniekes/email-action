// copy this file as config.ts
import Connection from "imap";
import {EmailTask} from "./emailTask";
export const imapConfig: Connection.Config = {
    user: 'test@test.pl',
    password: '1234567890',
    host: 'host.domain.pl',
    port: 993,
    tls: true,
};

export const VALID_SENDERS = ['lol@lol.pl'];

export const TASKS: EmailTask[] = [{subject: "start something", command: "echo dupa;"}];