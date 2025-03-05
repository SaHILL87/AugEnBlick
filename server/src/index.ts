import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({
  path: ".env",
});
import {
  getAllDocuments,
  findOrCreateDocument,
  updateDocument,
  isUserAuthorized,
} from "./controllers/document.controller";
import { userRoutes } from "./routes/user.routes";
import { errorMiddleware } from "./lib/ErrorHandler";
import { User } from "./models/user.models";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { accessRouter } from "./routes/access.routes";
import { versionRoutes } from "./routes/version.routes";
import Document from "./models/document.models";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" })); // Increased limit for drawings
app.use(cookieParser());
app.use(morgan("dev"));

const server = http.createServer(app);

app.use("/api/user", userRoutes);
app.use("/api/access", accessRouter);
app.use("/api/versions", versionRoutes);

app.use(errorMiddleware);

const PORT = Number(process.env.PORT || 3000);

/** Connect to MongoDB */
mongoose
  .connect(process.env.MONGODB_URI || "", { dbName: "Google-Docs" })
  .then(() => {
    console.log("Database connected.");
  })
  .catch((error) => {
    console.log("DB connection failed. " + error);
  });

export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8, // Increased buffer size for drawing data
});

// Store active users for each document
const documentUsers: any = {};
// Store drawing data for each document as object arrays
const documentDrawings: any = {};
// Track document data to prevent duplicate saves
const documentData: any = {};

const SocketMap = new Map();

