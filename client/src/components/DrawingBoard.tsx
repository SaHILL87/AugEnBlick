import { useState, useEffect, useCallback, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState } from "@excalidraw/excalidraw/types/types";
import { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

interface DrawingBoardProps {
  socket: Socket | undefined;
  documentId: string | undefined;
}

export const DrawingBoard = ({ socket, documentId }: DrawingBoardProps) => {
  const [excalidrawElements, setExcalidrawElements] = useState<
    ExcalidrawElement[]
  >([]);
  const [appState, setAppState] = useState<AppState>({
    viewBackgroundColor: "#f5f5f5",
    currentItemFontFamily: 1,
  } as AppState);

  const excalidrawRef = useRef<any>(null);
  const latestElementsRef = useRef<ExcalidrawElement[]>([]);
  const drawingUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const isProcessingUpdateRef = useRef<boolean>(false);
  const pendingUpdatesRef = useRef<ExcalidrawElement[][]>([]);
  const updateSourceRef = useRef<"server" | "local" | null>(null);

  // Update the ref whenever elements change
  useEffect(() => {
    latestElementsRef.current = excalidrawElements;
  }, [excalidrawElements]);

  // Handle Excalidraw drawing events
  useEffect(() => {
    if (!socket) return;

    // Safely apply updates without triggering loops
    const safelyApplyUpdate = (elements: ExcalidrawElement[]) => {
      // If we're already processing an update, queue this one
      if (isProcessingUpdateRef.current) {
        pendingUpdatesRef.current.push(elements);
        return;
      }

      isProcessingUpdateRef.current = true;
      updateSourceRef.current = "server";

      // Update the ref immediately
      latestElementsRef.current = elements;

      // Direct API update if ref is available
      if (excalidrawRef.current) {
        try {
          excalidrawRef.current.updateScene({
            elements: elements,
            appState,
          });
        } catch (err) {
          console.error("Error directly updating Excalidraw:", err);
        }
      }

      // Schedule state update outside current execution context
      Promise.resolve().then(() => {
        setExcalidrawElements(elements);

        // Process any pending updates after a short delay
        setTimeout(() => {
          isProcessingUpdateRef.current = false;
          updateSourceRef.current = null;

          if (pendingUpdatesRef.current.length > 0) {
            const nextUpdate = pendingUpdatesRef.current.shift();
            if (nextUpdate) {
              safelyApplyUpdate(nextUpdate);
            }
          }
        }, 50);
      });
    };

    // Load drawings handler
    const handleLoadDrawings = (drawings: ExcalidrawElement[]) => {
      if (!Array.isArray(drawings)) return;
      safelyApplyUpdate(drawings);
    };

    // Receive updated drawings handler
    const handleDrawingsUpdated = (drawings: ExcalidrawElement[]) => {
      if (!Array.isArray(drawings)) return;
      safelyApplyUpdate(drawings);
    };

    // Single element update handler
    const handleElementUpdated = (element: ExcalidrawElement) => {
      // Skip if we're currently processing a server update
      if (updateSourceRef.current === "server") return;

      const currentElements = [...latestElementsRef.current];
      const index = currentElements.findIndex((el) => el.id === element.id);

      const newElements =
        index >= 0
          ? currentElements.map((el) => (el.id === element.id ? element : el))
          : [...currentElements, element];

      safelyApplyUpdate(newElements);
    };

    // Clear drawings handler
    const handleDrawingsCleared = () => {
      safelyApplyUpdate([]);
    };

    // Register all socket event handlers
    socket.on("load-drawings", handleLoadDrawings);
    socket.on("drawings-updated", handleDrawingsUpdated);
    socket.on("drawing-element-updated", handleElementUpdated);
    socket.on("drawings-cleared", handleDrawingsCleared);

    // Clean up all socket listeners on unmount
    return () => {
      socket.off("load-drawings", handleLoadDrawings);
      socket.off("drawings-updated", handleDrawingsUpdated);
      socket.off("drawing-element-updated", handleElementUpdated);
      socket.off("drawings-cleared", handleDrawingsCleared);
    };
  }, [socket, appState]);

  // Completely separate the handling of Excalidraw changes
  const handleExcalidrawChange = useCallback(
    (elements: readonly ExcalidrawElement[], state: AppState) => {
      // Skip if this update originated from a server event
      if (updateSourceRef.current === "server") return;

      // Mark this as a local update
      updateSourceRef.current = "local";

      // Convert to regular array
      const elementsArray = Array.from(elements) as ExcalidrawElement[];

      // Only update if there's an actual change
      if (
        JSON.stringify(latestElementsRef.current) !==
        JSON.stringify(elementsArray)
      ) {
        // Update local refs and state
        latestElementsRef.current = elementsArray;

        // Use Promise to schedule state updates outside current execution context
        Promise.resolve().then(() => {
          setExcalidrawElements(elementsArray);
          setAppState(state);
        });

        // Debounce sending updates to the server
        if (socket) {
          if (drawingUpdateTimer.current) {
            clearTimeout(drawingUpdateTimer.current);
          }

          drawingUpdateTimer.current = setTimeout(() => {
            socket.emit("update-drawings-batch", elementsArray);

            // Reset update source after sending
            updateSourceRef.current = null;
          }, 300);
        }
      } else {
        // Reset update source if nothing was changed
        updateSourceRef.current = null;
      }
    },
    [socket]
  );

  const onExcalidrawAPIMount = useCallback(
    (api: any) => {
      excalidrawRef.current = api;

      // Initial scene setup if we have elements
      if (latestElementsRef.current.length > 0) {
        try {
          api.updateScene({
            elements: latestElementsRef.current,
            appState,
          });
        } catch (err) {
          console.error("Error setting initial Excalidraw scene:", err);
        }
      }
    },
    [appState]
  );

  // Load drawings from server when component mounts
  useEffect(() => {
    if (!socket || !documentId) return;

    socket.emit("get-drawings", documentId);
  }, [socket, documentId]);

  const clearDrawings = useCallback(() => {
    // Mark as local update to prevent loops
    updateSourceRef.current = "local";

    // Update refs
    latestElementsRef.current = [];

    // Direct API update
    if (excalidrawRef.current) {
      try {
        excalidrawRef.current.updateScene({
          elements: [],
          appState,
        });
      } catch (err) {
        console.error("Error clearing drawings:", err);
      }
    }

    // Schedule state update
    Promise.resolve().then(() => {
      setExcalidrawElements([]);
    });

    // Notify server
    if (socket) {
      socket.emit("clear-drawings");
    }

    // Reset update source after a short delay
    setTimeout(() => {
      updateSourceRef.current = null;
    }, 50);
  }, [socket, appState]);

  return (
    <div className="flex flex-col h-full">
      <div className="drawing-controls bg-pink-50 p-2 border-b">
        <Button
          onClick={clearDrawings}
          variant="outline"
          size="sm"
          className="bg-lavender-100 hover:bg-lavender-200 text-purple-800"
        >
          Clear Drawings
        </Button>
      </div>
      <div className="drawing-container h-[65vh]">
        <Excalidraw
          initialData={{
            elements: excalidrawElements,
            appState: appState,
          }}
          onChange={handleExcalidrawChange}
          zenModeEnabled={false}
          excalidrawAPI={onExcalidrawAPIMount}
        />
      </div>
    </div>
  );
};
