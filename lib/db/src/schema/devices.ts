import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"vehicle" | "asset" | "person" | "drone">(),
  status: text("status").notNull().default("offline").$type<"moving" | "stopped" | "offline">(),
  imei: text("imei").notNull().unique(),
  speedLimit: numeric("speed_limit", { precision: 6, scale: 2 }),
  groupName: text("group_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
