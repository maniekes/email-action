import { simpleParser, ParsedMail } from 'mailparser';
import Imap from 'imap';
import { Readable } from 'stream';

const imap = new Imap({
    user: 'your_email@example.com',
    password: 'your_password',
    host: 'imap.example.com',
    port: 993,
    tls: true,
});

function openInbox(cb: (err: Error, mailbox: Imap.Box) => void) {
    imap.openBox('INBOX', true, cb);
}

imap.once('ready', () => {
    openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN'], (err, results) => {
            if (err || !results.length) throw err;
            const f = imap.fetch(results, { bodies: '' });
            f.on('message', (msg) => {
                msg.on('body', (stream) => {
                    simpleParser(stream as unknown as Readable, (err: Error, mail: ParsedMail) => {
                        if (err) throw err;
                        console.log(`Subject: ${mail.subject}`);
                        // Your logic here
                    });
                });
            });
            f.once('end', () => {
                console.log('Done fetching all messages!');
                imap.end();
            });
        });
    });
});

imap.once('error', (err: string) => {
    console.log('Error: ' + err);
});

imap.connect();
