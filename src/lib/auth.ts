import { supabase } from "@/lib/supabaseClient";
import { normalizePhone } from "@/lib/phone";

export async function createMagicLink(phone: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase.from("magic_links").insert({
    token,
    phone,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Error creating magic link:", error);
    throw error;
  }

  const origin = (typeof window !== 'undefined' && window.location?.origin) || import.meta.env.VITE_APP_BASE_URL || 'http://localhost:8080';
  return `${origin}/auth/callback?token=${encodeURIComponent(token)}`;
}

export async function verifyMagicLinkToken(token: string): Promise<{ phone: string } | null> {
  const { data, error } = await supabase
    .from("magic_links")
    .select("token, phone, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("verifyMagicLinkToken: select error", error);
    return null;
  }

  if (!data) {
    console.warn("verifyMagicLinkToken: no row for token");
    return null;
  }

  const phone = (data as any).phone;
  const expiresAt = new Date(data.expires_at).getTime();
  const isExpired = Number.isFinite(expiresAt) ? expiresAt < Date.now() : true;
  const isUsed = !!data.used_at;

  if (!phone) {
    console.warn("verifyMagicLinkToken: missing phone column");
    return null;
  }
  if (isExpired || isUsed) {
    console.warn("verifyMagicLinkToken: invalid link", { isExpired, isUsed, expires_at: data.expires_at, used_at: data.used_at });
    return null;
  }

  const { error: updateError } = await supabase
    .from("magic_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null);

  if (updateError) {
    console.error("verifyMagicLinkToken: update used_at error", updateError);
    return null;
  }

  // Retorna telefone normalizado para salvar na sessão
  return { phone: normalizePhone(phone) };
}

// ==============================================
// AUTENTICAÇÃO DE NUTRICIONISTAS
// ==============================================

export interface NutritionistSignupData {
  email: string;
  password: string;
  fullName: string;
  crn?: string;
  phone?: string;
  specialization?: string;
}

export interface NutritionistProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  crn?: string;
  specialization?: string;
  phone?: string;
  profile_image_url?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Cadastra um novo nutricionista no sistema
 * Cria usuário no Supabase Auth - o perfil é criado via RPC no frontend
 */
export async function signUpNutritionist(data: NutritionistSignupData) {
  const { email, password, fullName } = data;

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_type: 'nutritionist',
        full_name: fullName,
      }
    }
  });

  if (authError) {
    console.error("Error signing up nutritionist:", authError);
    throw authError;
  }

  if (!authData.user) {
    throw new Error("Falha ao criar usuário");
  }

  return authData;
}

/**
 * Faz login de nutricionista via email/senha
 */
export async function signInNutritionist(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in nutritionist:", error);
    throw error;
  }

  // Verificar se é realmente um nutricionista
  const userType = data.user?.user_metadata?.user_type;
  if (userType !== 'nutritionist') {
    // Fazer logout se não for nutricionista
    await supabase.auth.signOut();
    throw new Error('Esta conta não é de um nutricionista. Use o login via WhatsApp.');
  }

  return data;
}

/**
 * Retorna o tipo de usuário logado
 */
export async function getUserRole(): Promise<'client' | 'nutritionist' | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  return user.user_metadata?.user_type || 'client';
}

/**
 * Busca o perfil completo do nutricionista logado
 */
export async function getNutritionistProfile(): Promise<NutritionistProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('nutritionists')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching nutritionist profile:", error);
    return null;
  }

  return data;
}

/**
 * Atualiza o perfil do nutricionista
 */
export async function updateNutritionistProfile(
  updates: Partial<Pick<NutritionistProfile, 'full_name' | 'crn' | 'specialization' | 'phone' | 'bio' | 'profile_image_url'>>
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { error } = await supabase
    .from('nutritionists')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error("Error updating nutritionist profile:", error);
    throw error;
  }
}

/**
 * Verifica se o usuário atual é um nutricionista
 */
export async function isNutritionist(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'nutritionist';
}