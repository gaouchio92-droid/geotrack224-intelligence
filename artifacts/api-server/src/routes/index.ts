import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import devicesRouter from "./devices";
import deviceTokensRouter from "./device-tokens";
import ingestRouter from "./ingest";
import positionsRouter from "./positions";
import alertsRouter from "./alerts";
import statsRouter from "./stats";
import groupsRouter from "./groups";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(devicesRouter);
router.use(deviceTokensRouter);
router.use(ingestRouter);
router.use(positionsRouter);
router.use(alertsRouter);
router.use(statsRouter);
router.use(groupsRouter);
router.use(usersRouter);

export default router;
