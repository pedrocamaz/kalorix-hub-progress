import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Profile = () => {
  const [formData, setFormData] = useState({
    name: "João Silva",
    email: "joao@example.com",
    phone: "+55 11 99999-9999",
    weight: "93",
    height: "178",
    age: "28",
    gender: "male",
    activityLevel: "3",
    goal: "lose",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Perfil atualizado com sucesso!");
  };

  const handleManageSubscription = () => {
    // In production, this would redirect to Stripe customer portal
    toast.info("Redirecionando para gerenciar assinatura...");
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
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Peso Atual (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Sexo</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityLevel">Nível de Atividade</Label>
                <Select value={formData.activityLevel} onValueChange={(value) => setFormData({ ...formData, activityLevel: value })}>
                  <SelectTrigger id="activityLevel">
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
              <Label htmlFor="goal">Objetivo</Label>
              <Select value={formData.goal} onValueChange={(value) => setFormData({ ...formData, goal: value })}>
                <SelectTrigger id="goal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Emagrecer</SelectItem>
                  <SelectItem value="maintain">Manter peso</SelectItem>
                  <SelectItem value="gain">Ganhar peso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Salvar Alterações
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
              <p className="font-semibold">Plano Premium</p>
              <p className="text-sm text-muted-foreground">Assinatura ativa</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">R$ 29,90</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
          </div>

          <Button onClick={handleManageSubscription} variant="outline" className="w-full">
            Gerenciar Assinatura no Stripe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
