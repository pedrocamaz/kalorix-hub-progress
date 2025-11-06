import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Dumbbell, Edit, Trash2, Plus } from "lucide-react";
import { useWorkoutLog, type Workout } from "@/hooks/useWorkoutLog";
import { useProfile } from "@/hooks/useProfile";

function formatYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

const WorkoutLogPage = () => {
  const userPhone = localStorage.getItem("sessionPhone") || "";
  const { profile, isLoading: loadingProfile } = useProfile(userPhone);

  const [date, setDate] = useState<string>(formatYMD(new Date()));
  const { workoutsQuery, addWorkoutMutation, updateWorkoutMutation, deleteWorkoutMutation } = useWorkoutLog(userPhone, date);

  const [open, setOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [form, setForm] = useState({ 
    name: "", 
    duration_minutes: "", 
    intensity: "moderada", 
    calories_burned: "" 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingWorkout) {
      // Editar treino existente
      updateWorkoutMutation.mutate(
        {
          id: editingWorkout.id,
          name: form.name.trim(),
          duration_minutes: parseInt(form.duration_minutes || "0", 10),
          intensity: form.intensity,
          calories_burned: parseInt(form.calories_burned || "0", 10),
        },
        { 
          onSuccess: () => { 
            setOpen(false); 
            setEditingWorkout(null);
            setForm({ name: "", duration_minutes: "", intensity: "moderada", calories_burned: "" }); 
          } 
        }
      );
    } else {
      // Adicionar novo treino
      addWorkoutMutation.mutate(
        {
          phone: userPhone,
          date,
          name: form.name.trim(),
          duration_minutes: parseInt(form.duration_minutes || "0", 10),
          intensity: form.intensity,
          calories_burned: parseInt(form.calories_burned || "0", 10),
        },
        { 
          onSuccess: () => { 
            setOpen(false); 
            setForm({ name: "", duration_minutes: "", intensity: "moderada", calories_burned: "" }); 
          } 
        }
      );
    }
  };

  const handleEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    setForm({
      name: workout.name,
      duration_minutes: workout.duration_minutes.toString(),
      intensity: workout.intensity,
      calories_burned: workout.calories_burned.toString(),
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este treino?")) {
      deleteWorkoutMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingWorkout(null);
    setForm({ name: "", duration_minutes: "", intensity: "moderada", calories_burned: "" });
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case "baixa": return "bg-green-100 text-green-800";
      case "moderada": return "bg-yellow-100 text-yellow-800";
      case "alta": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
          <Plus className="h-4 w-4 mr-2" />
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
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-lg">{w.name}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntensityColor(w.intensity)}`}>
                            {w.intensity}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{w.duration_minutes} min</span>
                          <span>•</span>
                          <span>{w.calories_burned} kcal</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(w)}
                          disabled={updateWorkoutMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(w.id)}
                          disabled={deleteWorkoutMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(openState) => !openState && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorkout ? "Editar Treino" : "Novo Treino"}
            </DialogTitle>
            <DialogDescription>
              {editingWorkout ? "Atualize os detalhes do treino." : "Informe os detalhes do treino."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Treino</Label>
              <Input 
                id="name" 
                value={form.name} 
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} 
                placeholder="Ex.: Musculação, Corrida, Natação"
                required 
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  min={1} 
                  value={form.duration_minutes}
                  onChange={(e) => setForm((s) => ({ ...s, duration_minutes: e.target.value }))} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calorias Queimadas</Label>
                <Input 
                  id="calories" 
                  type="number" 
                  min={1} 
                  value={form.calories_burned}
                  onChange={(e) => setForm((s) => ({ ...s, calories_burned: e.target.value }))} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity">Intensidade</Label>
              <Select value={form.intensity} onValueChange={(value) => setForm((s) => ({ ...s, intensity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a intensidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={addWorkoutMutation.isPending || updateWorkoutMutation.isPending}
              >
                {(addWorkoutMutation.isPending || updateWorkoutMutation.isPending) 
                  ? "Salvando..." 
                  : editingWorkout ? "Atualizar Treino" : "Salvar Treino"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutLogPage;