import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui/sonner.tsx";
import ScreenshotPreventionWrapper from "./utils/PreventScreenshot.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <ScreenshotPreventionWrapper>
          <Toaster />
          <App />
        </ScreenshotPreventionWrapper>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
