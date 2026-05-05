import { Router } from "express";
import { db } from "@workspace/db";
import { devicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListDevicesQueryParams,
  CreateDeviceBody,
  UpdateDeviceBody,
  GetDeviceParams,
  DeleteDeviceParams,
  AssignDeviceParams,
  AssignDeviceBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/devices", async (req, res) => {
  const query = ListDevicesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const conditions = [];
  if (query.data.type) conditions.push(eq(devicesTable.type, query.data.type));
  if (query.data.status) conditions.push(eq(devicesTable.status, query.data.status));

  const devices = await db
    .select()
    .from(devicesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(
    devices.map((d) => ({
      ...d,
      speedLimit: d.speedLimit ? parseFloat(d.speedLimit) : undefined,
    }))
  );
});

router.post("/devices", async (req, res) => {
  const body = CreateDeviceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [device] = await db
    .insert(devicesTable)
    .values({
      name: body.data.name,
      type: body.data.type,
      imei: body.data.imei,
      speedLimit: body.data.speedLimit?.toString(),
      groupName: body.data.groupName,
      status: "offline",
    })
    .returning();

  res.status(201).json({
    ...device,
    speedLimit: device.speedLimit ? parseFloat(device.speedLimit) : undefined,
  });
});

router.get("/devices/:id", async (req, res) => {
  const params = GetDeviceParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, params.data.id));

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    ...device,
    speedLimit: device.speedLimit ? parseFloat(device.speedLimit) : undefined,
  });
});

router.put("/devices/:id", async (req, res) => {
  const params = GetDeviceParams.safeParse({ id: parseInt(req.params.id) });
  const body = UpdateDeviceBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [device] = await db
    .update(devicesTable)
    .set({
      name: body.data.name,
      type: body.data.type,
      speedLimit: body.data.speedLimit?.toString(),
      groupName: body.data.groupName,
      updatedAt: new Date(),
    })
    .where(eq(devicesTable.id, params.data.id))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    ...device,
    speedLimit: device.speedLimit ? parseFloat(device.speedLimit) : undefined,
  });
});

router.delete("/devices/:id", async (req, res) => {
  const params = DeleteDeviceParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(devicesTable).where(eq(devicesTable.id, params.data.id));
  res.status(204).send();
});

router.put("/devices/:id/assign", async (req, res) => {
  const params = AssignDeviceParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = AssignDeviceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updateData: { updatedAt: Date; groupId?: number | null; userId?: number | null } = { updatedAt: new Date() };
  if ("groupId" in body.data) updateData.groupId = body.data.groupId as number | null;
  if ("userId" in body.data) updateData.userId = body.data.userId as number | null;

  const [device] = await db
    .update(devicesTable)
    .set(updateData)
    .where(eq(devicesTable.id, params.data.id))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    ...device,
    speedLimit: device.speedLimit ? parseFloat(device.speedLimit) : undefined,
  });
});

export default router;
