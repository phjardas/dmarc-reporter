import {
  fn,
  map,
  type Resource,
  type TerraformArgs,
  type TerraformGenerator,
} from "terraform-generator";
import { tags } from "../tags";
import type { Tables } from "./db";
import type { Locals } from "./locals";
import type { Topics } from "./sns";
import type { Variables } from "./variables";

export type LambdaArgs = {
  environment?: Record<string, any>;
  timeout?: number;
  memory_size?: number;
} & TerraformArgs;

export class LambdaFactory {
  private readonly vars: Variables;
  private readonly locals: Locals;
  private readonly role: Resource;
  private readonly environment: Record<string, any>;

  constructor(
    private readonly tfg: TerraformGenerator,
    {
      vars,
      locals,
      bucket,
      tables,
      topics,
    }: {
      vars: Variables;
      locals: Locals;
      bucket: Resource;
      tables: Tables;
      topics: Topics;
    }
  ) {
    this.vars = vars;
    this.locals = locals;
    this.role = this.defineRole({ bucket, tables, topics });

    this.environment = {
      NODE_ENV: "production",
      STAGE: vars.stack,
      TZ: "Europe/Berlin",
      ...Object.fromEntries(
        Object.entries(tables).map(([name, table]) => [
          `DYNAMODB_TABLE_${name.toUpperCase()}`,
          table.table.attr("name"),
        ])
      ),
    };
  }

  private defineRole({
    bucket,
    tables,
    topics,
  }: {
    bucket: Resource;
    tables: Tables;
    topics: Topics;
  }) {
    const role = this.tfg.resource("aws_iam_role", "lambda", {
      name: fn("format", "%s-lambda", this.locals.resourcePrefix),
      assume_role_policy: fn(
        "jsonencode",
        map({
          Version: "2012-10-17",
          Statement: [
            map({
              Action: ["sts:AssumeRole"],
              Effect: "Allow",
              Principal: map({ Service: "lambda.amazonaws.com" }),
            }),
          ],
        })
      ),
      tags: tags(this.vars),
    });

    this.tfg.resource("aws_iam_role_policy_attachment", "lambda_execution", {
      role: role.attr("name"),
      policy_arn:
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    });

    const s3Policy = this.tfg.resource("aws_iam_policy", "lambda_s3", {
      name: fn("format", "%s-lambda-s3", this.locals.resourcePrefix),
      policy: fn(
        "jsonencode",
        map({
          Version: "2012-10-17",
          Statement: [
            map({
              Action: ["s3:GetObject"],
              Effect: "Allow",
              Resource: fn("format", "%s/*", bucket.attr("arn")),
            }),
          ],
        })
      ),
    });

    this.tfg.resource("aws_iam_role_policy_attachment", "lambda_s3", {
      role: role.attr("name"),
      policy_arn: s3Policy.attr("arn"),
    });

    const dynamodbPolicy = this.tfg.resource(
      "aws_iam_policy",
      "lambda_dynamodb",
      {
        name: fn("format", "%s-lambda-dynamodb", this.locals.resourcePrefix),
        policy: fn(
          "jsonencode",
          map({
            Version: "2012-10-17",
            Statement: [
              map({
                Action: ["dynamodb:*"],
                Effect: "Allow",
                Resource: Object.values(tables).flatMap(({ table }) => [
                  table.attr("arn"),
                  table.attr("stream_arn"),
                  fn("format", "%s/index/*", table.attr("arn")),
                ]),
              }),
            ],
          })
        ),
      }
    );

    this.tfg.resource("aws_iam_role_policy_attachment", "lambda_dynamodb", {
      role: role.attr("name"),
      policy_arn: dynamodbPolicy.attr("arn"),
    });

    const snsPolicy = this.tfg.resource("aws_iam_policy", "lambda_sns", {
      name: fn("format", "%s-lambda-sns", this.locals.resourcePrefix),
      policy: fn(
        "jsonencode",
        map({
          Version: "2012-10-17",
          Statement: [
            map({
              Action: ["sns:Publish"],
              Effect: "Allow",
              Resource: Object.values(topics).map((topic) => topic.attr("arn")),
            }),
          ],
        })
      ),
    });

    this.tfg.resource("aws_iam_role_policy_attachment", "lambda_sns", {
      role: role.attr("name"),
      policy_arn: snsPolicy.attr("arn"),
    });

    return role;
  }

  defineLambda(
    name: string,
    { environment, timeout = 10, ...args }: LambdaArgs = {}
  ) {
    // TODO code signing

    const logGroup = this.tfg.resource("aws_cloudwatch_log_group", name, {
      name: fn("format", `/aws/lambda/%s-${name}`, this.locals.resourcePrefix),
      retention_in_days: 90,
      tags: tags(this.vars),
    });

    return this.tfg.resource("aws_lambda_function", name, {
      function_name: fn("format", `%s-${name}`, this.locals.resourcePrefix),
      role: this.role.attr("arn"),
      handler: `${name}.handler`,
      runtime: "nodejs20.x",
      s3_bucket: this.locals.lambdaSources.attr(name).attr("bucket"),
      s3_key: this.locals.lambdaSources.attr(name).attr("key"),
      s3_object_version: this.locals.lambdaSources.attr(name).attr("version"),
      timeout,
      ...args,
      environment: {
        variables: map({
          ...this.environment,
          ...environment,
        }),
      },
      tags: tags(this.vars),
      depends_on: [...(args.depends_on ?? []), logGroup],
    });
  }
}
