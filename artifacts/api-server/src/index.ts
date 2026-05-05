import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initWebSocket } from "./lib/websocket";
import { initSimulator, startSimulator } from "./lib/simulator";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

initWebSocket(server);

server.listen(port, async () => {
  logger.info({ port }, "Server listening");

  try {
    await initSimulator();
    startSimulator();
  } catch (err) {
    logger.error({ err }, "Simulator init failed");
  }
});
