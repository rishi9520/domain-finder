import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trendsRouter from "./trends";
import huntRouter from "./hunt";
import domainsRouter from "./domains";
import savedRouter from "./saved";
import statsRouter from "./stats";
import hunterRouter from "./hunter";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trendsRouter);
router.use(huntRouter);
router.use(domainsRouter);
router.use(savedRouter);
router.use(statsRouter);
router.use(hunterRouter);
router.use(newsRouter);

export default router;
