import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import prisma from "./prisma.js";
import { config } from "./config.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import eventRoutes from "./routes/event.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import userRoutes from "./routes/user.routes.js";
import { openApiDocument } from "./docs/openapi.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: config.BODY_SIZE_LIMIT }));
app.use(requestLogger);
app.use(globalLimiter);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/docs.json", (_req, res) => res.json(openApiDocument));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "UP", database: "CONNECTED" });
  } catch {
    res.status(503).json({ status: "UP", database: "DISCONNECTED" });
  }
});

app.use("/api/events", eventRoutes);
app.use("/api/events", bookingRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

export default app;