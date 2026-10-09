const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./src/config/database");

// Load Environment Variables
dotenv.config();

// Connect Database
connectDB();

const app = express();

// Global Express Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
  })
);
app.use(express.json());

// Simple health check, useful to confirm the API + DB are up
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "SevaSetu API is running" });
});

// Feature-Based Modular Routes
app.use("/api/auth", require("./src/modules/auth/auth.routes"));
app.use("/api/donations", require("./src/modules/donation/donation.routes"));
app.use("/api/claims", require("./src/modules/claim/claim.routes"));
app.use("/api/admin", require("./src/modules/admin/admin.routes"));
app.use("/api/reports", require("./src/modules/report/report.routes"));
app.use("/api/subcategories", require("./src/modules/subcategory/subcategory.routes"));
app.use("/api/categories", require("./src/modules/category/category.routes"));
app.use("/api/stats", require("./src/modules/stats/stats.routes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});