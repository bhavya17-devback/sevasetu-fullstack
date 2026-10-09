const Donation = require("../../models/Donation");
const Claim = require("../../models/Claim");
const { withMaskedDonor } = require("../../utils/privacy");
const {
  isFoodExpired,
  expireStaleFoodDonations,
  generateOtp,
  assertPickupDateAllowed,
} = require("../../utils/donationRules");

// What an NGO may see BEFORE it claims a listing: no street address, no
// phone number, no OTP. Those unlock only for the NGO that claims it.
const PUBLIC_HIDDEN_FIELDS = "-address -pickupAddress -contactPhone -otp";

const createDonation = async (donationData, donorId) => {
  assertPickupDateAllowed(donationData.pickupDate);

  return await Donation.create({
    ...donationData,
    donor: donorId,
    status: "Available",
    otp: generateOtp(),
  });
};

const getAllDonations = async (filters) => {
  await expireStaleFoodDonations();

  const query = { status: "Available" };

  if (filters.category) {
    // Exact & case-insensitive category match (handles 'cooked_food', 'cooked food', etc.)
    const categoryPattern = filters.category.replace(/_/g, "[\\s_]?");
    query.category = new RegExp(`^${categoryPattern}$`, "i");
  }

  if (filters.city) {
    query.city = new RegExp(filters.city, "i");
  }

  const donations = await Donation.find(query)
    .select(PUBLIC_HIDDEN_FIELDS)
    .sort({ createdAt: -1 })
    .populate("donor", "name");

  return donations.map(withMaskedDonor);
};

const searchDonations = async (keyword) => {
  await expireStaleFoodDonations();

  const query = { status: "Available" };

  if (keyword) {
    const regex = new RegExp(keyword, "i");
    query.$or = [
      { itemName: regex },
      { description: regex },
      { category: regex },
      { city: regex },
      { title: regex }, // Backward compatibility for older test data
    ];
  }

  const donations = await Donation.find(query)
    .select(PUBLIC_HIDDEN_FIELDS)
    .sort({ createdAt: -1 })
    .populate("donor", "name");

  return donations.map(withMaskedDonor);
};

// The donor's own list - the only place the pickup OTP is ever returned.
const getMyDonations = async (donorId) => {
  await expireStaleFoodDonations();

  const donations = await Donation.find({ donor: donorId })
    .select("+otp")
    .sort({ createdAt: -1 })
    .populate("claimedBy", "name email phone");

  // Donations created before OTPs existed get one the first time the
  // donor opens their list, so every open donation can be verified.
  await Promise.all(
    donations
      .filter((d) => !d.otp && ["Available", "Claimed"].includes(d.status))
      .map(async (d) => {
        d.otp = generateOtp();
        await d.save();
      })
  );

  return donations;
};

const claimDonation = async (donationId, userId) => {
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

  if (donation.donor.toString() === userId.toString()) {
    throw new Error("You cannot claim your own donation");
  }

  donation.status = "Claimed";
  donation.claimedBy = userId;
  donation.claimedAt = new Date();
  await donation.save();

  await Claim.create({
    donation: donation._id,
    donor: donation.donor,
    ngo: userId,
    status: "Claimed",
    claimedAt: donation.claimedAt,
  });

  return donation;
};

const getMyClaims = async (userId) => {
  const donations = await Donation.find({ claimedBy: userId })
    .sort({ createdAt: -1 })
    .populate("donor", "name");

  return donations.map(withMaskedDonor);
};

// Donor takes their own still-available listing off the platform.
// NGOs stop seeing it, but it stays on the donor's own history.
const cancelDonation = async (donationId, donorId) => {
  const donation = await Donation.findOne({ _id: donationId, donor: donorId });

  if (!donation) {
    throw new Error("Donation not found");
  }

  if (donation.status !== "Available") {
    throw new Error("Only an unclaimed donation can be cancelled");
  }

  donation.status = "Cancelled";
  await donation.save();
  return donation;
};

// Donor permanently removes a listing that was never claimed
// (or one they already cancelled / that expired).
const deleteDonation = async (donationId, donorId) => {
  const donation = await Donation.findOne({ _id: donationId, donor: donorId });

  if (!donation) {
    throw new Error("Donation not found");
  }

  if (!["Available", "Cancelled", "Expired"].includes(donation.status)) {
    throw new Error("A claimed or completed donation cannot be deleted");
  }

  await donation.deleteOne();
  return donation;
};

module.exports = {
  createDonation,
  getAllDonations,
  searchDonations,
  getMyDonations,
  claimDonation,
  getMyClaims,
  cancelDonation,
  deleteDonation,
};
