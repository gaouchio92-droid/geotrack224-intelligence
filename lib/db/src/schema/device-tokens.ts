import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { devicesTable } from "./devices";

export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  label: text("label").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export type DeviceToken = typeof deviceTokensTable.$inferSelect;
