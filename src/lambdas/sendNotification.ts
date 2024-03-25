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

  const results = records
    .map(getResult)
    .reduce(
      (a, b) => ({ ...a, [b]: (a[b] ?? 0) + 1 }),
      {} as Record<Result, number>
    );

  const overallResult: Result = results.fail
    ? "fail"
    : results.pass
      ? "pass"
      : "unknown";

  const text = `
Evaluated ${records.length} records:
- Pass: ${results.pass ?? 0}
- Fail: ${results.fail ?? 0}
- Unknown: ${results.unknown ?? 0}

${JSON.stringify(records, null, 2)}
`.trim();

  await getSNS().send(
    new PublishCommand({
      TopicArn: getTopicArn(),
      Subject: `DMARC Report: ${overallResult}`,
      MessageStructure: "json",
      Message: JSON.stringify({ default: text }),
    })
  );
}

type Result = "pass" | "fail" | "unknown";

function getResult(record: Record<string, unknown>): Result {
  const { policyEvaluated } = record;
  if (!policyEvaluated || typeof policyEvaluated !== "object") return "unknown";

  const { dkim, spf } = policyEvaluated as Record<string, unknown>;
  if (dkim === "pass" || spf === "pass") return "pass";
  if (dkim === "fail" || spf === "fail") return "fail";
  return "unknown";
}

const getSNS = memoize(() => new SNSClient({}));
const getTopicArn = memoize(() =>
  requireEnv("TOPIC_ARN", process.env.TOPIC_ARN)
);
