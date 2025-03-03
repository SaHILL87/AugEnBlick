import React, { useEffect } from "react";
import { toast } from "sonner";

interface ScreenshotPreventionProps {
  children: React.ReactNode;
}

const ScreenshotPreventionWrapper: React.FC<ScreenshotPreventionProps> = ({
  children,
}) => {
  useEffect(() => {
    const preventScreenshot = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        toast.warning("Screenshot attempt blocked", {
          description: "Taking screenshots is not allowed on this platform.",
          duration: 3000,
        });
        return false;
      }
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Screenshot via context menu blocked", {
        description: "Right-click screenshot is disabled.",
        duration: 3000,
      });
      return false;
    };

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Copy attempt blocked", {
        description: "Copying content is not permitted.",
        duration: 3000,
      });
    };

    // CSS to prevent selection
    const style = document.createElement("style");
    style.innerHTML = `
      body {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);

    // Add event listeners
    document.addEventListener("keydown", preventScreenshot);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopy);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", preventScreenshot);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopy);
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
};

export default ScreenshotPreventionWrapper;
