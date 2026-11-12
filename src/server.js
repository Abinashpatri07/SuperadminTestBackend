import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

// ───────── AUTH & OCR ─────────
import unifiedAuthRoutes from "./routes/unifiedAuthRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";

// ───────── SUPER ADMIN ROUTES ─────────
import superAdminAuthRoutes from "./routes/superadminroute/authRoutes.js";
import clientRoutes from "./routes/superadminroute/clientRoutes.js";
import hrRoutes from "./routes/superadminroute/hrRoutes.js";
import vendorRoutes from "./routes/superadminroute/vendorRoutes.js";
import candidateRoutes from "./routes/superadminroute/candidateRoutes.js";
import auditRoutes from "./routes/superadminroute/auditRoutes.js";
import dashboardRoutes from "./routes/superadminroute/dashboardRoutes.js";
import superAdminBillingRoutes from "./routes/superadminroute/billingRoutes.js";
import superAdminCaseRoutes from "./routes/superadminroute/caseRoutes.js";
import superAdminAnalyticsRoutes from "./routes/superadminroute/analyticsRoutes.js";

dotenv.config();

import pool from "./config/db.js";

const app = express();

/* MIDDLEWARE */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://bgv.dqnex.online",
      "http://187.126.122.110",
      "http://187.126.122.110:5173",
      "http://187.126.122.110:5174",
      "http://187.126.122.110:5175",
    ],
    credentials: true,
  })
);
app.use(express.json());

const uploadsDirectory = path.resolve("uploads");
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

// Serve uploads — images & PDFs accessible at /uploads/<filename>
app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

// Fallback: proxy from production server if file not found locally
app.use("/uploads", async (req, res) => {
  const remoteBase = (process.env.REMOTE_UPLOADS_URL || "https://api.dqnex.online").replace(/\/+$/, "");
  const remoteUrl = `${remoteBase}/uploads${req.path}`;
  try {
    const remoteRes = await fetch(remoteUrl);
    if (!remoteRes.ok) {
      return res.status(remoteRes.status).send("File not found");
    }
    const contentType = remoteRes.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    if (req.path.toLowerCase().endsWith(".pdf")) {
      res.setHeader("Content-Disposition", "inline");
    }
    const arrayBuffer = await remoteRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("Uploads proxy error:", err.message);
    return res.status(404).send("File not found");
  }
});

/* SWAGGER DOCS */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/* ───────── UNIFIED & SUPER ADMIN AUTH ROUTES ───────── */
app.use("/api/auth", unifiedAuthRoutes);
app.use("/api/superadmin/auth", superAdminAuthRoutes);

/* ───────── SUPER ADMIN MODULE ROUTES ───────── */
app.use("/api/client", clientRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/billing", superAdminBillingRoutes);
app.use("/api/superadmin/cases", superAdminCaseRoutes);
app.use("/api/superadmin/analytics", superAdminAnalyticsRoutes);

/* ───────── OCR ROUTES ───────── */
app.use("/api/ocr", ocrRoutes);

/* TEST */
app.get("/", (req, res) => {
  res.send("Super Admin Backend Server Running 🚀");
});

/* ───────── FRONTEND RESET / SETUP REDIRECTS (FALLBACK) ───────── */
const passwordResetPaths = [
  "/reset-password",
  "/setup-password",
  "/super-admin/reset-password",
  "/super-admin/setup-password",
];

passwordResetPaths.forEach((routePath) => {
  app.get(routePath, (req, res) => {
    const isDev = req.hostname === "localhost" || req.hostname === "127.0.0.1";
    const frontendBase = isDev
      ? "http://localhost:5175"
      : process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes("localhost")
      ? process.env.FRONTEND_URL.replace(/\/+$/, "")
      : "https://bgv.dqnex.online";
    return res.redirect(`${frontendBase}${req.originalUrl}`);
  });
});

/* PORT */
const PORT = process.env.PORT || 5002;

pool.getConnection()
  .then(() => {
    console.log("MariaDB Connected ✅");
  })
  .catch((err) => {
    console.log("DB Connection Error ❌", err);
  });

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Super Admin Server running on port ${PORT}`);
});