io.on("connection", (socket) => {
  let currentDocumentId: any = null;

  socket.on("get-all-documents", async ({ token }) => {
    const { id: userId } = jsonwebtoken.verify(
      token,
      process.env.JWT_SECRET || ""
    ) as JwtPayload;
    const allDocuments = await getAllDocuments(userId);
    allDocuments.reverse(); // To get most recent docs first.
    socket.emit("all-documents", allDocuments);
  });

  socket.on("get-document", async ({ documentId, documentName, token }) => {
    currentDocumentId = documentId;
    socket.join(documentId);

    // Initialize users list for this document if it doesn't exist
    if (!documentUsers[documentId]) {
      documentUsers[documentId] = {};
    }

    // Initialize drawings for this document if it doesn't exist
    if (!documentDrawings[documentId]) {
      documentDrawings[documentId] = [];
    }

    // Initialize document data tracker
    if (!documentData[documentId]) {
      documentData[documentId] = null;
    }

    try {
      const { id: userId } = jsonwebtoken.verify(
        token,
        process.env.JWT_SECRET || ""
      ) as JwtPayload;
      const user = await User.findById(userId);

      if (!user) {
        socket.emit("auth-error", "User not found");
        return;
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
        userName: user.email || "Anonymous User",
        color: colors[colorIndex],
        cursorPosition: { index: 0, length: 0 },
        userId: socket.id,
      };

      // Emit the updated users list to all clients in this document
      io.to(documentId).emit(
        "users-changed",
        Object.entries(documentUsers[documentId]).map(
          ([id, userData]: any) => ({
            ...userData,
            userId: id,
          })
        )
      );

      // Find or create the document
      const document = await findOrCreateDocument({
        documentId,
        documentName,
        userId,
      });

      if (document) {
        // Store current document data
        documentData[documentId] = document.data;

        // Ensure we're sending valid data
        let documentContent: any = document.data;

        // If document data is empty or invalid, provide a default
        if (
          !documentContent ||
          (typeof documentContent === "object" && !documentContent.ops)
        ) {
          documentContent = { ops: [] };
        }

        // Send document data to the client
        socket.emit("load-document", documentContent);

        // Send existing drawings to the new user
        if (document.drawings && Array.isArray(document.drawings)) {
          documentDrawings[documentId] = document.drawings;
          socket.emit("load-drawings", document.drawings);
        }
      } else {
        // Handle the case where document creation failed
        socket.emit("load-document", { ops: [] });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      socket.emit("auth-error", "Authentication failed");
    }
  });
  socket.on("add-comment", async ({ documentId, content, userId }) => {
    try {
      const document = await Document.findByIdAndUpdate(
        documentId,
        {
          $push: {
            comments: {
              user: userId,
              content,
            },
          },
        },
        { new: true, populate: "comments.user" }
      );
      io.to(documentId).emit("update-comments", document?.comments);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  });
  // Handle text changes
  socket.on("send-changes", (delta) => {
    console.log(delta);
    const documentId = currentDocumentId;
    if (!documentId) return;

    // Only broadcast to others, not back to sender
    socket.broadcast.to(documentId).emit("receive-changes", delta);
  });

  // Handle font changes
  socket.on("font-change", (fontData) => {
    const documentId = currentDocumentId;
    if (!documentId) return;

    socket.broadcast.to(documentId).emit("receive-font-change", {
      userId: socket.id,
      ...fontData,
    });
  });

  // Handle drawing updates
  socket.on("drawing-update", (elements) => {
    const documentId = currentDocumentId;
    if (!documentId) return;

    if (Array.isArray(elements)) {
      // Full elements array update
      documentDrawings[documentId] = elements;
      socket.broadcast.to(documentId).emit("drawings-updated", elements);
    } else if (elements && typeof elements === "object") {
      // Single element update
      const elementExists = documentDrawings[documentId].findIndex(
        (el: any) => el.id === elements.id
      );

      if (elementExists >= 0) {
        documentDrawings[documentId][elementExists] = elements;
      } else {
        documentDrawings[documentId].push(elements);
      }

      socket.broadcast.to(documentId).emit("drawing-element-updated", elements);
    }
  });

  // Handle batch drawing updates
  socket.on("update-drawings-batch", (elements) => {
    const documentId = currentDocumentId;
    if (!documentId) return;

    if (Array.isArray(elements)) {
      documentDrawings[documentId] = elements;
      socket.broadcast.to(documentId).emit("drawings-updated", elements);
    }
  });

  // Handle clearing drawings
  socket.on("clear-drawings", () => {
    const documentId = currentDocumentId;
    if (!documentId) return;

    documentDrawings[documentId] = [];
    socket.broadcast.to(documentId).emit("drawings-cleared");
  });

  // Handle cursor movements
  socket.on("cursor-move", (cursorData) => {
    const documentId = currentDocumentId;
    if (!documentId) return;

    // Update stored cursor position for this user
    if (documentUsers[documentId] && documentUsers[documentId][socket.id]) {
      documentUsers[documentId][socket.id].cursorPosition = cursorData;

      // Broadcast cursor position to other users with user information
      socket.broadcast.to(documentId).emit("cursor-update", {
        userId: socket.id,
        ...documentUsers[documentId][socket.id],
      });
    }
  });

  // Handle document saving
  socket.on("save-document", async () => {
    const documentId = currentDocumentId;
    if (!documentId) {
      socket.emit("save-error", "No active document");
      return;
    }

    try {
      // Get current document state from the sender
      socket.emit("request-document-state");

      socket.once("document-state", async (data) => {
        try {
          if (!data || (typeof data === "object" && !data.ops)) {
            socket.emit("save-error", "Invalid document data");
            return;
          }

          // Save both text content and drawings
          await updateDocument(documentId, {
            data,
            drawings: documentDrawings[documentId] || [],
          });

          // Update stored document data
          documentData[documentId] = data;

          // Confirm save to the client
          socket.emit("save-confirmed");
        } catch (innerError) {
          console.error("Error in document state handler:", innerError);
          socket.emit("save-error", "Failed to save document state");
        }
      });
    } catch (error) {
      console.error("Error saving document:", error);
      socket.emit("save-error", "Failed to save document");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    if (currentDocumentId && documentUsers[currentDocumentId]) {
      delete documentUsers[currentDocumentId][socket.id];

      io.to(currentDocumentId).emit(
        "users-changed",
        Object.entries(documentUsers[currentDocumentId]).map(
          ([id, userData]: any) => ({
            ...userData,
            userId: id,
          })
        )
      );

      // Clean up empty documents
      if (Object.keys(documentUsers[currentDocumentId]).length === 0) {
        delete documentUsers[currentDocumentId];
        delete documentDrawings[currentDocumentId];
        delete documentData[currentDocumentId];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
