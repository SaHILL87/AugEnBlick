import express from "express";
import morgan from "morgan";
import cors from "cors";
import { connectDb } from "./lib/db";
import { userRoutes } from "./routes/user.routes";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

connectDb();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/user", userRoutes);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
