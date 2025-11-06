# 🏥 Arquitetura - Hub de Nutricionistas

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Banco de Dados](#banco-de-dados)
3. [Fluxo de Autenticação](#fluxo-de-autenticação)
4. [Estrutura do Código](#estrutura-do-código)
5. [Implementação Passo a Passo](#implementação-passo-a-passo)
6. [APIs e Hooks](#apis-e-hooks)

---

## 🎯 Visão Geral

### Conceito
O Hub de Nutricionistas permite que profissionais de nutrição:
- Criem conta com email e senha (autenticação Supabase)
- Adicionem clientes através de um código único
- Visualizem métricas e progresso dos clientes
- Façam anotações e definam metas

### Modelo de Acesso

**Clientes (Usuários Regulares):**
- Login via WhatsApp (magic link) - **MANTÉM COMO ESTÁ**
- Recebem um código único (ex: `KALO-A1B2-C3D4`)
- Compartilham código com seu nutricionista

**Nutricionistas:**
- Login via email/senha (Supabase Auth)
- Adiciona clientes pelo código
- Dashboard com visão consolidada de todos os clientes

---

## 🗄️ Banco de Dados

### Estrutura Atual (Mantida)
```
users (clientes)
├── id (uuid)
├── telefone (text)
├── nome (text)
├── email (text)
├── peso (numeric)
├── altura (integer)
├── idade (integer)
└── ... (outros campos existentes)

registros_alimentares
├── id (bigint)
├── usuario_id (uuid)
├── nome_alimento (text)
├── calorias (numeric)
├── proteinas (numeric)
└── ... (outros campos)

dietas
├── usuario_telefone (text)
├── calorias_diarias (numeric)
└── ... (macros e configurações)

registros_treino
├── usuario_telefone (text)
├── tipo_treino (text)
└── ... (dados de treino)
```

### Novas Tabelas

#### 1. users (modificada)
```sql
ALTER TABLE users ADD:
├── share_code (text UNIQUE) → 'KALO-XXXX-YYYY'
└── user_type (text) → 'client' | 'nutritionist'
```

#### 2. nutritionists (nova)
```sql
nutritionists
├── id (uuid)
├── user_id (uuid) → FK para users
├── full_name (text)
├── email (text UNIQUE)
├── crn (text) → Registro profissional
├── specialization (text)
├── phone (text)
├── profile_image_url (text)
├── bio (text)
├── is_active (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

#### 3. nutritionist_clients (nova)
```sql
nutritionist_clients
├── id (uuid)
├── nutritionist_id (uuid) → FK nutritionists
├── client_id (uuid) → FK users
├── added_at (timestamptz)
├── notes (text)
├── tags (text[]) → ['iniciante', 'hipertrofia']
├── is_active (boolean)
└── last_viewed_at (timestamptz)
```

#### 4. nutritionist_notes (nova)
```sql
nutritionist_notes
├── id (uuid)
├── nutritionist_id (uuid)
├── client_id (uuid)
├── note_type (text) → 'general' | 'diet' | 'progress' | 'alert'
├── title (text)
├── content (text)
├── is_pinned (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

#### 5. nutritionist_goals (nova)
```sql
nutritionist_goals
├── id (uuid)
├── nutritionist_id (uuid)
├── client_id (uuid)
├── goal_type (text) → 'weight' | 'calories' | 'macros' | 'activity'
├── target_value (numeric)
├── current_value (numeric)
├── unit (text) → 'kg', 'kcal', 'g'
├── target_date (date)
├── description (text)
├── is_achieved (boolean)
└── ... (timestamps)
```

### Views Criadas

#### nutritionist_dashboard_summary
Métricas agregadas para o dashboard principal:
- Total de clientes ativos
- Total de refeições na semana
- Média de calorias

#### nutritionist_client_details
Detalhes completos de cada cliente:
- Dados pessoais
- Última refeição
- Métricas dos últimos 7 dias

---

## 🔐 Fluxo de Autenticação

### Sistema Dual

```
┌─────────────────────────────────────────────────────────┐
│                    KALORIX HUB                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CLIENTES (App Mobile/Web)                             │
│  ├── Login via WhatsApp (Magic Link) ✅ MANTÉM         │
│  ├── Gera share_code automaticamente                   │
│  └── user_type = 'client'                              │
│                                                         │
│  NUTRICIONISTAS (Dashboard Web)                        │
│  ├── Login via Email/Senha (Supabase Auth) ✨ NOVO    │
│  ├── Cadastro com dados profissionais                  │
│  └── user_type = 'nutritionist'                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementação no Supabase

**1. Configurar Email Auth no Supabase:**
```
Dashboard > Authentication > Providers
└── Enable Email provider
```

**2. Função de Cadastro:**
```typescript
// src/lib/auth.ts
export async function signUpNutritionist(
  email: string, 
  password: string, 
  fullName: string,
  crn?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'nutritionist',
        full_name: fullName,
      }
    }
  });
  
  if (error) throw error;
  
  // Criar perfil de nutricionista
  if (data.user) {
    await supabase.from('nutritionists').insert({
      user_id: data.user.id,
      email,
      full_name: fullName,
      crn,
    });
  }
  
  return data;
}
```

**3. Verificar Tipo de Usuário:**
```typescript
export async function getUserRole() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.role || 'client';
}
```

---

## 📁 Estrutura do Código

### Novos Arquivos a Criar

```
src/
├── lib/
│   ├── shareCode.ts ✨ NOVO
│   │   ├── generateShareCode()
│   │   └── validateShareCode()
│   │
│   └── auth.ts (modificar)
│       ├── signUpNutritionist()
│       ├── signInNutritionist()
│       └── getUserRole()
│
├── hooks/
│   ├── useNutritionist.ts ✨ NOVO
│   │   ├── useNutritionistProfile()
│   │   ├── useNutritionistClients()
│   │   └── useClientMetrics()
│   │
│   └── useShareCode.ts ✨ NOVO
│       └── useGenerateShareCode()
│
├── pages/
│   ├── nutritionist/ ✨ NOVO
│   │   ├── NutritionistLogin.tsx
│   │   ├── NutritionistSignup.tsx
│   │   ├── NutritionistDashboard.tsx
│   │   ├── ClientsList.tsx
│   │   ├── AddClient.tsx
│   │   └── ClientDetails.tsx
│   │
│   └── dashboard/ (modificar)
│       └── Profile.tsx → Adicionar exibição do share_code
│
└── components/
    └── nutritionist/ ✨ NOVO
        ├── ClientCard.tsx
        ├── ClientMetricsChart.tsx
        ├── AddClientModal.tsx
        ├── ClientNotesPanel.tsx
        └── GoalsManager.tsx
```

---

## 🚀 Implementação Passo a Passo

### Fase 1: Setup do Banco (30 min)

**1. Executar Migration:**
```bash
# Via Supabase Dashboard
# SQL Editor > New Query > Cole o conteúdo de:
migrations/001_add_nutritionist_feature.sql
```

**2. Verificar Tabelas:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'nutritionist%';
```

**3. Testar Geração de Código:**
```sql
-- Deve retornar códigos únicos
SELECT generate_share_code(gen_random_uuid());
SELECT generate_share_code(gen_random_uuid());
```

---

### Fase 2: Autenticação (2-3 horas)

**1. Criar `src/lib/shareCode.ts`:**
```typescript
export function generateShareCode(userId: string): string {
  const hash = userId.slice(0, 8).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KALO-${hash.slice(0, 4)}-${random}`;
}

