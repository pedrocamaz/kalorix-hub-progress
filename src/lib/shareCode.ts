/**
 * Utilitários para gerenciar códigos de compartilhamento de clientes
 * Formato: KALO-XXXX-YYYY
 */

/**
 * Valida se um código de compartilhamento está no formato correto
 * @param code - Código a ser validado
 * @returns true se o código é válido
 */
export function validateShareCode(code: string): boolean {
  if (!code) return false;
  
  // Remove espaços extras
  const cleanCode = code.trim().toUpperCase();
  
  // Formato: KALO-XXXX-YYYY (4 caracteres + 4 caracteres alfanuméricos)
  const regex = /^KALO-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return regex.test(cleanCode);
}

/**
 * Formata um código para exibição com separadores
 * @param code - Código a ser formatado
 * @returns Código formatado ou string vazia se inválido
 */
export function formatShareCode(code: string): string {
  if (!code) return '';
  
  // Remove espaços e converte para maiúsculas
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Formato esperado: KALOXXXXXXXX (sem separadores)
  if (cleanCode.startsWith('KALO')) {
    const withoutPrefix = cleanCode.substring(4);
    if (withoutPrefix.length === 8) {
      return `KALO-${withoutPrefix.substring(0, 4)}-${withoutPrefix.substring(4)}`;
    }
  }
  
  return code;
}

/**
 * Normaliza um código para armazenamento/busca
 * Remove espaços, converte para maiúsculas
 * @param code - Código a ser normalizado
 * @returns Código normalizado
 */
export function normalizeShareCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}

/**
 * Copia um código para a área de transferência
 * @param code - Código a ser copiado
 * @returns Promise que resolve quando a cópia é bem-sucedida
 */
export async function copyShareCodeToClipboard(code: string): Promise<void> {
  if (!code) {
    throw new Error('Código inválido');
  }
  
  try {
    await navigator.clipboard.writeText(code);
  } catch (error) {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = code;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Gera um código de exemplo para demonstração (apenas visual)
 * NÃO usar em produção - códigos reais vêm do backend
 */
export function generateExampleShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KALO-${part1}-${part2}`;
}

/**
 * Compartilha código via Web Share API (mobile)
 * @param code - Código a ser compartilhado
 * @param clientName - Nome do cliente (opcional)
 */
export async function shareCodeViaNative(code: string, clientName?: string): Promise<void> {
  if (!navigator.share) {
    throw new Error('Compartilhamento não suportado neste navegador');
  }
  
  const text = clientName 
    ? `Meu código Kalorix é: ${code}\n\nCompartilhe com seu nutricionista!`
    : `Código Kalorix: ${code}`;
  
  await navigator.share({
    title: 'Código Kalorix',
    text,
  });
}
