import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import positionsRouter from "./positions";
import alertsRouter from "./alerts";
import statsRouter from "./stats";
import groupsRouter from "./groups";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(positionsRouter);
router.use(alertsRouter);
router.use(statsRouter);
router.use(groupsRouter);
router.use(usersRouter);

export default router;
