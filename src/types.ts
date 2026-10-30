export interface Leg {
  p: number;
  n: number;
}

export interface Trade {
  id: number;
  setup: string;
  tf: string;
  type: 'LONG' | 'SHORT';
  sym: string;
  entry: number;
  exit: number;
  stop?: number;
  alvo?: number;
  notional: number;
  lev: number;
  fees: number;
  de: string; // YYYY-MM-DD
  ds?: string; // YYYY-MM-DD
  he?: string; // HH:MM:SS
  hs?: string; // HH:MM:SS
  rel: string;
  mkt: 'FUTUROS' | 'SPOT';
  corr: string;
  cart: 'USD' | 'BRL';
  ent: Leg[];
  exs: Leg[];
}

export interface SystemConfig {
  A: {
    name: string;
    per: string;
    limit: number;
    min: number;
    max: number;
    reset: string;
  };
  B: {
    name: string;
    per: string;
    limit: number;
    min: number;
    max: number;
    reset: string;
  };
}

export interface SetupSpec {
  n: string;
  lo: number;
  hi: number;
  r: string;
}

export interface SetupInfo {
  n: string;
  eb: string;
  tag: string;
  keys: string[];
  risk: string[];
  desc: string;
  sys?: string;
  tf?: string;
  ent?: string;
  stop?: string;
  alvo?: string;
  conf?: string;
  rule?: string;
  maxLev?: number;
  maxMargin?: number;
}

export interface Broker {
  n: string;
  c: string;
}

export interface RendaFixaItem {
  id: number;
  t: string;
  c: 'USD' | 'BRL';
  p: number;
  m: Record<string, number>; // month -> profit
  a: Record<string, number>; // month -> aporte
}

export interface CashFlow {
  d: string;
  v: number;
}

export interface ProtocolStep {
  id: string;
  t: string;
  d: string;
  subs?: string[];
  goals?: boolean;
  final?: boolean;
}

export interface ProtocolState {
  d: string; // YYYY-MM-DD
  c: Record<string, boolean>;
  g: string; // meta de ganho
  l: string; // perda máxima
  e: string; // 'go' | 'stop' | ''
  o?: boolean; // overridden
}

export interface ProtocolDayHistory {
  ok: number; // 1 or 0
  n: number;
  e: string;
}

export interface OneOffLoss {
  v: number;
  t: number;
}

export const SETUPS = [
  'SCALP',
  'DIVAP',
  'RETRAÇÃO DA DIVAP',
  'RETRAÇÃO',
  'EMAS',
  'SWING',
  'PERFEIÇÃO',
  'MEIO DIA',
  'LIBERDADE',
  'ZIG ZAG',
  'TORRES GÊMEAS',
  'VIP',
];

export const TFS = ['M5', 'M15', 'M30', 'H1', 'H4', 'H12', 'D', 'S'];
export const LOWTF = ['M1', 'M5', 'M15', 'M30', 'H1'];

export const SPEC0: SetupSpec[] = [
  { n: 'SCALP', lo: 2, hi: 2, r: 'Qualquer time frame.' },
  { n: 'DIVAP', lo: 1, hi: 2, r: 'T.F até H1 usa o limite menor; acima de H1, o maior.' },
  { n: 'RETRAÇÃO DA DIVAP', lo: 1, hi: 2, r: 'T.F até H1 usa o limite menor; acima de H1, o maior.' },
  { n: 'RETRAÇÃO', lo: 2, hi: 2, r: 'Indicado para T.F acima de H1.' },
  { n: 'EMAS', lo: 2, hi: 2, r: 'Qualquer time frame.' },
  { n: 'SWING', lo: 3, hi: 3, r: 'Qualquer time frame.' },
  { n: 'PERFEIÇÃO', lo: 3, hi: 3, r: 'Qualquer time frame.' },
];

export const EMAS4: [string, string][] = [
  ['EMA 7', 'Mais rápida: sinal imediato.'],
  ['EMA 30', 'Tendência de curto prazo.'],
  ['EMA 100', 'Entrada 1: suporte/resistência chave.'],
  ['EMA 197', 'Entrada 2: stop técnico de referência.'],
];

