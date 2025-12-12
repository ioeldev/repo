import { createEmailTransporter } from "../shared/email";

interface EmailOptions {
    to?: string;
    subject: string;
    text?: string;
    html?: string;
  }
  
  export async function sendEmail({
    to,
    subject,
    text,
    html,
  }: EmailOptions): Promise<void> {
    try {
      if (
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS ||
        !process.env.EMAIL_FROM_ADDRESS
      ) {
        throw new Error("Email credentials are not set");
      }
      
      const transporter = createEmailTransporter();
    
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM_ADDRESS,
        to,
        subject,
        text,
        html,
      });
      console.log("Email sent:", info);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
  