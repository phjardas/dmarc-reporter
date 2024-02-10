import { Resource, TerraformGenerator, fn } from "terraform-generator";
import { tags } from "../tags";
import { Locals } from "./locals";
import { Variables } from "./variables";

export type Tables = {
  reports: Table;
};

export const tableNames: ReadonlyArray<keyof Tables> = ["reports"] as const;

export type Table = {
  table: Resource;
};

export function defineTables(
  tfg: TerraformGenerator,
  args: { vars: Variables; locals: Locals }
): Tables {
  return {
    reports: defineTable(
      tfg,
      "reports",
      {
        attribute: [
          { name: "id", type: "S" },
          { name: "date", type: "S" },
        ],
        hash_key: "id",
        range_key: "date",
        stream_enabled: true,
        stream_view_type: "NEW_AND_OLD_IMAGES",
        global_secondary_index: {
          name: "date",
          hash_key: "date",
          range_key: "id",
          projection_type: "ALL",
        },
      },
      args
    ),
  };
}

function defineTable(
  tfg: TerraformGenerator,
  name: string,
  args: any,
  { vars, locals }: { vars: Variables; locals: Locals }
): Table {
  const table = tfg.resource("aws_dynamodb_table", name, {
    name: fn("format", `%s-${name}`, locals.resourcePrefix),
    billing_mode: "PAY_PER_REQUEST",
    ...args,
    tags: tags(vars),
  });

  return { table };
}
