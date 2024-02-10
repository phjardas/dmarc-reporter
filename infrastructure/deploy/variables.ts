import { TerraformGenerator, Variable, arg } from "terraform-generator";

export type Variables = {
  region: Variable;
  stack: Variable;
  domain: Variable;
  sesRuleSetName: Variable;
};

export function defineVariables(tfg: TerraformGenerator): Variables {
  return {
    region: tfg.variable("region", {
      type: arg("string"),
      default: "eu-west-1",
    }),
    stack: tfg.variable("stack", { type: arg("string"), nullable: false }),
    domain: tfg.variable("domain", { type: arg("string"), nullable: false }),
    sesRuleSetName: tfg.variable("sesRuleSetName", {
      type: arg("string"),
      default: "default",
    }),
  };
}
