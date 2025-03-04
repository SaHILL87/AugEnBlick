import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import jsCookie from "js-cookie";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCookie = (name: string) => {
  return jsCookie.get(name);
};

// utils/auth.ts
export const getUserIdFromToken = () => {
  if (typeof window === "undefined") return null;

  // Get token from cookies
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    // Decode JWT token (frontend-safe decode)
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id;
  } catch (e) {
    console.error("Error decoding token:", e);
    return null;
  }
};
