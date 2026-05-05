import { Router } from "express";
import { db } from "@workspace/db";
import {
  deviceTokensTable,
  devicesTable,
  positionsTable,
  alertsTable,
  activityTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { broadcast } from "../lib/websocket";

const router = Router();

const IngestBody = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number().optional().default(0),
  heading: z.number().optional().default(0),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  timestamp: z.coerce.date().optional(),
});

router.post("/ingest", async (req, res) => {
  const rawToken =
    (req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ?? "") ||
    (req.query["token"] as string | undefined) ||
    "";

  if (!rawToken) {
    res.status(401).json({ error: "Token d'accès requis" });
    return;
  }

  const [tokenRow] = await db
    .select()
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.token, rawToken));

  if (!tokenRow) {
    res.status(401).json({ error: "Token invalide ou révoqué" });
    return;
  }

  const body = IngestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Corps de requête invalide", details: body.error.flatten() });
    return;
  }

  const { latitude, longitude, speed, heading, altitude, accuracy } = body.data;
  const ts = body.data.timestamp ?? new Date();
  const deviceId = tokenRow.deviceId;

  await db
    .update(deviceTokensTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(deviceTokensTable.id, tokenRow.id));

  const [position] = await db
    .insert(positionsTable)
    .values({
      deviceId,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      speed: speed.toString(),
      heading: heading.toString(),
      altitude: altitude?.toString(),
      accuracy: accuracy?.toString(),
      timestamp: ts,
    })
    .returning();

  const newStatus = speed > 0.5 ? "moving" : "stopped";

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId));

  if (device) {
    const prevStatus = device.status;

    await db
      .update(devicesTable)
      .set({ status: newStatus, updatedAt: new Date(), lastIngestedAt: new Date(), lastPositionSource: "ingest" })
      .where(eq(devicesTable.id, deviceId));

    if (prevStatus !== newStatus) {
      const statusFr = (s: string) =>
        s === "moving" ? "en mouvement" : s === "stopped" ? "à l'arrêt" : "hors ligne";
      await db.insert(activityTable).values({
        deviceId,
        type: "status_change",
        description: `${device.name} : ${statusFr(prevStatus)} → ${statusFr(newStatus)}`,
        timestamp: ts,
      });
    }

    const speedLimit = device.speedLimit ? parseFloat(device.speedLimit) : null;
    if (speedLimit && speed > speedLimit) {
      const [alert] = await db
        .insert(alertsTable)
        .values({
          deviceId,
          type: "overspeed",
          message: `${device.name} a dépassé la limite de ${speedLimit} km/h (vitesse : ${speed.toFixed(1)} km/h)`,
          severity:
            speed > speedLimit * 1.5 ? "critical" : speed > speedLimit * 1.2 ? "high" : "medium",
          createdAt: ts,
        })
        .returning();

      broadcast({
        type: "alert",
        payload: {
          ...alert,
          deviceName: device.name,
        },
      });

      await db.insert(activityTable).values({
        deviceId,
        type: "alert_triggered",
        description: `Alerte excès de vitesse — ${device.name} : ${speed.toFixed(1)} km/h`,
        timestamp: ts,
      });
    }

    await db.insert(activityTable).values({
      deviceId,
      type: "position_update",
      description: `${device.name} — position mise à jour via tracker GPS réel (${speed.toFixed(1)} km/h)`,
      timestamp: ts,
    });

    broadcast({
      type: "position_update",
      payload: {
        deviceId,
        deviceName: device.name,
        deviceType: device.type,
        status: newStatus,
        latitude,
        longitude,
        speed,
        heading,
        timestamp: ts,
        groupName: device.groupName,
      },
    });

    if (prevStatus !== newStatus) {
      broadcast({
        type: "device_status_change",
        payload: { deviceId, deviceName: device.name, status: newStatus },
      });
    }
  }

  res.status(201).json({
    ...position,
    latitude: parseFloat(position.latitude),
    longitude: parseFloat(position.longitude),
    speed: parseFloat(position.speed),
    heading: parseFloat(position.heading),
    altitude: position.altitude ? parseFloat(position.altitude) : undefined,
    accuracy: position.accuracy ? parseFloat(position.accuracy) : undefined,
  });
});

export default router;
