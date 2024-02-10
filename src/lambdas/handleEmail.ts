import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SESMessage, SNSEvent, SNSEventRecord } from "aws-lambda";
import { type Readable } from "stream";
import { streamToString } from "../lib/stream";

export async function handler(event: SNSEvent) {
  await Promise.all(event.Records.map(handleRecord));
}

async function handleRecord(record: SNSEventRecord) {
  try {
    console.log("Handling SNS message %s", record.Sns.MessageId);
    const message: SESMessage = JSON.parse(record.Sns.Message);
    await handleMail(message);
  } catch (error: unknown) {
    console.error("Error handling SNS record %s:", record.Sns.MessageId, error);
  }
}

async function handleMail({
  mail: { messageId },
  receipt: { action },
}: SESMessage) {
  try {
    if (action.type !== "S3") {
      throw new Error(`Ignoring non-S3 action ${action.type}`);
    }

    console.log(
      "[%s] Loading content of mail from S3 at %s/%s",
      messageId,
      action.bucketName,
      action.objectKey
    );

    const result = await new S3Client({}).send(
      new GetObjectCommand({
        Bucket: action.bucketName,
        Key: action.objectKey,
      })
    );

    if (!result.Body) {
      throw new Error(
        `S3 object not found: ${action.bucketName}/${action.objectKey}`
      );
    }

    const body = await streamToString(result.Body as Readable);
    await handleEmail(messageId, body);
  } catch (error: unknown) {
    console.error("[%s] Error handling message:", error);
  }
}

async function handleEmail(messageId: string, body: string) {
  console.log("[%s] Handling email: %s", messageId, body);
}
