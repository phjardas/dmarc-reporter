import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { SESMessage, SNSEvent, SNSEventRecord } from "aws-lambda";
import pino, { type Logger } from "pino";
import { type Readable } from "stream";
import { getS3 } from "../lib/s3";
import { streamToString } from "../lib/stream";
import { handleEmail } from "../service/handleEmails";

const logger = pino({ name: "handleEmail", level: "info" });

export async function handler(event: SNSEvent) {
  await Promise.all(
    event.Records.map((record) =>
      handleRecord(record, logger.child({ messageId: record.Sns.MessageId }))
    )
  );
}

async function handleRecord(record: SNSEventRecord, logger: Logger) {
  try {
    logger.info("Handling SNS message");
    const message: SESMessage = JSON.parse(record.Sns.Message);
    await handleMail(message, logger);
  } catch (error: unknown) {
    logger.error({ error, record }, "Error handling SNS record");
  }
}

async function handleMail(
  { mail: { messageId }, receipt: { action } }: SESMessage,
  logger: Logger
) {
  if (action.type !== "S3") {
    throw new Error(`Ignoring non-S3 action ${action.type}`);
  }

  logger.info(
    { s3: { bucket: action.bucketName, key: action.objectKey } },
    "Loading content of mail"
  );

  const s3 = getS3();

  const result = await s3.send(
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
  const { xmlFiles } = await handleEmail(body, logger);
  const prefix = `reports/${new Date().toISOString()}_${messageId}_`;

  logger.info(
    { s3: { bucket: action.bucketName, prefix } },
    "Storing XML reports in S3"
  );

  await Promise.all(
    xmlFiles.map((xmlFile, i) =>
      s3.send(
        new PutObjectCommand({
          Bucket: action.bucketName,
          Key: `${prefix}${i}.xml`,
          Body: xmlFile,
        })
      )
    )
  );
}
