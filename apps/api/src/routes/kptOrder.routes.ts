import { Router } from "express";
import { KptOrderController } from "../controllers/kptOrder.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "@prisma/client";

const router = Router();
const ctrl = new KptOrderController();

router.use(requireAuth);

// List and detail
router.get("/", ctrl.listOrders.bind(ctrl));
router.get("/:id", ctrl.getOrderDetail.bind(ctrl));

// Stock operations
router.get("/:id/stock-check", ctrl.checkStockAvailability.bind(ctrl));
router.post(
  "/:id/allocate-stock",
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ADMIN]),
  ctrl.allocateStock.bind(ctrl)
);
router.post(
  "/:id/dispatch",
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ADMIN]),
  ctrl.dispatchOrder.bind(ctrl)
);
router.post(
  "/:id/deliver",
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ADMIN]),
  ctrl.deliverOrder.bind(ctrl)
);

// Status transitions
router.patch(
  "/:id/status",
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ADMIN]),
  ctrl.updateStatus.bind(ctrl)
);
router.patch(
  "/:id/payment-status",
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.FINANCE_ADMIN]),
  ctrl.updatePaymentStatus.bind(ctrl)
);
router.patch(
  "/:id/partner",
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ADMIN]),
  ctrl.assignPartner.bind(ctrl)
);

export default router;
