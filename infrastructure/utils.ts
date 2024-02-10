import { TerraformElement, list, map } from "terraform-generator";

export function rmap(value: unknown): any {
  if (value instanceof TerraformElement) {
    return value;
  }

  if (Array.isArray(value)) {
    return list(...value.map(rmap));
  }

  if (typeof value === "object") {
    return map(
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, v]) => [
          key,
          rmap(v),
        ])
      )
    );
  }

  return value;
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}