export const INFO: SetupInfo[] = [
  {
    n: 'EMAS',
    eb: 'Setup da Vitória',
    tag: 'Fundamental',
    keys: ['EMAS', 'VITORIA', 'SETUP DA VITORIA'],
    risk: ['EMAS'],
    desc: 'O setup mais versátil. Funciona em qualquer time frame: 1m, 1h, 4h, Diário, Semanal e Mensal.',
    tf: 'Qualquer time frame',
    ent: 'Toque na EMA 100 ou EMA 197, no máximo 3 toques.',
    stop: 'S/R mais próximo além da EMA 197.',
    alvo: 'S/R históricos + extensão Fibonacci do pivot.',
  },
  {
    n: 'MEIO DIA',
    eb: 'Setup Meio Dia',
    tag: 'H12',
    keys: ['MEIO DIA'],
    risk: [],
    sys: 'Sistema B (T.F H12)',
    desc: 'Igual ao Setup da Vitória, mas somente o 1º e o 2º toque nas médias são válidos.',
    tf: 'H12',
    ent: 'Toque na EMA 100 ou EMA 197: só o 1º e o 2º toque valem.',
    stop: 'S/R mais próximo além da EMA 197.',
    alvo: 'S/R históricos + extensão Fibonacci do pivot.',
  },
  {
    n: 'RETRAÇÃO',
    eb: 'Setup da Lamborghini',
    tag: 'Alta RR',
    keys: ['RETRACAO', 'LAMBORGHINI', 'SETUP DA LAMBORGHINI'],
    risk: ['RETRAÇÃO'],
    desc: 'Após uma tendência direcional, comprar ou vender na retração de Fibonacci da pernada.',
    tf: 'Acima de H1',
    ent: 'Ordem limit em 50% ou 61,8% da retração.',
    stop: 'Abaixo de 100%: a tendência fica invalidada.',
  },
  {
    n: 'DIVAP e RETRAÇÃO DA DIVAP',
    eb: 'DIVAP da Lambo (variação da Lamborghini)',
    tag: 'Variação',
    keys: ['DIVAP', 'RETRACAO DA DIVAP'],
    risk: ['DIVAP', 'RETRAÇÃO DA DIVAP'],
    desc: 'Variação do Setup da Lamborghini: a entrada é no gatilho, não no rompimento. O DIVAP também é usado como confluência no Setup da Perfeição.',
    ent: 'No gatilho, não no rompimento.',
  },
  {
    n: 'PERFEIÇÃO',
    eb: 'Setup da Perfeição',
    tag: 'Confluências',
    keys: ['PERFEICAO', 'SETUP DA PERFEICAO'],
    risk: ['PERFEIÇÃO'],
    desc: 'Entrada em suporte ou resistência do Diário, Semanal ou Mensal, com o máximo de confluências.',
    tf: 'Diário, Semanal ou Mensal',
    ent: 'S/R de time frame maior, ordem apregoada.',
    stop: 'Próximo S/R abaixo ou acima da entrada.',
    conf: 'StochRSI, DIVAP, divergência de RSI, Bandas, LTA/LTB.',
  },
  {
    n: 'SWING',
    eb: 'Swing Trade (estilo de operação)',
    tag: 'Estilo',
    keys: ['SWING'],
    risk: ['SWING'],
    desc: 'Oscilações dentro de uma tendência maior, com duração de dias a semanas.',
    tf: '4h a Diário',
  },
  {
    n: 'LIBERDADE',
    eb: 'Setup da Liberdade',
    tag: 'Grandes tendências',
    keys: ['LIBERDADE', 'SETUP DA LIBERDADE'],
    risk: [],
    sys: 'Sistema B (T.F acima de H1)',
    desc: 'Ideal para grandes tendências.',
    tf: 'Mensal, Semanal ou Diário',
    ent: 'Comprar quando o StochRSI está sobrevendido, em ativos grandes.',
  },
  {
    n: 'ZIG ZAG',
    eb: 'Zig Zag (Bollinger)',
    tag: 'Lateralização',
    keys: ['ZIG ZAG', 'ZIGZAG'],
    risk: [],
    sys: 'Sistema A (T.F até H1) ou B (acima de H1)',
    desc: 'Usar apenas em lateralização.',
    ent: 'Short na banda superior, long na inferior.',
    stop: 'Topo ou fundo local anterior.',
  },
  {
    n: 'TORRES GÊMEAS',
    eb: 'Torres Gêmeas',
    tag: 'Cripto',
    keys: ['TORRES GEMEAS', 'TORRES'],
    risk: [],
    sys: 'Sistema B (T.F semanal ou mensal)',
    desc: 'Cripto. Pavio longo com grande rejeição.',
    tf: 'Semanal ou Mensal',
    rule: 'Alavancagem máx. 8x. Margem máx. 10% da banca.',
    maxLev: 8,
    maxMargin: 10,
  },
];

