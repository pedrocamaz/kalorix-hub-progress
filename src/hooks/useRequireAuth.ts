import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useRequireAuth() {
  const navigate = useNavigate();
  useEffect(() => {
    const phone = localStorage.getItem("sessionPhone");
    if (!phone) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);
}