import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { logger } from "./logger";

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ ip: req.socket.remoteAddress }, "WebSocket client connected");

    ws.on("close", () => {
      logger.info("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });

    ws.send(JSON.stringify({ type: "connected", payload: { message: "GeoTrack224 Intelligence connected" } }));
  });

  logger.info("WebSocket server initialized at /ws");
  return wss;
}

export function broadcast(message: object) {
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
