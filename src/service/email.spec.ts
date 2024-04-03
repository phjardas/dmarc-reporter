import assert from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";
import { parseDmarcReportFromEmail } from "./email";

describe("email", async () => {
  const files = await readdir("test-data");
  files.forEach(testFile);
});

function testFile(file: string) {
  it(`should parse ${file}`, async () => {
    const body = await readFile(`test-data/${file}`, "utf-8");
    const { reports, xmlFiles } = await parseDmarcReportFromEmail(body);

    assert(reports.length > 0);
    assert(xmlFiles.length > 0);

    // TODO more intelligent tests
  });
}
