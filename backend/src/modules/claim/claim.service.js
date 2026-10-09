const Donation = require("../../models/Donation");
const Claim = require("../../models/Claim");
const { withMaskedDonor } = require("../../utils/privacy");
const { isFoodExpired, generateOtp } = require("../../utils/donationRules");

const claimDonation = async (donationId, ngoId) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw new Error("Donation not found");
  }
  if (donation.status !== "Available") {
    throw new Error("Donation is no longer available");
  }
  if (isFoodExpired(donation)) {
    donation.status = "Expired";
    await donation.save();
    throw new Error("This food donation has expired and can no longer be claimed");
  }

  donation.claimedBy = ngoId;
  donation.status = "Claimed";
  donation.claimedAt = new Date();
  await donation.save();

  // Real, standalone audit record in its own "claims" collection -
  // this is what stays even if the donation is later edited or removed.
  await Claim.create({
    donation: donation._id,
    donor: donation.donor,
    ngo: ngoId,
    status: "Claimed",
    claimedAt: donation.claimedAt,
  });

  return donation;
};

// The NGO gets what it needs to collect the item (pickup address, the
// contact number the donor chose for pickup) but only a shortened donor
// name - never the donor's email or account phone number.
const getMyClaims = async (ngoId) => {
  // Claims made before OTPs existed get one now, so the donor sees a
  // code on their dashboard and the NGO can verify the pickup.
  const withoutOtp = await Donation.find({
    claimedBy: ngoId,
    status: "Claimed",
    otp: { $exists: false },
  }).select("+otp");
  await Promise.all(
    withoutOtp.map(async (d) => {
      d.otp = generateOtp();
      await d.save();
    })
  );

  const donations = await Donation.find({ claimedBy: ngoId })
    .sort({ createdAt: -1 })
    .populate("donor", "name");

  return donations.map(withMaskedDonor);
};

const updateClaimStatus = async (donationId, status, ngoId, otp) => {
  const donation = await Donation.findOne({
    _id: donationId,
    claimedBy: ngoId,
  }).select("+otp");
  if (!donation) {
    throw new Error("Claim record not found or unauthorized");
  }

  // Handing the item over is verified with the donor's OTP. (Donations
  // created before OTPs existed have none, so they can still be closed.)
  if (status === "Completed" && donation.otp) {
    if (String(otp || "").trim() !== donation.otp) {
      throw new Error(
        "Incorrect OTP. Ask the donor for the 6-digit code on their My Donations page."
      );
    }
  }

  donation.status = status;
  if (status === "Completed") {
    donation.completedAt = new Date();
  }
  await donation.save();

  const claimRecord = await Claim.findOne({ donation: donation._id, ngo: ngoId }).sort({
    createdAt: -1,
  });
  if (claimRecord) {
    claimRecord.status = status;
    if (status === "Completed") {
      claimRecord.completedAt = new Date();
    }
    await claimRecord.save();
  }

  return donation;
};

module.exports = {
  claimDonation,
  getMyClaims,
  updateClaimStatus,
};