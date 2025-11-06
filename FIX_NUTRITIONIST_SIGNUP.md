# 🐛 Fix: Erro no Signup de Nutricionistas

## Problema Identificado

Ao tentar criar uma conta de nutricionista, ocorreram 2 erros:

### 1. **Erro de RLS (Row Level Security)**
```
Error creating nutritionist profile: 
{code: '42501', message: 'new row violates row-level security policy for table "nutritionists"'}
```

**Causa:** A tabela `nutritionists` não tinha uma policy para permitir INSERT durante o signup.

### 2. **Conflito de Chave Primária**
```
Error creating user record: 
{code: '23505', details: 'Key (id)=(xxx) already exists.'}
```

**Causa:** Tentativa de INSERT quando o registro já existe.

---

## Solução Implementada

### 1. **Adicionar Policy de INSERT**

Execute no Supabase SQL Editor:

```sql
CREATE POLICY "nutritionists_can_insert_own_profile" 
ON public.nutritionists
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

Esta policy permite que um usuário autenticado crie seu próprio perfil de nutricionista.

### 2. **Usar UPSERT ao invés de INSERT**

Modificado em `src/lib/auth.ts`:

**Antes:**
```typescript
const { error: userError } = await supabase
  .from('users')
  .insert({
    id: authData.user.id,
    // ...
  });
```

**Depois:**
```typescript
const { error: userError } = await supabase
  .from('users')
  .upsert({
    id: authData.user.id,
    // ...
  }, {
    onConflict: 'id'
  });
```

### 3. **Adicionar Delay para Sessão**

Adicionado um pequeno delay após criar o usuário no Auth para garantir que a sessão seja estabelecida antes de tentar criar o perfil:

```typescript
await new Promise(resolve => setTimeout(resolve, 500));
```

---

## Como Aplicar o Fix

### Passo 1: Executar Migration SQL

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole e execute o conteúdo de: `migrations/002_fix_nutritionist_signup.sql`

OU execute diretamente:

```sql
CREATE POLICY "nutritionists_can_insert_own_profile" 
ON public.nutritionists
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Passo 2: Código já Atualizado

O código em `src/lib/auth.ts` já foi corrigido automaticamente.

### Passo 3: Testar Novamente

1. Recarregue a página: `http://localhost:8080/nutritionist/signup`
2. Preencha o formulário
3. Clique em "Criar Conta Profissional"
4. Deve funcionar agora! ✅

---

## Verificação

Para verificar se a policy foi criada corretamente:

```sql
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'nutritionists'
AND policyname = 'nutritionists_can_insert_own_profile';
```

Deve retornar:
```
policyname: nutritionists_can_insert_own_profile
cmd: INSERT
with_check: (auth.uid() = user_id)
```

---

## Políticas Completas da Tabela `nutritionists`

Após aplicar o fix, as policies devem ser:

| Policy Name | Command | Description |
|------------|---------|-------------|
| `nutritionists_view_own_profile` | SELECT | Ver próprio perfil |
| `nutritionists_update_own_profile` | UPDATE | Atualizar próprio perfil |
| `nutritionists_can_insert_own_profile` | INSERT | Criar próprio perfil ✨ **NOVA** |

---

## Testando o Signup

### Fluxo Correto:

1. **Usuário preenche formulário**
   - Nome, email, senha, CRN, etc.

2. **Supabase Auth cria usuário**
   - Email e senha são validados
   - UUID é gerado

3. **Registro na tabela `users` (opcional)**
   - UPSERT para evitar conflito
   - Se já existe, atualiza

4. **Delay de 500ms**
   - Garante que sessão está ativa

5. **Criação do perfil em `nutritionists`**
   - INSERT é permitido pela policy
   - RLS valida: `auth.uid() = user_id`

6. **Sucesso!**
   - Toast: "Conta criada com sucesso!"
   - Email de confirmação enviado

---

## Possíveis Erros Ainda

Se ainda houver erros:

### "Email already registered"
- **Causa:** Email já foi usado
- **Solução:** Use outro email ou recupere a senha

### "Password should be at least 6 characters"
- **Causa:** Senha muito curta
- **Solução:** Use senha com 6+ caracteres

### "Email not confirmed"
- **Causa:** Email ainda não foi confirmado
- **Solução:** Verifique sua caixa de entrada

### "Invalid email"
- **Causa:** Formato de email inválido
- **Solução:** Use um email válido

---

## Estrutura de RLS Completa

```sql
-- TABELA: nutritionists
-- RLS: ENABLED

-- Policy 1: Permitir SELECT do próprio perfil
CREATE POLICY "nutritionists_view_own_profile" 
ON public.nutritionists FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Permitir UPDATE do próprio perfil
CREATE POLICY "nutritionists_update_own_profile" 
ON public.nutritionists FOR UPDATE
USING (auth.uid() = user_id);

-- Policy 3: Permitir INSERT do próprio perfil (FIX)
CREATE POLICY "nutritionists_can_insert_own_profile" 
ON public.nutritionists FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## Status

- ✅ Código corrigido em `auth.ts`
- ✅ Migration SQL criada
- ⏳ **Aguardando:** Executar migration no Supabase
- ⏳ **Próximo:** Testar signup novamente

---

## Checklist de Verificação

Antes de testar:
- [ ] Migration `002_fix_nutritionist_signup.sql` executada
- [ ] Policy aparece em `pg_policies`
- [ ] Código atualizado (já está ✅)
- [ ] Servidor reiniciado

Após testar:
- [ ] Signup funciona sem erros
- [ ] Perfil criado em `nutritionists`
- [ ] Email de confirmação recebido
- [ ] Login funciona após confirmar email

---

**Execute a migration SQL agora e teste novamente!** 🚀
