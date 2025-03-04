import { Navigate, Route, Routes } from "react-router-dom";
import { SignUpForm } from "./pages/sign-up-form";
import Cookies from "js-cookie";
import { LoginForm } from "./pages/login-form";
import { TextEditor } from "./components/TextEditor";
import { Homepage } from "./pages/home";
import GrainySpotlightScene from "./pages/landing";

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const cookie = Cookies.get("token");
  if (cookie) {
    return <Navigate to="/dashboard" />;
  } else {
    return children;
  }
};

export default function App() {

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
            <Homepage />
          }
          />
        <Route 
          path="/"
          element={
            <GrainySpotlightScene />
          }
          />
      </Routes>
    </>
  );
}
