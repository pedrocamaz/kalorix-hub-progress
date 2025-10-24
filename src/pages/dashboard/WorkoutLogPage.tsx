import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Dumbbell } from "lucide-react";
import { useWorkoutLog } from "@/hooks/useWorkoutLog";
import { useProfile } from "@/hooks/useProfile";

function formatYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

const WorkoutLogPage = () => {
  const userPhone = localStorage.getItem("sessionPhone") || "";
  const { profile, isLoading: loadingProfile } = useProfile(userPhone);

  const [date, setDate] = useState<string>(formatYMD(new Date()));
  const { workoutsQuery, addWorkoutMutation } = useWorkoutLog(profile?.id, date);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", duration_minutes: "", calories_burned: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    addWorkoutMutation.mutate(
      {
        user_id: profile.id,
        date,
        name: form.name.trim(),
        duration_minutes: parseInt(form.duration_minutes || "0", 10),
        calories_burned: parseInt(form.calories_burned || "0", 10),
      },
      { onSuccess: () => { setOpen(false); setForm({ name: "", duration_minutes: "", calories_burned: "" }); } }
    );
  };

  const isLoading = loadingProfile || workoutsQuery.isLoading;
  const isError = workoutsQuery.isError;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Treinos</h1>
          <p className="text-muted-foreground">Registre seus treinos e acompanhe suas calorias gastas</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Dumbbell className="h-4 w-4 mr-2" />
          Adicionar Treino
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Data</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treinos de {new Date(date).toLocaleDateString("pt-BR")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando treinos...
            </div>
          ) : isError ? (
            <div className="text-destructive">Erro ao carregar treinos</div>
          ) : (workoutsQuery.data?.length ?? 0) === 0 ? (
            <div className="text-muted-foreground">Nenhum treino registrado nesta data</div>
          ) : (
            <div className="space-y-3">
              {workoutsQuery.data!.map((w) => (
                <Card key={w.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-sm text-muted-foreground">{w.duration_minutes} min</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{w.calories_burned} kcal</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Treino</DialogTitle>
            <DialogDescription>Informe os detalhes do treino.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Treino</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input id="duration" type="number" min={0} value={form.duration_minutes}
                  onChange={(e) => setForm((s) => ({ ...s, duration_minutes: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calorias Queimadas</Label>
                <Input id="calories" type="number" min={0} value={form.calories_burned}
                  onChange={(e) => setForm((s) => ({ ...s, calories_burned: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addWorkoutMutation.isPending}>
                {addWorkoutMutation.isPending ? "Salvando..." : "Salvar Treino"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutLogPage;