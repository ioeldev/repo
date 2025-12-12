import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient();

interface EmailOptions {
  to?: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function invokeEmailSender(emailOptions: EmailOptions): Promise<void> {
  try {
    console.log("Invoking email sender lambda", emailOptions);
    
    const command = new InvokeCommand({
      FunctionName: `${process.env.SERVERLESS_SERVICE}-${process.env.STAGE}-emailSender`,
      InvocationType: 'Event', // This makes it asynchronous
      Payload: JSON.stringify(emailOptions),
    });

    await lambda.send(command);
  } catch (error) {
    console.error('Error invoking email sender lambda:', error);
  }
} 