export const PROTO_STEPS: ProtocolStep[] = [
  { id: 'fis', t: 'Preparação física', d: 'Banho, se arrumar, postura de trabalho' },
  { id: 'men', t: 'Centragem mental', d: 'Meditação ou respiração, 5 a 10 minutos' },
  { id: 'dia', t: 'Diário de trade', d: 'Revisar erros e acertos do dia anterior' },
  { id: 'est', t: 'Estudo de estratégias', d: 'Revisar os setups com os quais mais se identifica' },
  {
    id: 'mac',
    t: 'Análise macro',
    d: 'Sempre do gráfico maior para o menor',
    subs: ['SP500', 'Notícias', 'Bitcoin', 'Total Market Cap', 'BTC.D', 'USDT.D', 'ETH/BTC', 'ETH'],
  },
  { id: 'sen', t: 'Sentimento', d: 'LSR do BTC e variação (delta LSR). Proibido shortar com LSR abaixo de 1.' },
  { id: 'ati', t: 'Análise de ativos', d: 'Top 20 altcoins no máximo' },
  {
    id: 'pre',
    t: 'Antes de cada trade',
    d: 'Calcular stop, definir tamanho da posição e a meta de ganho e perda do dia',
    subs: ['Calcular o stop', 'Definir o tamanho da posição', 'Definir meta de ganho e perda do dia'],
    goals: true,
  },
  {
    id: 'fin',
    t: 'Pergunta final',
    d: 'Hoje é um bom dia para operar? Se a resposta hesitar, não opere.',
    final: true,
  },
];

export const DAILY_PHRASES = [
  'Execute o plano. Não negocie com suas emoções.',
  'Você não precisa de mais operações. Precisa de melhores decisões.',
  'Espere pelo seu setup. O mercado não vai embora.',
  'Disciplina é fazer o que precisa ser feito, mesmo quando você não quer.',
  'Uma boa operação pode dar prejuízo. Uma operação ruim pode dar lucro. Avalie o processo.',
  'Não antecipe o mercado. Deixe o preço confirmar.',
  'Sem confirmação, sem entrada.',
  'Proteja seu capital. Sua próxima oportunidade depende disso.',
  'Você está construindo consistência, não buscando sorte.',
  'O objetivo não é ganhar hoje. É continuar evoluindo amanhã.',
  'Pequenas vantagens, repetidas com disciplina, constroem resultados.',
  'Pense em centenas de operações, não em uma única entrada.',
  'O mercado recompensa a preparação, não a ansiedade.',
  'Seu trabalho é executar bem. O resultado vem depois.',
  'Não tenha pressa para enriquecer. Tenha pressa para aprender.',
  'Consistência é sobreviver aos dias ruins sem comprometer os bons.',
  'Você não precisa recuperar o que perdeu hoje.',
  'Perdeu uma oportunidade? Outras virão.',
  'Não transforme uma perda em uma sequência de erros.',
  'O FOMO é caro. A paciência é uma vantagem.',
  'Ficar de fora também é uma decisão.',
  'Não aumente o risco para satisfazer seu ego.',
  'O mercado não lhe deve nada.',
  'Aceite o stop. Preserve a mente para a próxima operação.',
];
