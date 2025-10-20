import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/user.routes";
import recipesRoutes from "./routes/recipes.routes";
import groupRoutes from "./routes/group.routes";
import upload from "./routes/upload.routes";

const app = express();

app.set("trust proxy", true);
app.use(helmet());
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => res.json({ ok: true, service: "recipes-backend", version: "0.1.0" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", ts: new Date().toISOString() }));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/recipes", recipesRoutes);
app.use("/groups", groupRoutes);
app.use("/api/upload", upload);

app.use((req, res) => res.status(404).json({ error: "NotFound", message: `${req.method} ${req.originalUrl}` }));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.name === "ZodError" || err?.issues) {
    return res.status(422).json({ error: "ValidationError", issues: err.issues ?? err });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: "Conflict", message: "Duplicado", keyValue: err.keyValue });
  }
  const status = err.status || err.statusCode || 500;
  const payload: any = { error: err.name || "InternalServerError", message: err.message || "Error interno" };
  if (process.env.NODE_ENV !== "production") payload.stack = err.stack;
  res.status(status).json(payload);
});

export default app;
