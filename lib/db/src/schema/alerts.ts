import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { devicesTable } from "./devices";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<"overspeed" | "offline" | "geofence">(),
  message: text("message").notNull(),
  severity: text("severity").notNull().$type<"low" | "medium" | "high" | "critical">(),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, acknowledged: true, acknowledgedAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
