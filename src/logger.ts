export let logger = {
  start(file: string, ...args: unknown[]): void {},
  removed(file: string, ...args: unknown[]): void {},
  debug(msg: string, ...args: unknown[]): void {},
  info(msg: string, ...args: unknown[]): void {},
  warning(msg: string, ...args: unknown[]): void {},
  error(msg: string, ...args: unknown[]): void {},
  critical(msg: string, ...args: unknown[]): void {},
};
