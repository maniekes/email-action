import {simpleParser} from 'mailparser';
import Imap from 'imap';
import {Readable} from 'stream';
import {IMAP_CONFIG, TASKS, SMTP_CONFIG, VALID_SENDERS, CHECK_INTERVAL} from "./config";
import {exec} from "child_process";
import nodemailer from 'nodemailer';

require('log-timestamp');
const imap = new Imap(IMAP_CONFIG);
const transporter = nodemailer.createTransport(SMTP_CONFIG);

function executeCommand(command: string, email: string, subject: string, uid: number) {
    exec(command, (error, stdout, stderr) => {
        let response = stdout;
        if (error) {
            response = `Error executing command: ${stderr}`;
        }
        console.log(`sending response ${response} to ${email}`);
        sendReply(email, subject, response);
    });
}

function markAsRead(uid: number) {
    imap.addFlags(uid, '\\Seen', (err) => {
        if (err) {
            console.log(`Error marking message as seen: ${err}`);
        } else {
            console.log(`Message marked as seen: UID ${uid}`);
        }
    });
}

function sendReply(to: string, subject: string, message: string) {
    const mailOptions = {
        from: IMAP_CONFIG.user,
        to,
        subject: `Re: ${subject}`,
        text: message,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(`Error sending reply: ${error}`);
        } else {
            console.log(`Reply sent: ${info.response}`);
        }
    });
}

function openInbox(cb: (err: Error, mailbox: Imap.Box) => void) {
    imap.openBox('INBOX', false, cb);
}

function checkEmails() {
    openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN'], (err, results) => {
            if (err) throw err;
            if (results.length === 0) {
                console.log('No new emails.');
                return;
            }
            const f = imap.fetch(results, {bodies: ''});
            f.on('message', msg => {
                let uid: number;
                msg.once('attributes', (attrs) => {
                    uid = attrs.uid; // Capture the UID of the message
                });
                msg.on('body', stream => {
                    simpleParser(stream as unknown as Readable, async (err, mail) => {
                        if (err) {
                            console.error('Error parsing mail:', err);
                            markAsRead(uid);
                            return;
                        }
                        // Process email here
                        console.log(`Email from: ${mail.from?.text}, Subject: ${mail.subject}`);
                        const senderEmail = mail.from?.value[0].address;
                        if (!senderEmail || !mail.subject) {
                            console.error('missing address or subject:', mail);
                            markAsRead(uid);
                            return;
                        }
                        if (!VALID_SENDERS.includes(senderEmail)) {
                            console.log(`Email from ${senderEmail} is not a valid sender.`);
                            markAsRead(uid);
                            return;
                        }
                        // Add your conditions and script executions here
                        const task = TASKS.find(task => task.subject === mail.subject);
                        if (task) {
                            console.log('executing!')
                            let replyTo = task.replyTo ? task.replyTo : senderEmail;
                            executeCommand(task.command(mail.text), replyTo, mail.subject, uid);
                        }
                        markAsRead(uid);
                    });
                });
            });
            f.once('error', err => {
                console.log('Fetch error: ' + err);
            });
            f.once('end', () => {
                console.log('Done fetching all messages!');
            });
        });
    });
}

imap.once('ready', () => {
    console.log('Connected to IMAP server. Listening for new emails...');
    checkEmails(); // Check emails on startup
    setInterval(checkEmails, CHECK_INTERVAL); // Check emails every 5 minutes
});

imap.on('error', (err: any) => {
    console.error('IMAP error:', err);
    imap.connect();
});

imap.once('end', () => {
    console.log('IMAP connection ended');
});

imap.connect();