# 🛡️ Checklist de Segurança - Migration Nutricionistas

## ✅ Garantias de Não-Destrutividade

### 🔒 O que NÃO será alterado:

1. **Tabelas Existentes** - Estrutura preservada
   - ✅ `users` - Apenas adiciona colunas opcionais (nullable)
   - ✅ `registros_alimentares` - Sem alterações
   - ✅ `dietas` - Sem alterações
   - ✅ `registros_treino` - Sem alterações
   - ✅ `free_trials` - Sem alterações
   - ✅ `estados_conversa` - Sem alterações
   - ✅ Todas as outras tabelas permanecem intocadas

2. **Row Level Security (RLS)**
   - ✅ NENHUMA policy será adicionada às tabelas existentes
   - ✅ Tabelas antigas continuam com as mesmas regras de acesso
   - ✅ RLS ativo APENAS nas novas tabelas de nutricionistas

3. **Dados Existentes**
   - ✅ NENHUM dado será modificado automaticamente
   - ✅ UPDATE de share_code está COMENTADO (opcional)
   - ✅ Usuários existentes não são afetados

4. **Funcionalidades Atuais**
   - ✅ Login via WhatsApp continua funcionando
   - ✅ Registro de refeições continua normal
   - ✅ Dashboard de clientes continua igual
   - ✅ Todas as features atuais preservadas

---

## 🆕 O que será ADICIONADO (Isolado):

### Novas Tabelas (100% independentes):

1. **`nutritionists`**
   - Nova tabela para perfis de nutricionistas
   - Não afeta usuários existentes
   - RLS habilitado desde o início

2. **`nutritionist_clients`**
   - Relacionamento nutricionista-cliente
   - Tabela de vínculo isolada
   - Não altera comportamento de clientes

3. **`nutritionist_notes`**
   - Anotações dos nutricionistas
   - Completamente nova funcionalidade

4. **`nutritionist_goals`**
   - Metas definidas por nutricionistas
   - Feature adicional

### Novas Colunas (Opcionais e Seguras):

**`users.share_code`**
- ✅ Nullable (não obrigatório)
- ✅ Não quebra queries existentes
- ✅ Geração é opcional (trigger desabilitado)
- ✅ Unique constraint seguro

**`users.user_type`**
- ✅ Default 'client' para compatibilidade
- ✅ Nullable para não forçar valor
- ✅ Usuários existentes não são afetados

### Novas Funções (Helpers Seguros):

1. **`generate_share_code()`** - Gera códigos únicos
2. **`add_client_by_share_code()`** - Adiciona clientes de forma segura
3. **`get_client_meals()`** - Acessa refeições COM validação
4. **`get_client_diet()`** - Acessa dieta COM validação
5. **`get_client_workouts()`** - Acessa treinos COM validação

Todas usam `SECURITY DEFINER` com validação de permissões.

### Novas Views (Read-only):

1. **`nutritionist_dashboard_summary`** - Métricas agregadas
2. **`nutritionist_client_details`** - Detalhes dos clientes

Views não modificam dados, apenas facilitam leitura.

---

## 🧪 Como Testar com Segurança

### Passo 1: Executar em Ambiente de Desenvolvimento

```sql
-- NO AMBIENTE DE DEV, execute:
BEGIN;

-- Cole todo o conteúdo da migration aqui

-- Verifique se criou as tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'nutritionist%';

-- Se tudo OK, confirme:
COMMIT;

-- Se algo deu errado, reverte:
-- ROLLBACK;
```

### Passo 2: Testar Funcionalidades Existentes

Após executar a migration, teste:

```sql
-- 1. Verificar que users ainda funciona
SELECT id, telefone, nome FROM users LIMIT 5;

-- 2. Verificar registros alimentares
SELECT * FROM registros_alimentares LIMIT 5;

-- 3. Verificar dietas
SELECT * FROM dietas LIMIT 5;

-- 4. Verificar que login ainda funciona
-- (fazer login via app)
```

### Passo 3: Verificar Novas Tabelas

```sql
-- Verificar se as novas tabelas foram criadas vazias
SELECT COUNT(*) FROM nutritionists; -- deve retornar 0
SELECT COUNT(*) FROM nutritionist_clients; -- deve retornar 0

-- Verificar se colunas foram adicionadas
SELECT share_code, user_type FROM users LIMIT 5;
```

---

## 🔧 Rollback (Se Necessário)

Se algo der errado, você pode reverter facilmente:

