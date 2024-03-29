import {
  fn,
  type Argument,
  type TerraformGenerator,
} from "terraform-generator";
import { project } from "../config";
import type { Variables } from "./variables";

export type Locals = {
  resourcePrefix: Argument;
  accountId: Argument;
  lambdaSources: Argument;
};

export function defineLocals(
  tfg: TerraformGenerator,
  { vars }: { vars: Variables }
): Locals {
  const id = tfg.data("aws_caller_identity", "current", {});

  const locals = tfg.locals({
    resourcePrefix: fn("format", "%s-%s", project, vars.stack),
    accountId: id.attr("account_id"),
    lambdaSources: fn(
      "jsondecode",
      fn("file", "../../dist/lambda-handlers.json")
    ),
  });

  return {
    resourcePrefix: locals.arg("resourcePrefix"),
    accountId: locals.arg("accountId"),
    lambdaSources: locals.arg("lambdaSources"),
  };
}
