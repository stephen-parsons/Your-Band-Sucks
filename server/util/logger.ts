import chalk from "chalk";

type Level = "log" | "warn" | "error" | "info";

type ModuleLogger = {
  [K in Level]: (...args: any[]) => void;
};

interface Options {
  devOnly?: boolean;
}

const levels = ["log", "warn", "info", "error"] as Level[];

export function moduleLogger(
  moduleName: string,
  options?: Options,
): ModuleLogger {
  const devOnly = options?.devOnly ?? true;
  //todo: disable logging in production
  if (devOnly && process.env.NODE_ENV !== "development") () => {};
  return Object.fromEntries(
    levels.map((level) => {
      return [
        level as "log" | "warn" | "error" | "info",
        (...args: any[]) =>
          console[level as "log" | "warn" | "error" | "info"](
            chalk.grey(`[${moduleName}]`),
            ...args,
          ),
      ];
    }),
  ) as ModuleLogger;
}
