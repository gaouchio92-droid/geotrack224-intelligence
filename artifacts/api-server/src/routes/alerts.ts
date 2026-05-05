import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, devicesTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ListAlertsQueryParams, AcknowledgeAlertParams } from "@workspace/api-zod";

const router = Router();

router.get("/alerts", async (req, res) => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const conditions = [];
  if (query.data.acknowledged !== undefined) {
    conditions.push(eq(alertsTable.acknowledged, query.data.acknowledged));
  }
  if (query.data.type) {
    conditions.push(eq(alertsTable.type, query.data.type));
  }

  const alerts = await db
    .select({
      id: alertsTable.id,
      deviceId: alertsTable.deviceId,
      deviceName: devicesTable.name,
      type: alertsTable.type,
      message: alertsTable.message,
      severity: alertsTable.severity,
      acknowledged: alertsTable.acknowledged,
      createdAt: alertsTable.createdAt,
      acknowledgedAt: alertsTable.acknowledgedAt,
    })
    .from(alertsTable)
    .leftJoin(devicesTable, eq(alertsTable.deviceId, devicesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(alertsTable.createdAt)
    .limit(query.data.limit ?? 50);

  res.json(alerts);
});

router.post("/alerts/:id/acknowledge", async (req, res) => {
  const params = AcknowledgeAlertParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const now = new Date();
  const [alert] = await db
    .update(alertsTable)
    .set({ acknowledged: true, acknowledgedAt: now })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, alert.deviceId));

  if (device) {
    await db.insert(activityTable).values({
      deviceId: alert.deviceId,
      type: "alert_acknowledged",
      description: `Alert acknowledged for ${device.name}: ${alert.message}`,
      timestamp: now,
    });
  }

  res.json({ ...alert, deviceName: device?.name });
});

export default router;