export function validateShareCode(code: string): boolean {
  return /^KALO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

export function formatShareCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}
```

**2. Atualizar `src/lib/auth.ts`:**
```typescript
// Adicionar funções de nutricionista
export async function signUpNutritionist(
  email: string,
  password: string,
  fullName: string,
  crn?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_type: 'nutritionist',
        full_name: fullName,
      }
    }
  });

  if (error) throw error;

  // Criar registro na tabela nutritionists
  if (data.user) {
    const { error: profileError } = await supabase
      .from('nutritionists')
      .insert({
        user_id: data.user.id,
        email,
        full_name: fullName,
        crn,
      });

    if (profileError) throw profileError;
  }

  return data;
}

export async function signInNutritionist(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Verificar se é realmente um nutricionista
  const userType = data.user?.user_metadata?.user_type;
  if (userType !== 'nutritionist') {
    throw new Error('Usuário não é um nutricionista');
  }

  return data;
}

export async function getUserRole(): Promise<'client' | 'nutritionist' | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.user_type || 'client';
}
```

**3. Criar Hook de Autenticação:**
```typescript
// src/hooks/useNutritionistAuth.ts
import { useState } from 'react';
import { signUpNutritionist, signInNutritionist } from '@/lib/auth';
import { toast } from 'sonner';

