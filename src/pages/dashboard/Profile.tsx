import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, User, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { supabase, supabaseUrl } from "@/lib/supabaseClient";
import type { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'

const Profile = () => {
  const userPhone = localStorage.getItem('sessionPhone') || '';
  
  const { profile, isLoading, isError, updateProfile, isUpdating } = useProfile(userPhone);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    peso: "",
    altura: "",
    idade: "",
    sexo: "M",
    nivel_atividade: "3",
    objetivo: "2",
  });

  const [portalLoading, setPortalLoading] = useState(false);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || "",
        email: profile.email || "",
        telefone: profile.telefone,
        peso: profile.peso,
        altura: profile.altura.toString(),
        idade: profile.idade.toString(),
        sexo: profile.sexo,
        nivel_atividade: profile.nivel_atividade,
        objetivo: profile.objetivo,
      });
    }
  }, [profile]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Erro ao carregar perfil</p>
          <p className="text-muted-foreground text-sm">
            Verifique sua conexão e tente novamente
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateProfile({
      nome: formData.nome,
      email: formData.email,
      peso: formData.peso,
      altura: parseInt(formData.altura),
      idade: parseInt(formData.idade),
      sexo: formData.sexo,
      nivel_atividade: formData.nivel_atividade,
      objetivo: formData.objetivo,
    });
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const userPhone = localStorage.getItem('sessionPhone') || '';
      if (!userPhone) {
        toast.error("Sessão inválida. Faça login novamente.");
        return;
      }
      const returnUrl = window.location.origin + "/dashboard/profile";

      // 1) Tenta pelo invoke (recomendado)
      const { data, error } = await supabase.functions.invoke("billing-portal", {
        body: { phone: userPhone, return_url: returnUrl },
      });

      if (error) {
        // 2) Fallback de debug: fetch direto para capturar status/body
        try {
          const r = await fetch(`${supabaseUrl}/functions/v1/billing-portal`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ phone: userPhone, return_url: returnUrl }),
          });
          const text = await r.text();
          console.error("billing-portal direct fetch:", { status: r.status, body: text });
          toast.error(`Erro ${r.status}: ${text || "Falha ao abrir o portal"}`);
        } catch (e: any) {
          console.error("billing-portal direct fetch failed:", e);
          toast.error("Erro ao contactar a Edge Function");
        }
        return;
      }

      if (!data?.url) {
        console.error("billing-portal: resposta sem url", data);
        toast.error("Portal não retornou URL");
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      console.error("billing-portal exception:", e);
      toast.error(e?.message || "Erro inesperado ao abrir o portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações e metas</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seus dados básicos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idade">Idade</Label>
                <Input
                  id="idade"
                  type="number"
                  value={formData.idade}
                  onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peso">Peso Atual (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.1"
                  value={formData.peso}
                  onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input
                  id="altura"
                  type="number"
                  value={formData.altura}
                  onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={formData.sexo} onValueChange={(value) => setFormData({ ...formData, sexo: value })}>
                  <SelectTrigger id="sexo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivel_atividade">Nível de Atividade</Label>
                <Select value={formData.nivel_atividade} onValueChange={(value) => setFormData({ ...formData, nivel_atividade: value })}>
                  <SelectTrigger id="nivel_atividade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Sedentário</SelectItem>
                    <SelectItem value="2">Levemente ativo</SelectItem>
                    <SelectItem value="3">Moderadamente ativo</SelectItem>
                    <SelectItem value="4">Muito ativo</SelectItem>
                    <SelectItem value="5">Extremamente ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Select value={formData.objetivo} onValueChange={(value) => setFormData({ ...formData, objetivo: value })}>
                <SelectTrigger id="objetivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Emagrecer</SelectItem>
                  <SelectItem value="2">Manter peso</SelectItem>
                  <SelectItem value="3">Ganhar peso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full md:w-auto" disabled={isUpdating}>
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Assinatura
          </CardTitle>
          <CardDescription>Gerencie sua assinatura e pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
            <div>
              <p className="font-semibold">Premium</p>
              <p className="text-sm text-muted-foreground">
                {profile.assinatura_ativa ? 'Assinatura ativa' : 'Assinatura inativa'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">R$ 29,90</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
          </div>

          <Button onClick={handleManageSubscription} variant="outline" className="w-full" disabled={portalLoading}>
            {portalLoading ? "Abrindo..." : "Gerenciar Assinatura no Stripe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
