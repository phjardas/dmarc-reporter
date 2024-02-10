import { defineEmail } from "./email";
import { defineLocals } from "./locals";
import { defineBucket } from "./s3";
import { init } from "./terraform";
import { rmap } from "./utils";
import { defineVariables } from "./variables";

const tfg = init();

const vars = defineVariables(tfg);
const locals = defineLocals(tfg, { vars });

const { bucket } = defineBucket(tfg, { vars, locals });
const { dnsRecords } = defineEmail(tfg, { vars, locals, bucket });

tfg.provider("aws", { region: vars.region });

tfg.output("dnsRecords", { value: rmap(dnsRecords) });

tfg.write({ dir: __dirname, format: true });
