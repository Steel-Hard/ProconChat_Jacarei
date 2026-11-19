import { Router } from "express";
import { SessionController } from "../controllers/session.controller";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest.middleware";
import {
  listSessionsQuerySchema,
  sessionCodeParamSchema,
} from "../schemas/session.schema";
import { sessionService } from "../services/session.service";

const router = Router();
router.use(requireAuth);

const controller = new SessionController(sessionService);

router.get(
  "/",
  requirePermission("sessions.view"),
  validateRequest({ query: listSessionsQuerySchema }),
  controller.list,
);
router.get(
  "/:code",
  requirePermission("sessions.view"),
  validateRequest({ params: sessionCodeParamSchema }),
  controller.detail,
);

export default router;
