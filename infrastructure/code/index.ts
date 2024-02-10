import { arg, fn } from "terraform-generator";
import { project } from "../config";
import { tags } from "../tags";
import { init } from "../terraform";

const tfg = init();

const region = tfg.variable("region", {
  type: arg("string"),
  default: "eu-west-1",
});
const stack = tfg.variable("stack", { type: arg("string"), nullable: false });
const resourcePrefix = fn("format", "%s-%s", project, stack);

tfg.provider("aws", { region });

const bucket = tfg.resource("aws_s3_bucket", "code", {
  bucket: fn("format", `%s-code`, resourcePrefix),
  force_destroy: true,
  tags: tags({ stack }),
});

tfg.resource("aws_s3_bucket_versioning", "code", {
  bucket: bucket.attr("id"),
  versioning_configuration: {
    status: "Enabled",
  },
});

tfg.output("codeBucket", { value: bucket.attr("bucket") });
tfg.output("codeBucketRegion", { value: bucket.attr("region") });

tfg.write({ dir: __dirname, format: true });
