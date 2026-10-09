const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    itemName: {
      type: String,
      required: [true, 'Please specify item name'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
    },
    quantity: {
      type: String,
      required: [true, 'Please specify quantity'],
    },
    unit: {
      type: String,
      default: 'Items',
    },
    condition: {
      type: String,
      default: 'Gently Used',
    },
    description: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Please specify the city'],
      trim: true,
    },
    address: {
      type: String,
    },
    pickupAddress: {
      type: String,
    },
    pickupDate: {
      type: Date,
    },
    contactPhone: {
      type: String,
    },
    coins: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'available',
        'claimed',
        'completed',
        'expired',
        'cancelled',
        'Pending',
        'Available',
        'Claimed',
        'Completed',
        'Cancelled',
        'Expired',
      ],
      default: 'pending',
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // 6-digit code the donor shows the NGO at pickup. Never sent in
    // normal queries - only the donor's own list asks for it explicitly.
    otp: {
      type: String,
      select: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Donation', donationSchema);