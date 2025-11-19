// --- 1. Puxar dados dos nós anteriores ---
const refeicoes = $items("Busca historico diario1")?.map(i => i.json) || [];
const treinos = $items("treinos")?.map(i => i.json) || [];
const dieta = $items("deita")?.[0]?.json || {};
const usuario = $items("users1")?.[0]?.json || {};

// --- 2. Dados fixos da dieta ---
const tmb = dieta.gasto_basal || dieta.tbm || 0;
const neat = dieta.neat || 0;
const metaBase = dieta.meta_base || 0;

// 🔥 NOVO: Verificar tipo de dieta (padrão = dinâmica)
const dietaDinamica = dieta.dieta_dinamica ?? true;

// --- 3. Somar calorias de exercícios ---
const caloriasExercicios = treinos.reduce((acc, t) => acc + (t.calorias_queimadas || 0), 0);

// --- 4. Somar calorias ingeridas ---
const caloriasIngeridas = refeicoes.reduce((acc, r) => acc + (r.calorias || 0), 0);

// --- 5. Ajuste baseado no objetivo ---
const objetivo = usuario.objetivo || 'maintenance';
let ajusteObjetivo = 0;
let objetivoLabel = '';

// Converte objetivo numérico antigo para string (retrocompatibilidade)
let objetivoNormalizado = objetivo;
if (objetivo === 1 || objetivo === '1') {
  objetivoNormalizado = 'lose_moderate';
} else if (objetivo === 2 || objetivo === '2') {
  objetivoNormalizado = 'maintenance';
} else if (objetivo === 3 || objetivo === '3') {
  objetivoNormalizado = 'gain_lean';
}

switch (objetivoNormalizado) {
  case 'lose_aggressive':
    ajusteObjetivo = -750;
    objetivoLabel = '🔥 Secar Tudo';
    break;
  case 'lose_moderate':
    ajusteObjetivo = -500;
    objetivoLabel = '🎯 Emagrecer Saudável';
    break;
  case 'maintenance':
    ajusteObjetivo = 0;
    objetivoLabel = '⚖️ Manter Peso';
    break;
  case 'gain_lean':
    ajusteObjetivo = 300;
    objetivoLabel = '📈 Ganho Limpo';
    break;
  case 'gain_aggressive':
    ajusteObjetivo = 500;
    objetivoLabel = '⚡ Hipertrofia Total';
    break;
  default:
    ajusteObjetivo = 0;
    objetivoLabel = '⚖️ Manter Peso';
}

// --- 6. Meta alvo do dia (CORRIGIDO) ---
// 🔥 Se dinâmica: soma exercícios | Se estática: NÃO soma (já incluído na base)
const metaAlvoDia = dietaDinamica 
  ? metaBase + caloriasExercicios 
  : metaBase;

// --- 7. Saldo calórico (ingestão - meta - ajuste) ---
const saldo = caloriasIngeridas - (metaAlvoDia + ajusteObjetivo);

// --- 8. Restante para meta ---
const restante = (metaAlvoDia + ajusteObjetivo) - caloriasIngeridas;

const metaAlvoDiaComObjetivo = metaAlvoDia + ajusteObjetivo;

// --- 9. Montar mensagem (AJUSTADA) ---
let mensagem = "📊 *Acompanhamento do seu dia*\n\n";
mensagem += `🎯 *Objetivo:* ${objetivoLabel}\n`;
mensagem += `📋 *Tipo de dieta:* ${dietaDinamica ? "🔥 Dinâmica (treinos somam)" : "⚡ Estática (treinos já incluídos)"}\n\n`;

// 🔥 Só mostra detalhes de exercícios se for dieta dinâmica
if (dietaDinamica && caloriasExercicios > 0) {
  mensagem += `🏋️ *Exercícios registrados hoje:* ${caloriasExercicios} kcal\n`;
  mensagem += `📌 *Meta Base:* ${metaBase} kcal\n`;
  mensagem += `📌 *Meta Alvo (base + exercícios):* ${metaAlvoDia} kcal\n`;
} else if (!dietaDinamica && caloriasExercicios > 0) {
  mensagem += `🏋️ *Exercícios registrados (controle):* ${caloriasExercicios} kcal\n`;
  mensagem += `📌 *Meta Base (já inclui atividade):* ${metaBase} kcal\n`;
  mensagem += `📌 *Meta Alvo:* ${metaAlvoDia} kcal\n`;
} else {
  mensagem += `📌 *Meta Base do dia:* ${metaBase} kcal\n`;
}

mensagem += `📌 *Ajuste aplicado pelo objetivo:* ${ajusteObjetivo > 0 ? "+" : ""}${ajusteObjetivo} kcal\n`;
mensagem += `📌 *Meta final do dia:* ${metaAlvoDiaComObjetivo} kcal\n\n`;

mensagem += `🍽️ Até agora você ingeriu: ${caloriasIngeridas} kcal\n\n`;

if (saldo < 0) {
  mensagem += `✅ Você ainda pode consumir ${Math.abs(restante)} kcal para atingir sua meta.\n`;
} else if (saldo === 0) {
  mensagem += `🎯 Você atingiu exatamente sua meta calórica de hoje!\n`;
} else {
  mensagem += `⚠️ Você ultrapassou a meta em +${saldo} kcal.\n`;
}

mensagem += `\n✍️ *Para editar informações, ver macros detalhados ou seu progresso:* Acesse a plataforma Kalorix: https://kalorix-hub-progress.vercel.app/\n`;

mensagem += `\n🔎 Lembre-se: esse acompanhamento é ${dietaDinamica ? "dinâmico. Amanhã, novos treinos vão ajustar seu balanço." : "baseado em meta fixa. Exercícios servem para controle, mas não alteram sua meta."}`;

// --- 10. Retorno estruturado ---
return [
  {
    json: {
      resumo: {
        tmb,
        neat,
        meta_base: metaBase,
        dieta_dinamica: dietaDinamica,
        calorias_exercicios: caloriasExercicios,
        meta_alvo_dia: metaAlvoDia,
        calorias_ingeridas: caloriasIngeridas,
        ajuste_objetivo: ajusteObjetivo,
        saldo_calorico: saldo,
        objetivo_usuario: usuario.objetivo,
        restante_para_meta: restante
      },
      detalhes: {
        dieta,
        treinos,
        refeicoes,
        usuario
      },
      mensagem
    }
  }
];
