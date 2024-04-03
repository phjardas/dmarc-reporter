import {
  parseDmarcReportsFromXml,
  type DmarcFeedback,
} from "dmarc-report-parser";
import JSZip from "jszip";
import { simpleParser } from "mailparser";
import { gunzip } from "node:zlib";

export async function parseDmarcReportFromEmail(body: string): Promise<{
  reports: Array<DmarcFeedback>;
  xmlFiles: Array<string | Buffer>;
}> {
  const email = await simpleParser(body);

  const attachments = email.attachments.filter((attachment) => {
    if (attachment.filename) {
      const ext = attachment.filename.split(".").pop();
      return ext && ["zip", "gz", "xml"].includes(ext);
    }
    return false;
  });

  const extractedContents = (
    await Promise.all(
      attachments.map(async (attachment) => {
        if (attachment.filename?.endsWith(".zip")) {
          const zip = new JSZip();
          const contents = await zip.loadAsync(attachment.content);
          return Promise.all(
            Object.values(contents.files).map((file) => file.async("text"))
          );
        } else if (attachment.filename?.endsWith(".gz")) {
          return new Promise<string[]>((resolve, reject) => {
            gunzip(attachment.content as Buffer, (err, data) => {
              if (err) reject(err);
              else resolve([data.toString()]);
            });
          });
        } else if (attachment.filename?.endsWith(".xml")) {
          return [attachment.content];
        }
        return [];
      })
    )
  ).flat();

  const xmlFiles = extractedContents
    .flat()
    .filter(
      (content) => typeof content === "string" && content.startsWith("<?xml")
    );

  if (xmlFiles.length === 0) {
    throw new Error("No DMARC reports found in email");
  }

  const { reports } = await parseDmarcReportsFromXml(xmlFiles);
  return { reports, xmlFiles };
}
