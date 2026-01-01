import * as nodemailer from 'nodemailer';

export interface EmailAdapter {
    sendActivationEmail(email: string, token: string): Promise<void>;
    sendRecoveryEmail(email: string, token: string): Promise<void>;
}

export class NodemailerEmailAdapter implements EmailAdapter {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
            port: parseInt(process.env.MAILTRAP_PORT || '2525'),
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS,
            },
        });
    }

    async sendActivationEmail(email: string, token: string): Promise<void> {
        const mailOptions = {
            from: process.env.MAIL_FROM || 'noreply@elearning.com',
            to: email,
            subject: 'Activate Your Account',
            html: `
        <p>Click the link below to activate your account:</p>
        <a href="${process.env.FRONTEND_URL}/activate?token=${token}">Activate Account</a>
        <p>This link expires in 24 hours.</p>
      `,
        };

        await this.transporter.sendMail(mailOptions);
    }

    async sendRecoveryEmail(email: string, token: string): Promise<void> {
        const mailOptions = {
            from: process.env.MAIL_FROM || 'noreply@elearning.com',
            to: email,
            subject: 'Reset Your Password',
            html: `
        <p>Click the link below to reset your password:</p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
        <p>This link expires in 24 hours.</p>
      `,
        };

        await this.transporter.sendMail(mailOptions);
    }
}
