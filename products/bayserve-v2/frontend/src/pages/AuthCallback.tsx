// src/pages/AuthCallback.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { parseCognitoHash } from "../auth/cognito";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    // Parse the hash from Cognito redirect
    const { idToken } = parseCognitoHash(window.location.hash);

    if (idToken) {
      setToken(idToken);
      // Clear hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Redirect to main dashboard or flows page
      navigate("/", { replace: true });
    } else {
      // No token found — maybe error parameter exists
      navigate("/login", { replace: true });
    }
  }, [navigate, setToken]);

  return <div>Signing you in...</div>;
};

export default AuthCallback;
