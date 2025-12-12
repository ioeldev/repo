import { sendEmail } from './send_email';

export const handler = async (event: any) => {
    try {
        console.log(event);
        const { to, subject, text, html } = event;

        await sendEmail({
            to,
            subject,
            text,
            html
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email sent successfully' })
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to send email' })
        };
    }
}; 