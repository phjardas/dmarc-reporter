import { TerraformGenerator, map } from "terraform-generator";

export function init() {
  const tfg = new TerraformGenerator({
    required_version: ">= 1.6.6",
    required_providers: {
      aws: map({
        source: "hashicorp/aws",
        version: "5.31.0",
      }),
      local: map({
        source: "hashicorp/local",
        version: "2.4.1",
      }),
      archive: map({
        source: "hashicorp/archive",
        version: "2.4.1",
      }),
    },
  });

  tfg.backend("s3", {
    bucket: "phjardas-terraform",
    region: "eu-west-1",
  });

  return tfg;
}
