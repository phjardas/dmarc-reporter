import {
  fn,
  type Resource,
  type TerraformGenerator,
} from "terraform-generator";
import { tags } from "../tags";
import { rmap } from "../utils";
import type { Locals } from "./locals";
import type { Variables } from "./variables";

export function defineEmail(
  tfg: TerraformGenerator,
  {
    vars,
    locals,
    bucket,
  }: { vars: Variables; locals: Locals; bucket: Resource }
) {
  const identity = tfg.resource("aws_ses_domain_identity", "domain-identity", {
    domain: vars.domain,
  });

  const topic = tfg.resource("aws_sns_topic", "emails", {
    name: fn("format", "%s-emails", locals.resourcePrefix),
    tags: tags(vars),
  });

  const bucketPolicy = tfg.resource("aws_s3_bucket_policy", "ses-emails", {
    bucket: bucket.attr("id"),
    policy: fn(
      "jsonencode",
      rmap({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "s3:PutObject",
            Principal: { Service: "ses.amazonaws.com" },
            Resource: fn("format", "%s/*", bucket.attr("arn")),
            Condition: { StringEquals: { "AWS:Referer": locals.accountId } },
          },
        ],
      })
    ),
  });

  const topicPolicy = tfg.resource("aws_sns_topic_policy", "ses-emails", {
    arn: topic.attr("arn"),
    policy: fn(
      "jsonencode",
      rmap({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "ses.amazonaws.com" },
            Action: "SNS:Publish",
            Resource: topic.attr("arn"),
            Condition: {
              StringEquals: { "aws:SourceOwner": locals.accountId },
            },
          },
        ],
      })
    ),
  });

  tfg.resource("aws_ses_receipt_rule", "emails", {
    name: locals.resourcePrefix,
    rule_set_name: vars.sesRuleSetName,
    enabled: true,
    recipients: [vars.domain],
    s3_action: [
      {
        bucket_name: bucket.attr("bucket"),
        topic_arn: topic.attr("arn"),
        position: 1,
      },
    ],
    stop_action: [
      {
        scope: "RuleSet",
        position: 2,
      },
    ],
    depends_on: [bucketPolicy, topicPolicy],
  });

  return {
    topic,
    dnsRecords: [
      {
        name: fn("format", "_amazonses.%s", vars.domain),
        type: "TXT",
        ttl: 600,
        value: identity.attr("verification_token"),
      },
      {
        name: vars.domain,
        type: "MX",
        ttl: 3600,
        value: fn("format", "10 inbound-smtp.%s.amazonaws.com", vars.region),
      },
    ],
  };
}
