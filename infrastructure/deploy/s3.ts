import { type Resource, type TerraformGenerator } from "terraform-generator";
import { tags } from "../tags";
import type { Locals } from "./locals";
import type { Variables } from "./variables";

export function defineBucket(
  tfg: TerraformGenerator,
  { vars, locals }: { vars: Variables; locals: Locals }
): { bucket: Resource } {
  const bucket = tfg.resource("aws_s3_bucket", "emails", {
    bucket: locals.resourcePrefix,
    force_destroy: true,
    tags: tags(vars),
  });

  tfg.resource("aws_s3_bucket_versioning", "emails", {
    bucket: bucket.attr("id"),
    versioning_configuration: {
      status: "Enabled",
    },
  });

  tfg.resource("aws_s3_bucket_lifecycle_configuration", "emails", {
    bucket: bucket.attr("id"),
    rule: {
      id: "expire",
      status: "Enabled",
      expiration: {
        days: 30,
      },
    },
  });

  return { bucket };
}
