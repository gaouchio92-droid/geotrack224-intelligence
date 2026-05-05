import { db } from "@workspace/db";
import { devicesTable, positionsTable, alertsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { broadcast } from "./websocket";

interface SimulatedDevice {
  deviceId: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  speedLimit: number | null;
  active: boolean;
}

const simDevices: SimulatedDevice[] = [];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function movePosition(lat: number, lng: number, heading: number, speedKmh: number) {
  const distKm = speedKmh / 3600;
  const dLat = (distKm / 111) * Math.cos((heading * Math.PI) / 180);
  const dLng = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin((heading * Math.PI) / 180);
  return { lat: lat + dLat, lng: lng + dLng };
}

export async function initSimulator() {
  const devices = await db.select().from(devicesTable);

  for (const device of devices) {
    simDevices.push({
      deviceId: device.id,
      name: device.name,
      type: device.type,
      lat: randomBetween(9.0, 11.5),
      lng: randomBetween(-14.5, -10.5),
      speed: randomBetween(0, 80),
      heading: randomBetween(0, 360),
      speedLimit: device.speedLimit ? parseFloat(device.speedLimit) : null,
      active: Math.random() > 0.2,
    });
  }

  logger.info({ count: simDevices.length }, "GPS simulator initialized");
}

async function tick() {
  for (const sim of simDevices) {
    if (!sim.active) continue;

    sim.heading += randomBetween(-15, 15);
    if (sim.heading < 0) sim.heading += 360;
    if (sim.heading > 360) sim.heading -= 360;

    const speedChange = randomBetween(-10, 10);
    sim.speed = Math.max(0, Math.min(120, sim.speed + speedChange));

    if (Math.random() < 0.05) {
      sim.speed = 0;
    }

    const { lat, lng } = movePosition(sim.lat, sim.lng, sim.heading, sim.speed);
    sim.lat = lat;
    sim.lng = lng;

    const now = new Date();

    try {
      await db.insert(positionsTable).values({
        deviceId: sim.deviceId,
        latitude: sim.lat.toString(),
        longitude: sim.lng.toString(),
        speed: sim.speed.toString(),
        heading: sim.heading.toString(),
        altitude: randomBetween(10, 500).toString(),
        accuracy: "5",
        timestamp: now,
      });

      const newStatus = sim.speed > 0.5 ? "moving" : "stopped";
      const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, sim.deviceId));

      if (device) {
        const recentIngest = device.lastIngestedAt &&
          now.getTime() - new Date(device.lastIngestedAt).getTime() < 30 * 60 * 1000;
        if (!recentIngest) {
          await db.update(devicesTable)
            .set({ lastPositionSource: "simulator" })
            .where(eq(devicesTable.id, sim.deviceId));
        }
      }

      if (device && device.status !== newStatus) {
        await db.update(devicesTable).set({ status: newStatus, updatedAt: now }).where(eq(devicesTable.id, sim.deviceId));
        const statusFr = newStatus === "moving" ? "en mouvement" : "à l'arrêt";
        await db.insert(activityTable).values({
          deviceId: sim.deviceId,
          type: "status_change",
          description: `${sim.name} est passé à : ${statusFr}`,
          timestamp: now,
        });
        broadcast({ type: "device_status_change", payload: { deviceId: sim.deviceId, deviceName: sim.name, status: newStatus } });
      }

      if (sim.speedLimit && sim.speed > sim.speedLimit) {
        const alertMsg = `${sim.name} a dépassé la limite de ${sim.speedLimit} km/h (vitesse actuelle : ${sim.speed.toFixed(1)} km/h)`;
        const [alert] = await db.insert(alertsTable).values({
          deviceId: sim.deviceId,
          type: "overspeed",
          message: alertMsg,
          severity: sim.speed > sim.speedLimit * 1.5 ? "critical" : "high",
          createdAt: now,
        }).returning();

        broadcast({
          type: "alert",
          payload: { ...alert, deviceName: sim.name },
        });
      }

      broadcast({
        type: "position_update",
        payload: {
          deviceId: sim.deviceId,
          deviceName: sim.name,
          deviceType: sim.type,
          status: sim.speed > 0.5 ? "moving" : "stopped",
          latitude: sim.lat,
          longitude: sim.lng,
          speed: sim.speed,
          heading: sim.heading,
          timestamp: now,
        },
      });
    } catch (err) {
      logger.error({ err, deviceId: sim.deviceId }, "Simulator tick error");
    }
  }
}

export function startSimulator() {
  setInterval(tick, 3000);
  logger.info("GPS simulator started (3s interval)");
}

export function addSimDevice(deviceId: number, name: string, type: string, speedLimit: number | null) {
  simDevices.push({
    deviceId,
    name,
    type,
    lat: randomBetween(9.0, 11.5),
    lng: randomBetween(-14.5, -10.5),
    speed: randomBetween(0, 60),
    heading: randomBetween(0, 360),
    speedLimit,
    active: true,
  });
}
