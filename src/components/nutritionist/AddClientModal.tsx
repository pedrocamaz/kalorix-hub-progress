import { useState } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
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
import { useNutritionistClients } from '@/hooks/useNutritionistClients';
import { validateShareCode, normalizeShareCode } from '@/lib/shareCode';

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddClientModal({ open, onClose, onSuccess }: AddClientModalProps) {
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { addClientByCode } = useNutritionistClients();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedCode = normalizeShareCode(shareCode);
    
    if (!validateShareCode(normalizedCode)) {
      alert('Código inválido. O formato deve ser: KALO-XXXX-YYYY');
      return;
    }

    setLoading(true);
    try {
      const success = await addClientByCode(normalizedCode);
      
      if (success) {
        setShareCode('');
        onClose();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setShareCode('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />
            Adicionar Cliente
          </DialogTitle>
          <DialogDescription>
            Digite o código de compartilhamento que o cliente forneceu
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shareCode">Código de Compartilhamento</Label>
              <Input
                id="shareCode"
                placeholder="KALO-XXXX-YYYY"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                className="font-mono text-center text-lg tracking-wider"
                maxLength={14}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Formato: KALO-XXXX-YYYY (ex: KALO-A1B2-C3D4)
              </p>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Dica:</strong> O cliente pode encontrar este código na seção de perfil do aplicativo.
              </p>
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
              className="bg-green-600 hover:bg-green-700"
              disabled={loading || !shareCode}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
