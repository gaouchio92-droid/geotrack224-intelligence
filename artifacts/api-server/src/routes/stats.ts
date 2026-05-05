import { Router } from "express";
import { db } from "@workspace/db";
import { devicesTable, positionsTable, alertsTable, activityTable } from "@workspace/db";
import { eq, gte, count } from "drizzle-orm";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/stats/summary", async (req, res) => {
  const devices = await db.select().from(devicesTable);

  const movingCount = devices.filter((d) => d.status === "moving").length;
  const stoppedCount = devices.filter((d) => d.status === "stopped").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;
  const vehicleCount = devices.filter((d) => d.type === "vehicle").length;
  const assetCount = devices.filter((d) => d.type === "asset").length;
  const personCount = devices.filter((d) => d.type === "person").length;
  const droneCount = devices.filter((d) => d.type === "drone").length;

  const [{ value: activeAlerts }] = await db
    .select({ value: count() })
    .from(alertsTable)
    .where(eq(alertsTable.acknowledged, false));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ value: totalPositionsToday }] = await db
    .select({ value: count() })
    .from(positionsTable)
    .where(gte(positionsTable.timestamp, startOfDay));

  res.json({
    totalDevices: devices.length,
    movingCount,
    stoppedCount,
    offlineCount,
    activeAlerts,
    vehicleCount,
    assetCount,
    personCount,
    droneCount,
    totalPositionsToday,
  });
});

router.get("/stats/activity", async (req, res) => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const limit = query.data.limit ?? 20;

  const { desc } = await import("drizzle-orm");

  const activity = await db
    .select({
      id: activityTable.id,
      deviceId: activityTable.deviceId,
      deviceName: devicesTable.name,
      type: activityTable.type,
      description: activityTable.description,
      timestamp: activityTable.timestamp,
    })
    .from(activityTable)
    .leftJoin(devicesTable, eq(activityTable.deviceId, devicesTable.id))
    .orderBy(desc(activityTable.timestamp))
    .limit(limit);

  res.json(activity);
});

export default router;
