import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, groupsTable, devicesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
  DeleteUserParams,
} from "@workspace/api-zod";

const router = Router();

async function getUsersWithDetails(users: (typeof usersTable.$inferSelect)[]) {
  if (users.length === 0) return [];
  const groups = await db.select().from(groupsTable);
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const deviceCounts = await db
    .select({ userId: devicesTable.userId, count: count() })
    .from(devicesTable)
    .groupBy(devicesTable.userId);
  const countMap = new Map(deviceCounts.map((c) => [c.userId, Number(c.count)]));

  return users.map((u) => ({
    ...u,
    groupName: u.groupId ? (groupMap.get(u.groupId)?.name ?? null) : null,
    deviceCount: countMap.get(u.id) ?? 0,
  }));
}

router.get("/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  const result = await getUsersWithDetails(users);
  res.json(result);
});

router.post("/users", async (req, res) => {
  const body = CreateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Corps invalide" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({
      name: body.data.name,
      email: body.data.email,
      role: (body.data.role ?? "operator") as "admin" | "operator" | "viewer",
      groupId: body.data.groupId ?? null,
    })
    .returning();
  const [result] = await getUsersWithDetails([user]);
  res.status(201).json(result);
});

router.put("/users/:id", async (req, res) => {
  const params = UpdateUserParams.safeParse({ id: req.params.id });
  const body = UpdateUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Requête invalide" });
    return;
  }
  const updateData: Partial<typeof usersTable.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.email !== undefined) updateData.email = body.data.email;
  if (body.data.role !== undefined) updateData.role = body.data.role as "admin" | "operator" | "viewer";
  if (body.data.groupId !== undefined) updateData.groupId = body.data.groupId as number | null;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  const [result] = await getUsersWithDetails([user]);
  res.json(result);
});

router.delete("/users/:id", async (req, res) => {
  const params = DeleteUserParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.status(204).send();
});

export default router;
