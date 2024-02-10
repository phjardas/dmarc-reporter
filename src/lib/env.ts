export function requireEnv(key: string, value?: string): string {
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}
