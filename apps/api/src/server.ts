import { AppServer } from "./app/appServer.js";

const server = new AppServer();

const start = async (): Promise<void> => {
  try {
    await server.start();
  } catch (error) {
    server.instance.log.error(error, "Failed to start CineBook API");

    try {
      await server.stop();
    } catch (shutdownError) {
      server.instance.log.error(
        shutdownError,
        "Failed to shut down CineBook API",
      );
    }

    process.exitCode = 1;
  }
};

const shutdown = async (signal: string): Promise<void> => {
  server.instance.log.info({ signal }, "Shutting down CineBook API");

  try {
    await server.stop();
  } catch (error) {
    server.instance.log.error(error, "Graceful shutdown failed");
    process.exitCode = 1;
  }
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

start();