```sql
-- ROLLBACK COMPLETO (remove tudo que a migration criou)

BEGIN;

-- Remove tabelas novas
DROP TABLE IF EXISTS public.nutritionist_goals CASCADE;
DROP TABLE IF EXISTS public.nutritionist_notes CASCADE;
DROP TABLE IF EXISTS public.nutritionist_clients CASCADE;
DROP TABLE IF EXISTS public.nutritionists CASCADE;

-- Remove views
DROP VIEW IF EXISTS public.nutritionist_client_details CASCADE;
DROP VIEW IF EXISTS public.nutritionist_dashboard_summary CASCADE;

-- Remove funções
DROP FUNCTION IF EXISTS get_client_workouts CASCADE;
DROP FUNCTION IF EXISTS get_client_diet CASCADE;
DROP FUNCTION IF EXISTS get_client_meals CASCADE;
DROP FUNCTION IF EXISTS add_client_by_share_code CASCADE;
DROP FUNCTION IF EXISTS auto_generate_share_code CASCADE;
DROP FUNCTION IF EXISTS generate_share_code CASCADE;

-- Remove colunas adicionadas (SE QUISER)
-- CUIDADO: Só faça isso se ninguém estiver usando
-- ALTER TABLE public.users DROP COLUMN IF EXISTS share_code;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS user_type;

COMMIT;
```

---

## 📊 Análise de Impacto

### Impacto em Queries Existentes: **ZERO**

✅ Queries como `SELECT * FROM users` continuam funcionando  
✅ JOINs existentes não são afetados  
✅ Aplicação atual não precisa de alterações  
✅ APIs existentes continuam funcionando  

### Impacto em Performance: **MÍNIMO**

- ✅ Índices adicionados são pequenos
- ✅ Triggers não foram criados (share_code é opcional)
- ✅ Novas tabelas estão vazias
- ✅ Views são lazy (só executam quando chamadas)

### Impacto em Permissões: **NENHUM**

- ✅ RLS das tabelas antigas não foi tocado
- ✅ Acesso atual permanece igual
- ✅ Novas funcionalidades são opt-in

---

## 🎯 Plano de Implementação Seguro

### Fase 1: Setup (Sem Risco)
1. ✅ Executar migration no banco de dev
2. ✅ Testar se aplicação atual continua funcionando
3. ✅ Verificar se tabelas foram criadas

### Fase 2: Validação (Baixo Risco)
1. ✅ Criar um nutricionista de teste
2. ✅ Gerar share_code para um cliente de teste
3. ✅ Testar adicionar cliente via código
4. ✅ Verificar que dados são acessíveis via funções

### Fase 3: Produção (Controlado)
1. ✅ Executar migration em produção
2. ✅ Monitorar logs por 24h
3. ✅ Liberar feature gradualmente

---

## 🚨 Pontos de Atenção

### 1. Coluna `share_code`
**Status:** Seguro  
**Motivo:** Nullable, não afeta usuários existentes  
**Ação:** Você decide quando gerar códigos (descomente UPDATE)

### 2. Coluna `user_type`
**Status:** Seguro  
**Motivo:** Tem default 'client', compatível com sistema atual  
**Ação:** Nenhuma ação necessária

### 3. Funções SECURITY DEFINER
**Status:** Seguro  
**Motivo:** Têm validação de permissões interna  
**Ação:** Usar via application layer (hooks)

### 4. Views
**Status:** Seguro  
**Motivo:** Read-only, não modificam dados  
**Ação:** Usar para dashboard de nutricionistas

---

## ✨ Vantagens desta Abordagem

1. **Zero Downtime** - Aplicação atual não é afetada
2. **Reversível** - Fácil fazer rollback se necessário
3. **Testável** - Pode testar em dev sem risco
4. **Incremental** - Ativa features quando quiser
5. **Isolado** - Novas funcionalidades não interferem

---

## 📝 Checklist Antes de Executar

- [ ] Backup do banco de dados feito
- [ ] Testado em ambiente de desenvolvimento
- [ ] Aplicação atual testada e funcionando
- [ ] Entendimento de como fazer rollback
- [ ] Time avisado sobre a mudança
- [ ] Monitoramento ativo preparado

---

## 🎓 Resumo Executivo

### O que esta migration faz:
Adiciona infraestrutura para hub de nutricionistas **sem tocar** no sistema existente.

### Risco: **BAIXÍSSIMO** ✅

### Por quê é seguro:
- Apenas ADICIONA tabelas novas
- Apenas ADICIONA colunas opcionais
- NÃO modifica dados existentes
- NÃO altera RLS das tabelas atuais
- NÃO quebra queries existentes

### Você pode executar com confiança! 🚀

---

## 📞 Suporte

Se tiver dúvidas ou encontrar problemas:
1. Verifique os logs do Supabase
2. Execute queries de verificação acima
3. Use o script de rollback se necessário
4. Documente o erro para análise

**Esta migration foi projetada para ser 100% segura e não-destrutiva.**
