import { init } from "../terraform";
import { rmap } from "../utils";
import { defineTables } from "./db";
import { defineEmail } from "./email";
import { defineHandlers } from "./handlers";
import { LambdaFactory } from "./lambda";
import { defineLocals } from "./locals";
import { defineBucket } from "./s3";
import { defineTopics } from "./sns";
import { defineVariables } from "./variables";

const tfg = init();

const vars = defineVariables(tfg);
const locals = defineLocals(tfg, { vars });

const { bucket } = defineBucket(tfg, { vars, locals });
const topics = defineTopics(tfg, { vars, locals });
const tables = defineTables(tfg, { vars, locals });
const { dnsRecords } = defineEmail(tfg, { vars, locals, bucket, topics });

const lambda = new LambdaFactory(tfg, { vars, locals, bucket, tables, topics });
defineHandlers(tfg, { vars, locals, lambda, tables, topics });

tfg.provider("aws", { region: vars.region });

tfg.output("dnsRecords", { value: rmap(dnsRecords) });

tfg.write({ dir: __dirname, format: true });
