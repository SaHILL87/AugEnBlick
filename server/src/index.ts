// import express from "express";
// import morgan from "morgan";
// import cors from "cors";
// import { connectDb } from "./lib/db";
// import { userRoutes } from "./routes/user.routes";
// import cookieParser from "cookie-parser";

// const app = express();

// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true,
//   })
// );

// connectDb();
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(express.json());
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true,
//   })
// );
// app.use(cookieParser());
// app.use(morgan("dev"));

// app.use("/api/user", userRoutes);

// app.listen(3000, () => {
//   console.log("Server is running on port 3000");
// });

import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import {
  getAllDocuments,
  findOrCreateDocument,
  updateDocument,
} from "./controllers/document.controller";

const PORT = Number(process.env.PORT || 3000);

/** Connect to MongoDB */
mongoose
  .connect(process.env.DATABASE_URL || "", { dbName: "Google-Docs" })
  .then(() => {
    console.log("Database connected.");
  })
  .catch((error) => {
    console.log("DB connection failed. " + error);
  });

const io = new Server(PORT, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store active users for each document
const documentUsers: any = {};

io.on("connection", (socket) => {
  socket.on("get-all-documents", async () => {
    const allDocuments = await getAllDocuments();
    allDocuments.reverse(); // To get most recent docs first.
    socket.emit("all-documents", allDocuments);
  });

  socket.on("get-document", async ({ documentId, documentName, userName }) => {
    socket.join(documentId);

    // Initialize users list for this document if it doesn't exist
    if (!documentUsers[documentId]) {
      documentUsers[documentId] = {};
    }

    // Add user to document with a unique cursor color
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#FFD166",
      "#06D6A0",
      "#118AB2",
      "#5E548E",
      "#9B5DE5",
      "#F15BB5",
    ];
    const colorIndex =
      Object.keys(documentUsers[documentId]).length % colors.length;

    // Add this user to the document's user list
    documentUsers[documentId][socket.id] = {
      userName: userName || "Anonymous",
      color: colors[colorIndex],
      cursorPosition: { index: 0, length: 0 },
    };

    // Emit the updated users list to all clients in this document
    io.to(documentId).emit(
      "users-changed",
      Object.values(documentUsers[documentId])
    );

    const document = await findOrCreateDocument({ documentId, documentName });

    if (document) socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("cursor-move", (cursorData) => {
      // Update stored cursor position for this user
      console.log(documentUsers[documentId]);
      if (documentUsers[documentId] && documentUsers[documentId][socket.id]) {
        documentUsers[documentId][socket.id].cursorPosition = cursorData;

        // Broadcast cursor position to other users with user information
        socket.broadcast.to(documentId).emit("cursor-update", {
          userId: socket.id,
          ...documentUsers[documentId][socket.id],
        });
      }
    });

    socket.on("save-document", async (data) => {
      await updateDocument(documentId, { data });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (documentUsers[documentId]) {
        delete documentUsers[documentId][socket.id];
        io.to(documentId).emit(
          "users-changed",
          Object.values(documentUsers[documentId])
        );

        // Clean up empty documents
        if (Object.keys(documentUsers[documentId]).length === 0) {
          delete documentUsers[documentId];
        }
      }
    });
  });
});
