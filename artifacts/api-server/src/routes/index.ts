import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import positionsRouter from "./positions";
import alertsRouter from "./alerts";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(positionsRouter);
router.use(alertsRouter);
router.use(statsRouter);

export default router;