export function useNutritionistAuth() {
  const [loading, setLoading] = useState(false);

  const signUp = async (email: string, password: string, fullName: string, crn?: string) => {
    setLoading(true);
    try {
      await signUpNutritionist(email, password, fullName, crn);
      toast.success('Conta criada! Verifique seu email.');
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInNutritionist(email, password);
      toast.success('Login realizado com sucesso!');
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { signUp, signIn, loading };
}
```

---

### Fase 3: Páginas de Login/Cadastro (2-3 horas)

**1. `src/pages/nutritionist/NutritionistLogin.tsx`:**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNutritionistAuth } from '@/hooks/useNutritionistAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NutritionistLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useNutritionistAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signIn(email, password);
    if (success) {
      navigate('/nutritionist/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login - Nutricionista</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Fase 4: Dashboard do Nutricionista (4-5 horas)

**Hook Principal:**
```typescript
// src/hooks/useNutritionistClients.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useNutritionistClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('nutritionist_client_details')
      .select('*')
      .order('added_at', { ascending: false });

    if (!error) {
      setClients(data || []);
    }
    setLoading(false);
  };

  const addClientByCode = async (shareCode: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .rpc('add_client_by_share_code', {
        p_nutritionist_user_id: user?.id,
        p_share_code: shareCode
      });

    if (error) throw error;
    
    await fetchClients();
    return data;
  };

  return { clients, loading, addClientByCode, refresh: fetchClients };
}
```

---

### Fase 5: Exibir Share Code no Perfil do Cliente (1 hora)

**Modificar `src/pages/dashboard/Profile.tsx`:**
```typescript
// Adicionar ao componente Profile
import { Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

// No JSX, adicionar card de compartilhamento:
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Share2 className="h-5 w-5" />
      Compartilhar com Nutricionista
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground mb-2">
      Compartilhe este código com seu nutricionista para que ele possa acompanhar seu progresso:
    </p>
    <div className="flex items-center gap-2">
      <code className="flex-1 px-4 py-2 bg-muted rounded-md text-lg font-mono tracking-wider">
        {userData?.share_code}
      </code>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          navigator.clipboard.writeText(userData?.share_code);
          toast.success('Código copiado!');
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 🔗 Rotas

### Adicionar ao Router

```typescript
// src/App.tsx ou router config
import NutritionistLogin from '@/pages/nutritionist/NutritionistLogin';
import NutritionistDashboard from '@/pages/nutritionist/NutritionistDashboard';

// Adicionar rotas:
<Route path="/nutritionist/login" element={<NutritionistLogin />} />
<Route path="/nutritionist/signup" element={<NutritionistSignup />} />
<Route 
  path="/nutritionist/dashboard" 
  element={<ProtectedRoute><NutritionistDashboard /></ProtectedRoute>} 
/>
```

---

## 📊 Métricas e Dashboard

### Cards Principais
1. **Total de Clientes**: Count de clientes ativos
2. **Média de Adesão**: % de clientes com registros na semana
3. **Consumo Médio**: Média de calorias dos clientes
4. **Alertas**: Clientes sem registro há X dias

### Gráficos Sugeridos
- Evolução de peso (linha temporal)
- Distribuição de macros (pizza)
- Consumo calórico semanal (barras)
- Taxa de adesão (gauge)

---

## 🔒 Segurança

### RLS Policies Implementadas

✅ Nutricionistas só veem seus próprios clientes
✅ Clientes podem ver apenas seu próprio share_code
✅ Nutricionistas podem acessar dados dos clientes vinculados
✅ Logs de acesso (last_viewed_at)

---

## 📱 Próximos Passos

### MVP (1-2 semanas)
- [ ] Executar migration no banco
- [ ] Implementar login/cadastro nutricionista
- [ ] Criar dashboard básico
- [ ] Exibir share_code no perfil do cliente
- [ ] Sistema de adicionar cliente por código

### Fase 2 (2-3 semanas)
- [ ] Gráficos e visualizações avançadas
- [ ] Sistema de anotações
- [ ] Definição de metas
- [ ] Exportação de relatórios PDF
- [ ] Notificações push

### Fase 3 (1 mês+)
- [ ] Chat nutricionista-cliente
- [ ] Planos alimentares personalizados
- [ ] Assinatura para nutricionistas
- [ ] App mobile específico para nutricionistas

---

## 🎨 Design System

### Cores Sugeridas
```typescript
// Nutricionista theme
nutritionist: {
  primary: '#10b981', // verde profissional
  secondary: '#3b82f6', // azul confiança
  accent: '#8b5cf6', // roxo destaque
}
```

### Componentes Reutilizáveis
- `<ClientCard />`: Card compacto com foto, nome, métricas
- `<MetricBadge />`: Badge colorido para indicadores
- `<ProgressChart />`: Gráfico de linha de evolução
- `<ShareCodeDisplay />`: Input formatado para código

---

## 📞 Suporte

Para dúvidas sobre implementação:
1. Verificar logs do Supabase
2. Testar queries no SQL Editor
3. Usar Supabase Studio para debug de RLS

**Documentação útil:**
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
