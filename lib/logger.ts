export let logger = {
  start(file: string, ...args: unknown[]): void {},
  removed(file: string, ...args: unknown[]): void {},
  debug(msg: string, ...args: unknown[]): void {},
  info(msg: string, ...args: unknown[]): void {},
  warn(msg: string, ...args: unknown[]): void {},
  warning(): void {},
  error(msg: string, ...args: unknown[]): void {},
  critical(msg: string, ...args: unknown[]): void {},
};
