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

  const origin = window.location.origin;
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