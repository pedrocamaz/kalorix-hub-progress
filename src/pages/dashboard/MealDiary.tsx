import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Coffee, Sun, Moon, Apple } from "lucide-react";
import { toast } from "sonner";

const MealDiary = () => {
  // Mock meal data
  const meals = [
    { id: 1, date: "2025-01-15", time: "19:30", type: "Jantar", name: "Salmão grelhado com legumes", calories: 700, protein: 45, carbs: 25, fats: 35 },
    { id: 2, date: "2025-01-15", time: "16:00", type: "Lanche", name: "Iogurte natural com granola", calories: 180, protein: 12, carbs: 20, fats: 6 },
    { id: 3, date: "2025-01-15", time: "12:45", type: "Almoço", name: "Frango grelhado com arroz integral e salada", calories: 650, protein: 48, carbs: 65, fats: 18 },
    { id: 4, date: "2025-01-15", time: "08:30", type: "Café da manhã", name: "Pão integral com ovo mexido", calories: 320, protein: 18, carbs: 35, fats: 12 },
    { id: 5, date: "2025-01-14", time: "20:00", type: "Jantar", name: "Filé de frango com batata doce", calories: 580, protein: 42, carbs: 55, fats: 15 },
    { id: 6, date: "2025-01-14", time: "15:30", type: "Lanche", name: "Shake de proteína com banana", calories: 250, protein: 30, carbs: 28, fats: 4 },
  ];

  const getMealIcon = (type: string) => {
    switch (type) {
      case "Café da manhã":
        return <Coffee className="h-5 w-5 text-primary" />;
      case "Almoço":
        return <Sun className="h-5 w-5 text-primary" />;
      case "Lanche":
        return <Apple className="h-5 w-5 text-primary" />;
      case "Jantar":
        return <Moon className="h-5 w-5 text-primary" />;
      default:
        return <Apple className="h-5 w-5 text-primary" />;
    }
  };

  const handleEdit = (id: number) => {
    toast.info("Função de edição em desenvolvimento");
  };

  const handleDelete = (id: number) => {
    toast.success("Refeição removida com sucesso!");
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
                      <span>{meal.type}</span>
                      <span className="text-sm text-muted-foreground font-normal">{meal.time}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(meal.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(meal.id)}
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
    </div>
  );
};

export default MealDiary;
