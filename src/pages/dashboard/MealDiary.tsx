import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Coffee, Sun, Moon, Apple, Loader2 } from "lucide-react";
import { useMealDiary, type Meal } from "@/hooks/useMealDiary";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MealDiary = () => {
  const userPhone = localStorage.getItem('sessionPhone') || '';
  const { meals, isLoading, isError, deleteMeal, isDeleting, updateMeal, isUpdating } = useMealDiary(userPhone);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  useEffect(() => {
    if (editingMeal) {
      setFormData({
        name: editingMeal.name ?? "",
        calories: editingMeal.calories?.toString() ?? "",
        protein: editingMeal.protein?.toString() ?? "",
        carbs: editingMeal.carbs?.toString() ?? "",
        fats: editingMeal.fats?.toString() ?? "",
      });
    }
  }, [editingMeal]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando diário de refeições...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Erro ao carregar diário de refeições</p>
          <p className="text-muted-foreground text-sm">
            Verifique sua conexão e tente novamente
          </p>
        </div>
      </div>
    );
  }

  const getMealIcon = (type: string) => {
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('café') || normalizedType === 'breakfast') {
      return <Coffee className="h-5 w-5 text-primary" />;
    }
    if (normalizedType.includes('almoço') || normalizedType === 'lunch') {
      return <Sun className="h-5 w-5 text-primary" />;
    }
    if (normalizedType.includes('lanche') || normalizedType === 'snack') {
      return <Apple className="h-5 w-5 text-primary" />;
    }
    if (normalizedType.includes('jantar') || normalizedType === 'dinner') {
      return <Moon className="h-5 w-5 text-primary" />;
    }
    return <Apple className="h-5 w-5 text-primary" />;
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja remover esta refeição?')) {
      deleteMeal(id);
    }
  };

  // Group meals by date
  const mealsByDate = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) {
      acc[meal.date] = [];
    }
    acc[meal.date].push(meal);
    return acc;
  }, {} as Record<string, typeof meals>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }
  };

  const getMealTypeInPortuguese = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'breakfast': 'Café da manhã',
      'lunch': 'Almoço',
      'snack': 'Lanche',
      'dinner': 'Jantar',
      'cafe_da_manha': 'Café da manhã',
      'almoco': 'Almoço',
      'lanche': 'Lanche',
      'jantar': 'Jantar'
    };
    return typeMap[type.toLowerCase()] || type;
  };

  if (meals.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Diário de Refeições</h1>
          <p className="text-muted-foreground">Histórico completo das suas refeições</p>
        </div>
        
        <div className="text-center py-12">
          <Apple className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-lg text-muted-foreground mb-2">Nenhuma refeição encontrada</p>
          <p className="text-sm text-muted-foreground">
            Comece enviando uma foto da sua refeição pelo WhatsApp!
          </p>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal) return;

    updateMeal(
      {
        id: editingMeal.id,
        name: formData.name,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        carbs: parseFloat(formData.carbs),
        fats: parseFloat(formData.fats),
      },
      {
        onSuccess: () => setEditingMeal(null),
      }
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Diário de Refeições</h1>
        <p className="text-muted-foreground">Histórico completo das suas refeições</p>
      </div>

      <div className="space-y-6">
        {Object.entries(mealsByDate).map(([date, dateMeals]) => (
          <div key={date} className="space-y-3">
            <h2 className="text-xl font-semibold sticky top-0 bg-background py-2 z-10">
              {formatDate(date)}
            </h2>
            {dateMeals.map((meal) => (
              <Card key={meal.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      {getMealIcon(meal.type)}
                      <span>{getMealTypeInPortuguese(meal.type)}</span>
                      <span className="text-sm text-muted-foreground font-normal">{meal.time}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(meal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(meal.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-medium">{meal.name}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-semibold">{meal.calories} kcal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-protein" />
                      <span>{meal.protein}g proteína</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-carbs" />
                      <span>{meal.carbs}g carboidrato</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-fats" />
                      <span>{meal.fats}g gordura</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={(open) => { if (!open) setEditingMeal(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Refeição</DialogTitle>
            <DialogDescription>Atualize as informações da refeição selecionada.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calorias (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  step="0.1"
                  value={formData.calories}
                  onChange={(e) => setFormData((s) => ({ ...s, calories: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Proteínas (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={formData.protein}
                  onChange={(e) => setFormData((s) => ({ ...s, protein: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carboidratos (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={formData.carbs}
                  onChange={(e) => setFormData((s) => ({ ...s, carbs: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fats">Gorduras (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  step="0.1"
                  value={formData.fats}
                  onChange={(e) => setFormData((s) => ({ ...s, fats: e.target.value }))}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealDiary;
