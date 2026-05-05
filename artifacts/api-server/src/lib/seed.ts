import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { isNull } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_PASSWORD = "Mybgn@224";

export async function seedAdminPasswords(): Promise<void> {
  try {
    const usersWithoutPassword = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(isNull(usersTable.passwordHash));

    if (usersWithoutPassword.length === 0) return;

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    for (const user of usersWithoutPassword) {
      await db
        .update(usersTable)
        .set({ passwordHash: hash })
        .where(isNull(usersTable.passwordHash));
      logger.info({ userId: user.id, email: user.email }, "Default password seeded for user");
    }
  } catch (err) {
    logger.warn({ err }, "Password seed skipped (column may not exist yet)");
  }
}
