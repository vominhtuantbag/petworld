/** Compile-time exhaustiveness check for unions such as hair styles and motifs. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`);
}
