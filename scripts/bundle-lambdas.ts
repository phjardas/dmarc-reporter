import {
  GetObjectAttributesCommand,
  ListObjectVersionsCommand,
  ObjectAttributes,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { exec } from "child_process";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { readdir, writeFile } from "fs/promises";

const dist = "dist";

export async function main(region?: string, codeBucket?: string) {
  if (!region || !codeBucket)
    throw new Error("Usage: bundle-lambdas <aws-region> <code-bucket>");

  const s3 = new S3Client({ region });
  const files = await readdir(dist);
  const lambdaFiles = files.filter((f) => f.endsWith(".js"));
  console.log(`Bundling ${lambdaFiles.length} lambdas...`);

  const versions = Object.fromEntries(
    await Promise.all(
      lambdaFiles.map(
        async (file): Promise<[string, Handler]> => [
          file.replace(/\.js$/, ""),
          await uploadLambda(file, codeBucket, s3),
        ]
      )
    )
  );

  await writeHandlers(versions);
}

async function uploadLambda(
  file: string,
  codeBucket: string,
  s3: S3Client
): Promise<Handler> {
  const zipFile = await bundleLambda(file);
  const hash = await hashFile(`${dist}/${zipFile}`);
  const key = zipFile.replace(/\.zip$/, `-${hash}.zip`);

  try {
    const attributes = await s3.send(
      new GetObjectAttributesCommand({
        Bucket: codeBucket,
        Key: key,
        ObjectAttributes: [ObjectAttributes.ETAG],
      })
    );

    if (attributes.ETag === hash) {
      const versions = await s3.send(
        new ListObjectVersionsCommand({
          Bucket: codeBucket,
          Prefix: key,
          MaxKeys: 1,
        })
      );

      const version = versions.Versions?.[0]?.VersionId;

      if (version) {
        console.error(
          "Skipping: %s (hash: %s, version: %s)",
          zipFile,
          hash,
          attributes.VersionId
        );
        return { bucket: codeBucket, key, version };
      }
    }
  } catch (error) {
    // ignore
  }

  console.error("Uploading: %s", key);

  const result = await s3.send(
    new PutObjectCommand({
      Bucket: codeBucket,
      Key: key,
      Body: createReadStream(`${dist}/${zipFile}`),
    })
  );

  const version = result.VersionId;
  console.error("Uploaded: %s (hash: %s, version: %s)", zipFile, hash, version);
  return { bucket: codeBucket, key, version };
}

async function hashFile(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    const stream = createReadStream(filename);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function bundleLambda(file: string) {
  const zipFile = file.replace(/\.js$/, ".zip");
  console.error("Bundling: %s", zipFile);

  await new Promise<void>((resolve, reject) => {
    exec(["zip", zipFile, file].join(" "), { cwd: dist }, (err) =>
      err ? reject(err) : resolve()
    );
  });

  return zipFile;
}

async function writeHandlers(versions: Record<string, Handler>) {
  await writeFile(
    `${dist}/lambda-handlers.json`,
    JSON.stringify(versions, null, 2),
    "utf-8"
  );
}

type Handler = {
  bucket: string;
  key: string;
  version?: string;
};

const [region, codeBucket] = process.argv.slice(2);
main(region, codeBucket).catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
