import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/phone";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const res = await fetch(import.meta.env.VITE_N8N_MAGIC_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Webhook error (${res.status}): ${errText}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        await res.json().catch(() => null);
      } else {
        await res.text().catch(() => null);
      }
      toast.success("Link de acesso enviado pelo WhatsApp!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao enviar link. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <Logo className="justify-center" />
          <p className="text-muted-foreground">
            Acesse sua conta através do WhatsApp
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login - Cliente</CardTitle>
            <CardDescription>
              Informe seu número do WhatsApp para receber o link de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de acesso"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Link para Nutricionistas */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-400">
                  Você é um Nutricionista?
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Acesse o Hub de Nutricionistas com email e senha
                </p>
              </div>
              <Link to="/nutritionist/login">
                <Button variant="outline" className="w-full border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/20">
                  Acessar como Nutricionista
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
