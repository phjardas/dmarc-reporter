import { type Resource, type TerraformGenerator } from "terraform-generator";
import { LambdaFactory } from "./lambda";
import type { Locals } from "./locals";
import type { Variables } from "./variables";

export function defineHandlers(
  tfg: TerraformGenerator,
  args: {
    vars: Variables;
    locals: Locals;
    lambda: LambdaFactory;
    topic: Resource;
  }
) {
  definehandleEmail(tfg, args);
}

function definehandleEmail(
  tfg: TerraformGenerator,
  {
    vars,
    locals,
    lambda,
    topic,
  }: { vars: Variables; locals: Locals; lambda: LambdaFactory; topic: Resource }
) {
  const name = "handleEmail";
  const handler = lambda.defineLambda(name);

  const permission = tfg.resource("aws_lambda_permission", `${name}-sns`, {
    action: "lambda:InvokeFunction",
    function_name: handler.attr("function_name"),
    principal: "sns.amazonaws.com",
    source_arn: topic.attr("arn"),
  });

  tfg.resource("aws_sns_topic_subscription", name, {
    topic_arn: topic.attr("arn"),
    protocol: "lambda",
    endpoint: handler.attr("arn"),
    depends_on: [permission],
  });
}
