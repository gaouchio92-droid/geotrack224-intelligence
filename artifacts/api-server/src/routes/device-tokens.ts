import { Router } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { deviceTokensTable, devicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getRateLimitUsage } from "../lib/rate-limiter";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  if (req.session.userRole !== "admin") {
    res.status(403).json({ error: "Accès réservé aux administrateurs" });
    return;
  }
  next();
}

const DeviceIdParam = z.object({ id: z.coerce.number().int().positive() });
const TokenIdParam = z.object({ tokenId: z.coerce.number().int().positive() });

router.get("/devices/:id/tokens", requireAdmin, async (req, res) => {
  const params = DeviceIdParam.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, params.data.id));

  if (!device) {
    res.status(404).json({ error: "Appareil introuvable" });
    return;
  }

  const tokens = await db
    .select()
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.deviceId, params.data.id))
    .orderBy(deviceTokensTable.createdAt);

  res.json(
    tokens.map((t) => {
      const usage = getRateLimitUsage(t.id);
      return {
        id: t.id,
        deviceId: t.deviceId,
        label: t.label,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt ?? undefined,
        requestsThisMinute: usage.requestsThisMinute,
        limitPerMinute: usage.limitPerMinute,
      };
    })
  );
});

router.post("/devices/:id/tokens", requireAdmin, async (req, res) => {
  const params = DeviceIdParam.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }

  const body = z.object({ label: z.string().optional() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Corps de requête invalide" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, params.data.id));

  if (!device) {
    res.status(404).json({ error: "Appareil introuvable" });
    return;
  }

  const rawToken = randomBytes(32).toString("hex");

  const [token] = await db
    .insert(deviceTokensTable)
    .values({
      deviceId: params.data.id,
      token: rawToken,
      label: body.data.label ?? "",
    })
    .returning();

  res.status(201).json({
    id: token.id,
    deviceId: token.deviceId,
    label: token.label,
    token: rawToken,
    createdAt: token.createdAt,
  });
});

router.delete("/devices/:id/tokens/:tokenId", requireAdmin, async (req, res) => {
  const idParam = DeviceIdParam.safeParse({ id: req.params.id });
  const tokenParam = TokenIdParam.safeParse({ tokenId: req.params.tokenId });
  if (!idParam.success || !tokenParam.success) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }

  const result = await db
    .delete(deviceTokensTable)
    .where(
      and(
        eq(deviceTokensTable.id, tokenParam.data.tokenId),
        eq(deviceTokensTable.deviceId, idParam.data.id)
      )
    )
    .returning();

  if (result.length === 0) {
    res.status(404).json({ error: "Token introuvable" });
    return;
  }

  res.status(204).send();
});

export default router;
