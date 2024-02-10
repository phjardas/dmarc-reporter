import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { requireEnv } from "../lib/env";
import { memoize } from "../lib/memoize";

export const getDynamo = memoize(() =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  })
);

export function getDynamoTable(tableName: string) {
  const key = `DYNAMODB_TABLE_${tableName.toUpperCase()}`;
  return requireEnv(key, process.env[key]);
}
