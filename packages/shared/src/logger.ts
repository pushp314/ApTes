import pino from "pino";

// Detect if we are running in an environment that prefers structured JSON logging (like Docker or CI)
// If NODE_ENV is production, or if explicitly requested, default to structured JSON.
// Otherwise, use pino-pretty for developer-friendly terminal output.
const isProd =
  process.env.NODE_ENV === "production" || process.env.JSON_LOGS === "true";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});
