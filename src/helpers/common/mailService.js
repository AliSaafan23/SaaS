import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST) return null;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return transporter;
};

export const sendActivationEmail = async ({ to, name, code }) => {
    const subject = 'رمز تفعيل حسابك | Account activation code';
    const text = `مرحباً ${name},\n\nرمز التفعيل: ${code}\nصالح لمدة 24 ساعة.\n\nHello ${name},\nYour activation code: ${code}\nValid for 24 hours.`;

    const transport = getTransporter();
    if (!transport) {
        console.log(`[mail:dev] Activation code for ${to}: ${code}`);
        return;
    }

    await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
    });
};

export default { sendActivationEmail };
