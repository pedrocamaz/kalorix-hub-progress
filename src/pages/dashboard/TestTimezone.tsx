import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { normalizePhone } from '@/lib/phone';

export default function TestTimezone() {
  const userPhone = localStorage.getItem('sessionPhone') || '';
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testTime, setTestTime] = useState('22:00');
  const [results, setResults] = useState<any>(null);

  const insertTestMeal = async () => {
    try {
      const phone = normalizePhone(userPhone);
      
      const { data, error } = await supabase
        .from('registros_alimentares')
        .insert({
          usuario_telefone: phone,
          data_consumo: testDate,
          hora_consumo: testTime,
          nome_alimento: 'Teste timezone 22h',
          tipo_refeicao: 'Jantar',
          calorias: 500,
          proteinas: 30,
          carboidratos: 50,
          gorduras: 20,
        })
        .select();

      if (error) throw error;

      console.log('✅ Teste inserido:', data);
      toast.success('Teste inserido com sucesso!');
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao inserir teste:', error);
      toast.error('Erro ao inserir teste: ' + error.message);
      throw error;
    }
  };

  const checkDashboard = async () => {
    try {
      const phone = normalizePhone(userPhone);
      
      console.log('📞 Testando RPC com telefone:', phone);

      // 🔥 CORREÇÃO: Passa o parâmetro p_telefone
      const { data, error } = await supabase.rpc('get_dashboard_data_today_brt', {
        p_telefone: phone
      });

      if (error) {
        console.error('❌ Erro RPC:', error);
        toast.error('Erro na RPC: ' + error.message);
        throw error;
      }

      console.log('✅ Dashboard data:', data);
      
      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      
      setResults({
        raw: data,
        parsed: result,
        refeicoes_hoje: result?.refeicoes_hoje || [],
        calorias_consumidas: result?.calorias_consumidas || 0,
        meta_calorias: result?.meta_calorias || 0,
      });

      toast.success('Dashboard verificado! Veja o console (F12)');
    } catch (error: any) {
      console.error('❌ Erro ao verificar dashboard:', error);
      toast.error('Erro: ' + error.message);
    }
  };

  const testBothTimezones = async () => {
    try {
      const phone = normalizePhone(userPhone);
      
      console.log('\n🧪 === TESTE DE TIMEZONE ===');
      
      // 1. Data atual do sistema (pode estar em UTC no servidor)
      console.log('🕐 Data/hora do sistema:', new Date().toISOString());
      
      // 2. Data em BRT forçado (America/Sao_Paulo)
      const { data: brtData, error: brtError } = await supabase.rpc('get_dashboard_data_today_brt', {
        p_telefone: phone
      });
      
      if (brtError) throw brtError;
      
      console.log('🇧🇷 Dados BRT (correto):', brtData);
      
      // 3. Query direta (pode usar UTC - ERRADO)
      const today = new Date().toISOString().split('T')[0];
      const { data: directData, error: directError } = await supabase
        .from('registros_alimentares')
        .select('*')
        .eq('usuario_telefone', phone)
        .eq('data_consumo', today);
      
      if (directError) throw directError;
      
      console.log('🌍 Query direta (pode estar errada):', directData);
      
      // Comparação
      const brtCount = (brtData?.[0]?.refeicoes_hoje || []).length;
      const directCount = directData?.length || 0;
      
      console.log('\n📊 RESULTADO:');
      console.log(`- RPC BRT encontrou: ${brtCount} refeições`);
      console.log(`- Query direta encontrou: ${directCount} refeições`);
      
      if (brtCount === directCount) {
        console.log('✅ Timezones estão alinhados!');
        toast.success('Timezones corretos! ✅');
      } else {
        console.log('⚠️ DIFERENÇA DETECTADA - timezone pode estar errado!');
        toast.warning(`Divergência: RPC=${brtCount}, Direct=${directCount}`);
      }
      
      setResults({
        brt: brtData?.[0],
        direct: directData,
        comparison: { brtCount, directCount },
      });
      
    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      toast.error('Erro: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🧪 Teste de Timezone</h1>
        <p className="text-muted-foreground">
          Valida se refeições às 22h aparecem no dia correto (BRT)
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Seu telefone: <code className="bg-secondary px-2 py-1 rounded">{userPhone}</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Inserir Refeição de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={testTime}
              onChange={(e) => setTestTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Configure 22:00 para testar o bug de timezone
            </p>
          </div>

          <Button onClick={insertTestMeal} className="w-full">
            Inserir Teste
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Verificar Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkDashboard} className="w-full" variant="secondary">
            Verificar Dashboard (RPC BRT)
          </Button>
          
          <Button onClick={testBothTimezones} className="w-full" variant="outline">
            🧪 Testar Ambos Timezones (Comparação)
          </Button>

          {results && (
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold mb-2">Resultados:</h3>
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Como Interpretar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ <strong>Correto:</strong> Refeição às 22h aparece no dashboard do mesmo dia</p>
          <p>❌ <strong>Errado:</strong> Refeição às 22h "pula" para o dia seguinte</p>
          <p className="text-muted-foreground">
            Abra o Console (F12) para ver logs detalhados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
