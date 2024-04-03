import { S3Client } from "@aws-sdk/client-s3";
import { memoize } from "./memoize";

export const getS3 = memoize(() => new S3Client({}));
