import {
  fn,
  type Resource,
  type TerraformGenerator,
} from "terraform-generator";
import { tags } from "../tags";
import type { Locals } from "./locals";
import type { Variables } from "./variables";

export type Topics = {
  emails: Resource;
  notifications: Resource;
};

export function defineTopics(
  tfg: TerraformGenerator,
  { vars, locals }: { vars: Variables; locals: Locals }
) {
  return {
    emails: tfg.resource("aws_sns_topic", "emails", {
      name: fn("format", "%s-emails", locals.resourcePrefix),
      tags: tags(vars),
    }),
    notifications: tfg.resource("aws_sns_topic", "notifications", {
      name: fn("format", "%s-notifications", locals.resourcePrefix),
      tags: tags(vars),
    }),
  };
}
