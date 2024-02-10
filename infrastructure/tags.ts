import { Variable, map } from "terraform-generator";
import { project } from "./config";

export function tags({ stack }: { stack: Variable }) {
  return map({
    Project: project,
    Env: stack,
  });
}
