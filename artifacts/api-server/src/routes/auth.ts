import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Email ou mot de passe invalide" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, body.data.email))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  req.session.userId = user.id;
  req.session.userRole = user.role as "admin" | "operator" | "viewer";
  req.session.userName = user.name;

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expirée" });
    return;
  }

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("geotrack.sid");
    res.json({ ok: true });
  });
});

router.post("/auth/change-password", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const body = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "Données invalides (mot de passe min. 6 caractères)" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Utilisateur introuvable" });
    return;
  }

  const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Mot de passe actuel incorrect" });
    return;
  }

  const hash = await bcrypt.hash(body.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

  res.json({ ok: true });
});

export default router;
