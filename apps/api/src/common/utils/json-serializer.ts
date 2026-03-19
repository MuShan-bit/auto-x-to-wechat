export function serializeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue: unknown) => {
      return typeof nestedValue === 'bigint'
        ? nestedValue.toString()
        : nestedValue;
    }),
  ) as T;
}
