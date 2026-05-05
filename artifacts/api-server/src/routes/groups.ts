import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, devicesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateGroupBody,
  UpdateGroupBody,
  UpdateGroupParams,
  DeleteGroupParams,
} from "@workspace/api-zod";

const router = Router();

async function withDeviceCount(groups: (typeof groupsTable.$inferSelect)[]) {
  if (groups.length === 0) return [];
  const counts = await db
    .select({ groupId: devicesTable.groupId, count: count() })
    .from(devicesTable)
    .groupBy(devicesTable.groupId);
  const countMap = new Map(counts.map((c) => [c.groupId, Number(c.count)]));
  return groups.map((g) => ({ ...g, deviceCount: countMap.get(g.id) ?? 0 }));
}

router.get("/groups", async (req, res) => {
  const groups = await db.select().from(groupsTable).orderBy(groupsTable.name);
  const result = await withDeviceCount(groups);
  res.json(result);
});

router.post("/groups", async (req, res) => {
  const body = CreateGroupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Corps invalide" });
    return;
  }
  const [group] = await db
    .insert(groupsTable)
    .values({ name: body.data.name, description: body.data.description, color: body.data.color })
    .returning();
  res.status(201).json({ ...group, deviceCount: 0 });
});

router.put("/groups/:id", async (req, res) => {
  const params = UpdateGroupParams.safeParse({ id: req.params.id });
  const body = UpdateGroupBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Requête invalide" });
    return;
  }
  const [group] = await db
    .update(groupsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(groupsTable.id, params.data.id))
    .returning();
  if (!group) {
    res.status(404).json({ error: "Groupe introuvable" });
    return;
  }
  const [result] = await withDeviceCount([group]);
  res.json(result);
});

router.delete("/groups/:id", async (req, res) => {
  const params = DeleteGroupParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }
  await db.delete(groupsTable).where(eq(groupsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
