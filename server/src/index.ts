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
} from "./controllers/document.controller";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' })); // Increased limit for drawings
app.use(cookieParser());
app.use(morgan("dev"));

const server = http.createServer(app);

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

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8, // Increased buffer size for drawing data
});

// Store active users for each document
const documentUsers:any = {};
// Store drawing data for each document as object arrays
const documentDrawings:any = {};

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
    
    // Initialize drawings for this document if it doesn't exist
    if (!documentDrawings[documentId]) {
      documentDrawings[documentId] = [];
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

    if (document) {
      socket.emit("load-document", document.data);
      
      // Send existing drawings to the new user
      if (document.drawings && Array.isArray(document.drawings)) {
        documentDrawings[documentId] = document.drawings;
        socket.emit("load-drawings", document.drawings);
      }
    }

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // Handle font changes
    socket.on("font-change", (fontData) => {
      socket.broadcast.to(documentId).emit("receive-font-change", {
        userId: socket.id,
        ...fontData
      });
    });

    // Handle drawing updates - now properly handling object arrays
    socket.on("drawing-update", (elements) => {
      if (Array.isArray(elements)) {
        // Full elements array update
        documentDrawings[documentId] = elements;
        socket.broadcast.to(documentId).emit("drawings-updated", elements);
      } else if (elements && typeof elements === 'object') {
        // Single element update
        const elementExists = documentDrawings[documentId].findIndex(
          (el:any) => el.id === elements.id
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
      if (Array.isArray(elements)) {
        documentDrawings[documentId] = elements;
        socket.broadcast.to(documentId).emit("drawings-updated", elements);
      }
    });

    // Handle clearing drawings
    socket.on("clear-drawings", () => {
      documentDrawings[documentId] = [];
      socket.broadcast.to(documentId).emit("drawings-cleared");
    });

    socket.on("cursor-move", (cursorData) => {
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

    socket.on("save-document", async (data) => {
      // Save both text content and drawings
      await updateDocument(documentId, { 
        data,
        drawings: documentDrawings[documentId]
      });
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});