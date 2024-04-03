import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { type DmarcFeedback } from "dmarc-report-parser";
import { type Logger } from "pino";
import { getDynamo, getDynamoTable } from "../lib/dynamodb";
import { parseDmarcReportFromEmail } from "./email";

export async function handleEmail(
  body: string,
  logger: Logger
): Promise<{ xmlFiles: Array<string | Buffer> }> {
  const { reports, xmlFiles } = await parseDmarcReportFromEmail(body);

  await Promise.all(
    reports.map((report) =>
      handleReport(
        report,
        logger.child({
          reportId: report.reportMetadata?.reportId,
          orgName: report.reportMetadata?.orgName,
        })
      )
    )
  );

  return { xmlFiles };
}

async function handleReport(report: DmarcFeedback, logger: Logger) {
  logger.info("Handling DMARC report");

  await Promise.all(
    report.record.map(async (record) => {
      const data = transformRecord(report, record, logger);

      if (data) {
        logger.info({ id: data.id }, "Saving DMARC record.");

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
  logger: Logger
) {
  if (!reportMetadata) {
    logger.error("No report metadata found, skipping");
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
