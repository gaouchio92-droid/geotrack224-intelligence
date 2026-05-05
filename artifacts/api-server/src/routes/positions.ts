import { Router } from "express";
import { db } from "@workspace/db";
import { positionsTable, devicesTable, alertsTable, activityTable } from "@workspace/db";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import {
  IngestPositionBody,
  GetDeviceHistoryParams,
  GetDeviceHistoryQueryParams,
} from "@workspace/api-zod";
import { broadcast } from "../lib/websocket";

const router = Router();

router.post("/positions", async (req, res) => {
  const body = IngestPositionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { deviceId, latitude, longitude, speed, heading, altitude, accuracy } = body.data;
  const ts = body.data.timestamp ?? new Date();

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
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(devicesTable.id, deviceId));

    if (prevStatus !== newStatus) {
      await db.insert(activityTable).values({
        deviceId,
        type: "status_change",
        description: `${device.name} changed status from ${prevStatus} to ${newStatus}`,
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
          message: `${device.name} exceeded speed limit: ${speed.toFixed(1)} km/h (limit: ${speedLimit} km/h)`,
          severity: speed > speedLimit * 1.5 ? "critical" : speed > speedLimit * 1.2 ? "high" : "medium",
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
        description: `Overspeed alert for ${device.name}: ${speed.toFixed(1)} km/h`,
        timestamp: ts,
      });
    }

    await db.insert(activityTable).values({
      deviceId,
      type: "position_update",
      description: `${device.name} position updated at ${speed.toFixed(1)} km/h`,
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

router.get("/devices/:id/positions", async (req, res) => {
  const params = GetDeviceHistoryParams.safeParse({ id: parseInt(req.params.id) });
  const query = GetDeviceHistoryQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const limit = query.data.limit ?? 50;
  const conditions = [eq(positionsTable.deviceId, params.data.id)];

  if (query.data.from) {
    conditions.push(gte(positionsTable.timestamp, query.data.from));
  }
  if (query.data.to) {
    conditions.push(lte(positionsTable.timestamp, query.data.to));
  }

  const positions = await db
    .select()
    .from(positionsTable)
    .where(and(...conditions))
    .orderBy(desc(positionsTable.timestamp))
    .limit(limit);

  res.json(
    positions.map((p) => ({
      ...p,
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
      speed: parseFloat(p.speed),
      heading: parseFloat(p.heading),
      altitude: p.altitude ? parseFloat(p.altitude) : undefined,
      accuracy: p.accuracy ? parseFloat(p.accuracy) : undefined,
    }))
  );
});

router.get("/positions/live", async (req, res) => {
  const devices = await db.select().from(devicesTable);

  const livePositions = await Promise.all(
    devices.map(async (device) => {
      const [latest] = await db
        .select()
        .from(positionsTable)
        .where(eq(positionsTable.deviceId, device.id))
        .orderBy(desc(positionsTable.timestamp))
        .limit(1);

      if (!latest) return null;

      return {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        status: device.status,
        latitude: parseFloat(latest.latitude),
        longitude: parseFloat(latest.longitude),
        speed: parseFloat(latest.speed),
        heading: parseFloat(latest.heading),
        timestamp: latest.timestamp,
        groupName: device.groupName,
      };
    })
  );

  res.json(livePositions.filter(Boolean));
});

export default router;
