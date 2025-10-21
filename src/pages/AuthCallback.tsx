import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyMagicLinkToken } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (!token) {
      console.warn("AuthCallback: missing token param");
      setStatus("error");
      return;
    }
    console.log("AuthCallback: token", token);

    verifyMagicLinkToken(token)
      .then((result) => {
        console.log("AuthCallback: verify result", result);
        if (result?.phone) {
          localStorage.setItem("sessionPhone", result.phone);
          setStatus("success");
          toast.success("Login realizado com sucesso!");
          navigate("/dashboard", { replace: true });
        } else {
          setStatus("error");
        }
      })
      .catch((err) => {
        console.error("AuthCallback: verify error", err);
        setStatus("error");
      });
  }, [location.search, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Validando seu acesso...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-destructive font-medium mb-2">Link inválido ou expirado</p>
        <a href="/login" className="text-primary underline">Voltar para o login</a>
      </div>
    </div>
  );
};

export default AuthCallback;