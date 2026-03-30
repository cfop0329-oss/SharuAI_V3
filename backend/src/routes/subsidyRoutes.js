import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createApplication,
  createObligation,
  getSubsidyAccess,
} from "../controllers/subsidyController.js";

const router = Router();

router.get("/application-access", authMiddleware, getSubsidyAccess);
router.post("/applications", authMiddleware, createApplication);
router.post("/counter-obligations", authMiddleware, createObligation);

export default router;