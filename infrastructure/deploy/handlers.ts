import { type TerraformGenerator } from "terraform-generator";
import type { Tables } from "./db";
import { LambdaFactory } from "./lambda";
import type { Locals } from "./locals";
import type { Topics } from "./sns";
import type { Variables } from "./variables";

export function defineHandlers(
  tfg: TerraformGenerator,
  args: {
    vars: Variables;
    locals: Locals;
    lambda: LambdaFactory;
    topics: Topics;
    tables: Tables;
  }
) {
  defineHandleEmail(tfg, args);
  defineSendNotification(tfg, args);
}

function defineHandleEmail(
  tfg: TerraformGenerator,
  {
    vars,
    locals,
    lambda,
    topics,
  }: {
    vars: Variables;
    locals: Locals;
    lambda: LambdaFactory;
    topics: Topics;
  }
) {
  const name = "handleEmail";
  const handler = lambda.defineLambda(name);

  const permission = tfg.resource("aws_lambda_permission", `${name}-sns`, {
    action: "lambda:InvokeFunction",
    function_name: handler.attr("function_name"),
    principal: "sns.amazonaws.com",
    source_arn: topics.emails.attr("arn"),
  });

  tfg.resource("aws_sns_topic_subscription", name, {
    topic_arn: topics.emails.attr("arn"),
    protocol: "lambda",
    endpoint: handler.attr("arn"),
    depends_on: [permission],
  });
}

function defineSendNotification(
  tfg: TerraformGenerator,
  {
    vars,
    locals,
    lambda,
    tables,
    topics,
  }: {
    vars: Variables;
    locals: Locals;
    lambda: LambdaFactory;
    tables: Tables;
    topics: Topics;
  }
) {
  const name = "sendNotification";
  const handler = lambda.defineLambda(name, {
    environment: {
      TOPIC_ARN: topics.notifications.attr("arn"),
    },
  });

  const permission = tfg.resource("aws_lambda_permission", `${name}-dynamodb`, {
    action: "lambda:InvokeFunction",
    function_name: handler.attr("function_name"),
    principal: "dynamodb.amazonaws.com",
    source_arn: topics.emails.attr("arn"),
  });

  tfg.resource("aws_lambda_event_source_mapping", name, {
    event_source_arn: tables.reports.table.attr("stream_arn"),
    function_name: handler.attr("arn"),
    starting_position: "LATEST",
    depends_on: [permission],
  });
}
