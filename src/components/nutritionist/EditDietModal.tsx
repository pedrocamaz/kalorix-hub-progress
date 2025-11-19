import { useState, useEffect } from 'react';
import { Flame, Beef, Wheat, Droplet, Save, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useNutritionistClients, MacroData } from '@/hooks/useNutritionistClients';

interface EditDietModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientId: string;
  clientName: string;
  currentDiet?: MacroData;
}

export default function EditDietModal({
  open,
  onClose,
  onSuccess,
  clientId,
  clientName,
  currentDiet,
}: EditDietModalProps) {
  const { updateDiet } = useNutritionistClients();
  const [loading, setLoading] = useState(false);
  const [dietaDinamica, setDietaDinamica] = useState(currentDiet?.dieta_dinamica ?? true); // 🔥 Estado do tipo de dieta
  const [macros, setMacros] = useState<MacroData>({
    calories: currentDiet?.calories || 2000,
    protein: currentDiet?.protein || 150,
    carbs: currentDiet?.carbs || 200,
    fat: currentDiet?.fat || 60,
    dieta_dinamica: currentDiet?.dieta_dinamica ?? true,
  });

  // Update when currentDiet changes
  useEffect(() => {
    if (currentDiet) {
      setMacros(currentDiet);
      setDietaDinamica(currentDiet.dieta_dinamica ?? true);
    }
  }, [currentDiet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const success = await updateDiet(clientId, macros);
      
      if (success) {
        onClose();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Editar Dieta: {clientName}
          </DialogTitle>
          <DialogDescription>
            Ajuste os macros e metas calóricas do cliente
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-calories" className="flex items-center gap-2 text-base">
                <Flame className="h-5 w-5 text-orange-500" />
                Calorias Diárias
              </Label>
              <Input
                id="edit-calories"
                type="number"
                value={macros.calories}
                onChange={(e) => setMacros({ ...macros, calories: parseInt(e.target.value) || 0 })}
                className="text-lg font-semibold"
                min="1000"
                max="5000"
                step="50"
              />
              <Badge variant="outline" className="mt-1">Meta calórica total</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-protein" className="flex items-center gap-2">
                <Beef className="h-4 w-4 text-red-500" />
                Proteínas
              </Label>
              <Input
                id="edit-protein"
                type="number"
                value={macros.protein}
                onChange={(e) => setMacros({ ...macros, protein: parseFloat(e.target.value) || 0 })}
                min="50"
                max="500"
                step="5"
              />
              <Badge variant="secondary" className="text-xs">
                {Math.round((macros.protein * 4 / macros.calories) * 100)}% das calorias
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-carbs" className="flex items-center gap-2">
                <Wheat className="h-4 w-4 text-amber-600" />
                Carboidratos
              </Label>
              <Input
                id="edit-carbs"
                type="number"
                value={macros.carbs}
                onChange={(e) => setMacros({ ...macros, carbs: parseFloat(e.target.value) || 0 })}
                min="50"
                max="500"
                step="5"
              />
              <Badge variant="secondary" className="text-xs">
                {Math.round((macros.carbs * 4 / macros.calories) * 100)}% das calorias
              </Badge>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-fat" className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-yellow-500" />
                Gorduras
              </Label>
              <Input
                id="edit-fat"
                type="number"
                value={macros.fat}
                onChange={(e) => setMacros({ ...macros, fat: parseFloat(e.target.value) || 0 })}
                min="20"
                max="200"
                step="5"
              />
              <Badge variant="secondary" className="text-xs">
                {Math.round((macros.fat * 9 / macros.calories) * 100)}% das calorias
              </Badge>
            </div>
          </div>

          {/* Visual Distribution */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium mb-3">Distribuição Visual:</p>
            <div className="flex h-6 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${(macros.protein * 4 / macros.calories) * 100}%` }}
              >
                P
              </div>
              <div 
                className="bg-amber-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${(macros.carbs * 4 / macros.calories) * 100}%` }}
              >
                C
              </div>
              <div 
                className="bg-yellow-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${(macros.fat * 9 / macros.calories) * 100}%` }}
              >
                G
              </div>
            </div>
          </div>

          {/* 🔥 TOGGLE TIPO DE DIETA */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="editDietaDinamica"
                checked={dietaDinamica}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setDietaDinamica(newValue);
                  setMacros({ ...macros, dieta_dinamica: newValue });
                }}
                className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                disabled={loading}
              />
              <div className="flex-1">
                <label htmlFor="editDietaDinamica" className="block text-sm font-semibold text-purple-900 dark:text-purple-100 cursor-pointer">
                  🔥 Dieta Dinâmica
                </label>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  <strong>Ativado:</strong> Treinos adicionam calorias. <strong>Desativado:</strong> Meta fixa, treinos só controle.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}