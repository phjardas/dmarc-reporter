import { init } from "../terraform";
import { rmap } from "../utils";
import { defineEmail } from "./email";
import { defineHandlers } from "./handlers";
import { LambdaFactory } from "./lambda";
import { defineLocals } from "./locals";
import { defineBucket } from "./s3";
import { defineVariables } from "./variables";

const tfg = init();

const vars = defineVariables(tfg);
const locals = defineLocals(tfg, { vars });

const { bucket } = defineBucket(tfg, { vars, locals });
const { topic, dnsRecords } = defineEmail(tfg, { vars, locals, bucket });
const lambda = new LambdaFactory(tfg, { vars, locals, bucket });

defineHandlers(tfg, { vars, locals, lambda, topic });

tfg.provider("aws", { region: vars.region });

tfg.output("dnsRecords", { value: rmap(dnsRecords) });

tfg.write({ dir: __dirname, format: true });
