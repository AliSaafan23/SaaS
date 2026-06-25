import nodemailer from 'nodemailer';

const getSmtpConfig = () => ({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const isSmtpConfigured = () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => {
    if (!isSmtpConfigured()) return null;
    return nodemailer.createTransport(getSmtpConfig());
};

const getFromAddress = () =>
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@pos.local';

export const sendMail = async ({ to, subject, text, html }) => {
    if (!isSmtpConfigured()) {
        if (process.env.TESTING === 'true' || process.env.NODE_ENV === 'development') {
            console.log(`[MAIL-DEV] To: ${to} | Subject: ${subject} | Body: ${text}`);
            return { dev: true };
        }
        throw new Error('SMTP is not configured');
    }

    const transporter = createTransporter();
    return transporter.sendMail({
        from: getFromAddress(),
        to,
        subject,
        text,
        html: html || text,
    });
};

export const sendActivationCode = async (email, code, lang = 'ar') => {
    const subject = lang === 'ar' ? 'كود تفعيل البريد الإلكتروني' : 'Email verification code';
    const text =
        lang === 'ar'
            ? `كود تفعيل بريدك: ${code}\nصالح لمدة ${process.env.SMTP_CODE_EXPIRY_MINUTES || 15} دقيقة.`
            : `Your email verification code: ${code}\nValid for ${process.env.SMTP_CODE_EXPIRY_MINUTES || 15} minutes.`;

    return sendMail({ to: email, subject, text });
};

export const sendResetCode = async (email, code, lang = 'ar') => {
    const subject = lang === 'ar' ? 'كود إعادة تعيين كلمة السر' : 'Password reset code';
    const text =
        lang === 'ar'
            ? `كود إعادة التعيين: ${code}\nصالح لمدة ${process.env.SMTP_CODE_EXPIRY_MINUTES || 15} دقيقة.`
            : `Your reset code: ${code}\nValid for ${process.env.SMTP_CODE_EXPIRY_MINUTES || 15} minutes.`;

    return sendMail({ to: email, subject, text });
};

export const generateVerificationCode = () =>
    String(Math.floor(100000 + Math.random() * 900000));

export const getCodeExpiryDate = () => {
    const minutes = parseInt(process.env.SMTP_CODE_EXPIRY_MINUTES, 10) || 15;
    return new Date(Date.now() + minutes * 60 * 1000);
};

export default {
    sendMail,
    sendActivationCode,
    sendResetCode,
    generateVerificationCode,
    getCodeExpiryDate,
    isSmtpConfigured,
};
