import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import subsidyRoutes from "./routes/subsidyRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (_, res) => {
  res.send("API работает");
});

app.use("/api/auth", authRoutes);
app.use("/api/subsidy", subsidyRoutes);
app.use("/api", subsidyRoutes);

export default app;