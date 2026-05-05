import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { devicesTable } from "./devices";

export const positionsTable = pgTable("positions", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id, { onDelete: "cascade" }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: numeric("speed", { precision: 6, scale: 2 }).notNull().default("0"),
  heading: numeric("heading", { precision: 5, scale: 2 }).notNull().default("0"),
  altitude: numeric("altitude", { precision: 7, scale: 2 }),
  accuracy: numeric("accuracy", { precision: 6, scale: 2 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertPositionSchema = createInsertSchema(positionsTable).omit({ id: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positionsTable.$inferSelect;
