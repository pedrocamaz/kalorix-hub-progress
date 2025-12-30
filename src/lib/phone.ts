/**
 * Normaliza número de telefone para formato internacional
 * Suporta Brasil (+55) e EUA (+1)
 */
export function normalizePhone(input: string): string {
  if (!input) return "";
  
  // Remove todos os caracteres não-numéricos
  let digits = input.replace(/\D+/g, "");
  
  // Telefone dos EUA: começa com 1 e tem 11 dígitos no total
  if (digits.startsWith("1") && digits.length === 11) {
    return digits; // Retorna como está: 1XXXXXXXXXX
  }
  
  // Telefone brasileiro: adiciona 55 se necessário
  if (!digits.startsWith("55") && digits.length >= 10 && digits.length <= 11) {
    digits = "55" + digits;
  }
  
  // Telefone brasileiro já com 55
  if (digits.startsWith("55") && digits.length === 13) {
    return digits;
  }
  
  // Se já começar com 1 mas tiver menos de 11 dígitos, retorna como está
  // (permite entrada progressiva durante digitação)
  if (digits.startsWith("1")) {
    return digits;
  }
  
  return digits;
}

/**
 * Formata telefone para exibição com máscara
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";
  
  const digits = phone.replace(/\D+/g, "");
  
  // Formato EUA: +1 (XXX) XXX-XXXX
  if (digits.startsWith("1") && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Formato Brasil: +55 (XX) XXXXX-XXXX
  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  
  return phone;
}