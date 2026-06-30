import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import classifyRoute from "./routes/classify.js";
import scheduleRoute from "./routes/schedule.js";
import rescheduleRoute from "./routes/reschedule.js";
import alertRoute from "./routes/alert.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_, res) => res.json({ status: "ok", app: "Clutch" }));
  app.use("/api/classify",   classifyRoute);
  app.use("/api/schedule",   scheduleRoute);
  app.use("/api/reschedule", rescheduleRoute);
  app.use("/api/alert",      alertRoute);
  app.use(errorHandler);

  // In production, serve the React build
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(process.cwd(), "client/dist");
    const fallbackDistPath = path.join(process.cwd(), "dist");
    const distPath = fs.existsSync(clientDistPath) ? clientDistPath : fallbackDistPath;

    app.use(express.static(distPath));
    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Vite middleware for development in the sandbox environment
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite dev server middleware loaded in custom setup:", e.message);
    }
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => console.log(`Clutch server running on port ${PORT}`));
}

startServer();
