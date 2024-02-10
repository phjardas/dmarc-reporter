import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoDBStreamEvent } from "aws-lambda";
import { requireEnv } from "../lib/env";
import { memoize } from "../lib/memoize";
import { notEmpty } from "../lib/utils";

export async function handler(event: DynamoDBStreamEvent) {
  const records = event.Records.map((record) => record.dynamodb?.NewImage)
    .filter(notEmpty)
    .map((record) => unmarshall(record as any));

  if (records.length) await sendNotification(records);
}

async function sendNotification(records: Array<Record<string, unknown>>) {
  console.log("Sending notification for %d records", records.length);

  const text = JSON.stringify(records, null, 2);

  await getSNS().send(
    new PublishCommand({
      TopicArn: getTopicArn(),
      Subject: "DMARC Report",
      MessageStructure: "json",
      Message: JSON.stringify({ default: text }),
    })
  );
}

const getSNS = memoize(() => new SNSClient({}));
const getTopicArn = memoize(() =>
  requireEnv("TOPIC_ARN", process.env.TOPIC_ARN)
);
