import { User } from "@/types";
import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void; // Set the user data in state
  fetchUser: () => Promise<void>; // Function to fetch user data from /me endpoint
}

// Utility function to fetch the user data based on the token (from the httpOnly cookie)
const fetchUserFromToken = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/api/user/me`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      // Function to set the user in the state
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      // Function to fetch the user from the server
      fetchUser: async () => {
        if (get().isAuthenticated) {
          return;
        }
        const userData = await fetchUserFromToken();
        set({ user: userData.user, isAuthenticated: !!userData });
      },
    }),
    {
      name: "auth-storage", // Persist the store data to localStorage or IndexedDB
    }
  )
);
