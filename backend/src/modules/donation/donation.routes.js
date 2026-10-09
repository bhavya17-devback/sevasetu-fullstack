const express = require("express");
const router = express.Router();
const donationController = require("./donation.controller");
const validateRequest = require("../../middleware/validateRequest");
const authMiddleware = require("../../middleware/authMiddleware");
const { createDonationSchema } = require("./donation.validation");

const protect = typeof authMiddleware === "function" 
  ? authMiddleware 
  : (authMiddleware.authMiddleware || authMiddleware.protect || authMiddleware.default);

router.post(
  "/",
  protect,
  validateRequest(createDonationSchema),
  donationController.create
);

router.get("/", donationController.getAll);
router.get("/search", donationController.search);

router.get("/my-donations", protect, donationController.getMy);
router.get("/mydonations", protect, donationController.getMy);
router.get("/myclaims", protect, donationController.getMyClaims);

router.put("/:id/claim", protect, donationController.claim);

router.patch("/:id/cancel", protect, donationController.cancel);
router.delete("/:id", protect, donationController.remove);

module.exports = router;