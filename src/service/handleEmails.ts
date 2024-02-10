import { PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  parseDmarcReportFromEmail,
  type DmarcFeedback,
} from "dmarc-report-parser";
import { getDynamo, getDynamoTable } from "../lib/dynamodb";

export async function handleEmail(messageId: string, body: string) {
  const logPrefix = `[${messageId}]`;
  console.log("%s Handling email: %s", logPrefix, body);
  const { reports } = await parseDmarcReportFromEmail(body);
  await Promise.all(reports.map((report) => handleReport(report, logPrefix)));
}

async function handleReport(report: DmarcFeedback, logPrefix: string) {
  console.log(
    "%s Handling DMARC report: %s",
    logPrefix,
    JSON.stringify(report, null, 2)
  );

  await Promise.all(
    report.record.map(async (record) => {
      const data = transformRecord(report, record, logPrefix);

      if (data) {
        console.log(
          "%s Saving DMARC record: %s",
          logPrefix,
          JSON.stringify(data, null, 2)
        );

        await getDynamo().send(
          new PutCommand({
            TableName: getDynamoTable("reports"),
            Item: data,
          })
        );
      }
    })
  );
}

function transformRecord(
  { reportMetadata, policyPublished }: Omit<DmarcFeedback, "record">,
  {
    row,
    identifiers,
    authResults: { spf, dkim },
  }: DmarcFeedback["record"][number],
  logPrefix: string
) {
  if (!reportMetadata) {
    console.error("%s No report metadata found, skipping", logPrefix);
    return;
  }

  return {
    ...row,
    ...reportMetadata,
    id: `${reportMetadata.orgName}#${reportMetadata.reportId}#${row.sourceIp}`,
    date: new Date(reportMetadata.dateRange.begin * 1000)
      .toISOString()
      .substring(0, 10),
    policyPublished,
    identifiers,
    authResults: {
      spf: Object.fromEntries(spf.map(({ domain, ...d }) => [domain, d])),
      dkim: dkim
        ? Object.fromEntries(dkim.map(({ domain, ...d }) => [domain, d]))
        : undefined,
    },
  };
}
