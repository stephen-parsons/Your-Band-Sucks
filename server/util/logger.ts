import chalk from "chalk";

type Level = "log" | "warn" | "error" | "info";

type ModuleLogger = {
  [K in Level]: (...args: any[]) => void;
};

interface Options {
  devOnly?: boolean;
}

const levels = ["log", "warn", "info", "error"] as Level[];

/**
 * Logs with the module name.
 * @param level - The level of the log.
 * @param moduleName - The name of the module to log.
 * @param args - The arguments to log.
 * @returns void
 */
function logWithModule(level: Level, moduleName: string, ...args: any[]) {
  console[level](chalk.grey(`[${moduleName}]`), ...args);
}

/**
 * Creates a logger that logs with the module name.
 * @param level - The level of the log.
 * @param moduleName - The name of the module to log.
 * @returns A logger that logs with the module name.
 */
function ConsoleLogger(level: Level, moduleName: string) {
  return (...args: any[]) => logWithModule(level, moduleName, ...args);
}

/**
 * Creates a noop logger.
 * @returns A noop logger.
 */
const NoopLogger = () => () => {};

/**
 * Creates a logger for a module.
 * If the `devOnly` option is true (default), the logger will only log in development mode.
 * @param moduleName - The name of the module to log.
 * @param options - The options for the logger.
 * @param options.devOnly - Whether to only log in development mode (default: true).
 * @returns A logger for the module.
 */
export function moduleLogger(
  moduleName: string,
  options?: Options,
): ModuleLogger {
  const devOnly = options?.devOnly ?? true;
  return Object.fromEntries(
    levels.map((level) => {
      return [
        level as "log" | "warn" | "error" | "info",
        devOnly && process.env.NODE_ENV !== "development"
          ? NoopLogger()
          : ConsoleLogger(level, moduleName),
      ];
    }),
  ) as ModuleLogger;
}
