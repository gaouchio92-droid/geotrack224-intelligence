import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { isNull, sql } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_PASSWORD = "Mybgn@224";

const DEFAULT_ADMIN = {
  name: "Gaouchio",
  email: "gaouchio92@gmail.com",
  role: "admin" as const,
};

export async function seedAdminPasswords(): Promise<void> {
  try {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable);

    if (count === 0) {
      await db.insert(usersTable).values({
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        role: DEFAULT_ADMIN.role,
        passwordHash: hash,
      });
      logger.info({ email: DEFAULT_ADMIN.email }, "Admin user created (empty database)");
      return;
    }

    const usersWithoutPassword = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(isNull(usersTable.passwordHash));

    if (usersWithoutPassword.length === 0) return;

    await db
      .update(usersTable)
      .set({ passwordHash: hash })
      .where(isNull(usersTable.passwordHash));

    for (const user of usersWithoutPassword) {
      logger.info({ userId: user.id, email: user.email }, "Default password seeded for user");
    }
  } catch (err) {
    logger.warn({ err }, "Password seed skipped (column may not exist yet)");
  }
}
