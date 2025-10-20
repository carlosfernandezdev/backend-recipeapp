// src/routes/upload.routes.ts
import { Router } from "express";
import crypto from "crypto";
import { verifyAccess } from "../middlewares/auth";

const router = Router();

/**
 * GET /api/upload/signature
 * Devuelve { timestamp, folder, signature, apiKey, cloudName }
 * El cliente (RN) lo usa para subir directo a Cloudinary con form-data.
 */
router.get("/signature", verifyAccess, (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const userId = (req as any).user?.id || "public";
  const folder = `recipes/${userId}`; // organiza por usuario

  // Importante: firmar los params ordenados alfabéticamente
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");

  res.json({
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

export default router;
