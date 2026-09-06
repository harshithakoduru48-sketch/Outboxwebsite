import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

let transporter: Transporter | null = null;
let testAccount: nodemailer.TestAccount | null = null;

export async function initSmtpTransporter(): Promise<Transporter> {
  if (transporter) {
    return transporter;
  }

  let user = config.ethereal.user;
  let pass = config.ethereal.pass;

  if (!user || !pass) {
    console.log('[SMTP] No Ethereal credentials found in env. Generating temporary test account...');
    testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    console.log(`[SMTP] Created Ethereal Test Account: ${user}`);
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendMailViaSmtp(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const mailer = await initSmtpTransporter();

  const info = await mailer.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
      <h2 style="color: #4F46E5;">ReachInbox Outreach</h2>
      <hr style="border: 0; border-top: 1px solid #E5E7EB; margin-bottom: 20px;" />
      <div style="white-space: pre-wrap;">${options.body}</div>
      <br />
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 30px;">Sent via ReachInbox Email Job Scheduler</p>
    </div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[SMTP] Email sent to ${options.to}. Ethereal Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
