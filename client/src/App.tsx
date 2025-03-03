import { Navigate, Route, Routes } from "react-router-dom";
import { SignUpForm } from "./pages/sign-up-form";
import Cookies from "js-cookie";
import { LoginForm } from "./pages/login-form";
import { useEffect } from "react";
import { useUser } from "./hooks/useUser";
import { User } from "./types";
import { api } from "./lib/api";
import { TextEditor } from "./components/TextEditor";
import { LandingPage } from "./pages/landing";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const cookie = Cookies.get("token");
  if (cookie) {
    return children;
  } else {
    return <Navigate to="/auth/login" />;
  }
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const cookie = Cookies.get("token");
  if (cookie) {
    return <Navigate to="/dashboard" />;
  } else {
    return children;
  }
};

export default function App() {
  const { setUser } = useUser();

  useEffect(() => {
    const getUser = async () => {
      const res = await api.get("/api/user/me");

      if (res.data.success) {
        setUser(res.data.data as User);
      }
    };
    getUser();
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="/auth/register"
          element={
            <AuthRoute>
              <SignUpForm />
            </AuthRoute>
          }
        />
        <Route
          path="/auth/login"
          element={
            <AuthRoute>
              <LoginForm />
            </AuthRoute>
          }
        />
        <Route 
          path="/documents/:id"
          element={
            <TextEditor />
          }
          />
        <Route 
          path="/home"
          element={
            <LandingPage />
          }
          />
      </Routes>
    </>
  );
}
