export function normalizePhone(input: string): string {
  if (!input) return "";
  // Mantém apenas dígitos
  let digits = input.replace(/\D+/g, "");
  // Se não começar com 55 e tiver 10-11 dígitos (BR), prefixa 55
  if (!digits.startsWith("55") && digits.length >= 10 && digits.length <= 11) {
    digits = "55" + digits;
  }
  return digits;
}