import { type Resource, type TerraformGenerator } from "terraform-generator";
import type { Locals } from "./locals";
import type { Variables } from "./variables";

export function defineBucket(
  tfg: TerraformGenerator,
  { vars, locals }: { vars: Variables; locals: Locals }
): { bucket: Resource } {
  const bucket = tfg.resource("aws_s3_bucket", "emails", {
    bucket: locals.resourcePrefix,
    force_destroy: true,
  });

  return { bucket };
}
