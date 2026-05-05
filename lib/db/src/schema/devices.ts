import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { groupsTable } from "./groups";
import { usersTable } from "./users";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"vehicle" | "asset" | "person" | "drone">(),
  status: text("status").notNull().default("offline").$type<"moving" | "stopped" | "offline">(),
  imei: text("imei").notNull().unique(),
  speedLimit: numeric("speed_limit", { precision: 6, scale: 2 }),
  groupName: text("group_name"),
  groupId: integer("group_id").references(() => groupsTable.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastIngestedAt: timestamp("last_ingested_at"),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
