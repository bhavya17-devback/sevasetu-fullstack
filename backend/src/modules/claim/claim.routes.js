const express = require("express");
const router = express.Router();
const claimController = require("./claim.controller");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/authMiddleware");
const { claimDonationSchema, updateStatusSchema } = require("./claim.validation");

router.post(
  "/",
  protect,
  validateRequest(claimDonationSchema),
  claimController.claim
);
router.get("/my-claims", protect, claimController.getMyClaims);
router.patch(
  "/:id/status",
  protect,
  validateRequest(updateStatusSchema),
  claimController.updateStatus
);

module.exports = router;