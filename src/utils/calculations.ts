import * as XLSX from 'xlsx';
import {
  Trade,
  Leg,
  SystemConfig,
  SetupSpec,
  SetupInfo,
  CashFlow,
  OneOffLoss,
  LOWTF,
  TFS,
  SPEC0,
  INFO,
} from '../types';

export const f = (n: number): string =>
  (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const usd = (n: number): string => '$' + f(n);
export const brl = (n: number): string => 'R$ ' + f(n);
export const mny = (c: 'USD' | 'BRL', n: number): string => (c === 'BRL' ? brl(n) : usd(n));
export const sgm = (c: 'USD' | 'BRL', n: number): string =>
  (n > 0 ? '+' : n < 0 ? '-' : '') + mny(c, Math.abs(n));
export const sg = (n: number): string => (n > 0 ? '+' : n < 0 ? '-' : '') + usd(Math.abs(n));
export const pc = (n: number | string): string => String(n).replace('.', ',');
export const pp = (n: number): string => (n > 0 ? '+' : n < 0 ? '-' : '') + f(Math.abs(n)) + '%';
export const pl = (n: number, a: string, b: string): string => (n === 1 ? a : b);
export const fp = (n: number): string =>
  n >= 100 ? String(+n.toFixed(2)) : String(+n.toFixed(5));

export function num(t: number | string | undefined | null): number {
  if (t === undefined || t === null) return 0;
  if (typeof t === 'number') return isNaN(t) ? 0 : t;
  let s = String(t).trim().replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

export const ymd = (d: Date): string =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0');

export const dfmt = (x?: string): string => (x && x.length >= 10 ? x.slice(8, 10) + '/' + x.slice(5, 7) : '');

export const nz = (x?: string): string =>
  String(x || '')
    .normalize('NFD')
    .split('')
    .filter((c) => c.charCodeAt(0) < 768 || c.charCodeAt(0) > 879)
    .join('')
    .toUpperCase()
    .replace(/ +/g, ' ')
    .trim();

export const isU = (t: Trade): boolean => t.cart !== 'BRL';
export const dOf = (t: Trade): string => t.ds || t.de;
export const sysOf = (tfOrTrade: string | { tf: string }): 'A' | 'B' => {
  const tf = typeof tfOrTrade === 'string' ? tfOrTrade : tfOrTrade.tf;
  return LOWTF.includes(tf) ? 'A' : 'B';
};

export const byTime = (a: Trade, b: Trade): number =>
  (dOf(a) + (a.hs || '')).localeCompare(dOf(b) + (b.hs || ''));

export const wkOf = (s: string): string => {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
};

export const nextM = (m: string): string => {
  const y = +m.slice(0, 4);
  const k = +m.slice(5, 7);
  return k === 12 ? y + 1 + '-01' : y + '-' + String(k + 1).padStart(2, '0');
};

export const sm = (a: number[]): number => a.reduce((x, y) => x + y, 0);

export function legStats(
  E: Leg[],
  X: Leg[],
  type: 'LONG' | 'SHORT'
): {
  N: number;
  avg: number;
  rem: number;
  real: number;
  cN: number;
  avgExit: number;
  open: boolean;
} {
  const N = E.reduce((a, e) => a + e.n, 0);
  const q = E.reduce((a, e) => a + (e.p > 0 ? e.n / e.p : 0), 0);
  const avg = E.length === 1 ? E[0].p : q > 0 ? N / q : 0;
  let rem = N;
  let real = 0;
  let cN = 0;
  let sp = 0;

  X.forEach((x) => {
    if (rem <= 0.005) return;
    const n = x.n > 0 ? Math.min(x.n, rem) : rem;
    real += (n * (type === 'SHORT' ? avg - x.p : x.p - avg)) / avg;
    rem -= n;
    cN += n;
    sp += n * x.p;
  });

  return {
    N,
    avg,
    rem: Math.max(rem, 0),
    real,
    cN,
    avgExit: cN > 0 ? sp / cN : 0,
    open: rem > 0.005 || !X.length,
  };
}

export function legsOf(t: Trade): { E: Leg[]; X: Leg[] } {
  return {
    E: t.ent && t.ent.length ? t.ent : [{ p: t.entry, n: t.notional }],
    X: t.exs && t.exs.length ? t.exs : t.exit > 0 ? [{ p: t.exit, n: 0 }] : [],
  };
}

export function calc(t: Trade): {
  open: boolean;
  g: number;
  profit: number;
  net: number;
  rem: number;
  N: number;
  avg: number;
  cN: number;
  avgExit: number;
  part: boolean;
} {
  const L = legsOf(t);
  const S = legStats(L.E, L.X, t.type);
  const g = S.cN > 0 && S.avg > 0 ? S.real / S.cN : 0;
  return {
    open: S.open,
    g,
    profit: S.real,
    net: S.real - (t.fees || 0),
    rem: S.rem,
    N: S.N,
    avg: S.avg,
    cN: S.cN,
    avgExit: S.avgExit,
    part: S.open && S.cN > 0,
  };
}

export const riskOf = (t: { stop?: number; entry?: number; notional?: number }): number =>
  t.stop && t.stop > 0 && t.entry && t.entry > 0 && t.notional && t.notional > 0
    ? (t.notional * Math.abs(t.entry - t.stop)) / t.entry
    : 0;

export function specFor(
  setup: string,
  tf: string,
  specs: SetupSpec[],
  cfg: SystemConfig
): {
  pct: number;
  label: string;
  known: boolean;
  spec: SetupSpec | null;
  low: boolean;
  k: 'A' | 'B';
} {
  const n = nz(setup);
  const low = TFS.indexOf(tf) <= TFS.indexOf('H1');
  const k = LOWTF.includes(tf) ? 'A' : 'B';
  const s = specs
    .slice()
    .sort((a, b) => b.n.length - a.n.length)
    .find((x) => n === nz(x.n) || n.startsWith(nz(x.n) + ' '));

  return s
    ? { pct: low ? s.lo : s.hi, label: 'do setup ' + s.n, known: true, spec: s, low, k }
    : { pct: cfg[k].max, label: 'do Sistema ' + k, known: false, spec: null, low, k };
}

export function infoFor(setup: string): SetupInfo | null {
  const n = nz(setup);
  if (!n) return null;
  return (
    INFO.slice()
      .sort((a, b) => Math.max(...b.keys.map((k) => k.length)) - Math.max(...a.keys.map((k) => k.length)))
      .find((x) => x.keys.some((k) => n === nz(k) || n.startsWith(nz(k) + ' '))) || null
  );
}

export function tradeLoss(k: 'A' | 'B', trades: Trade[]): number {
  const now = new Date();
  const w = new Date(now);
  w.setHours(0, 0, 0, 0);
  w.setDate(w.getDate() - ((w.getDay() + 6) % 7));
  const ws = ymd(w);
  const m = ymd(now).slice(0, 7);

  return trades
    .filter(isU)
    .reduce((s, t) => {
      const c = calc(t);
      if (c.open || c.net >= 0 || sysOf(t) !== k || !t.ds) return s;
      return (k === 'A' ? t.ds >= ws : t.ds.startsWith(m)) ? s - c.net : s;
    }, 0);
}

export const perStart = (k: 'A' | 'B'): number => {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  if (k === 'A') n.setDate(n.getDate() - ((n.getDay() + 6) % 7));
  else n.setDate(1);
  return n.getTime();
};

export const sumLoss = (
  k: 'A' | 'B',
  st: { A: OneOffLoss[]; B: OneOffLoss[] },
  trades: Trade[]
): number =>
  st[k].filter((e) => e.t >= perStart(k)).reduce((s, e) => s + e.v, 0) + tradeLoss(k, trades);

export const lim = (k: 'A' | 'B', bank: number, cfg: SystemConfig): number =>
  (bank * cfg[k].limit) / 100;

export const pctLoss = (
  k: 'A' | 'B',
  st: { A: OneOffLoss[]; B: OneOffLoss[] },
  trades: Trade[],
  bank: number,
  cfg: SystemConfig
): number => {
  const L = lim(k, bank, cfg);
  return L > 0 ? (sumLoss(k, st, trades) / L) * 100 : 0;
};

export function stateOf(
  k: 'A' | 'B',
  st: { A: OneOffLoss[]; B: OneOffLoss[] },
  trades: Trade[],
  bank: number,
  cfg: SystemConfig
): [string, 'ok' | 'warn' | 'bad'] {
  const p = pctLoss(k, st, trades, bank, cfg);
  return p >= 100 ? ['Teto atingido', 'bad'] : p >= 75 ? ['Perto do teto', 'warn'] : p >= 50 ? ['Atenção', 'ok'] : ['Liberado', 'ok'];
}

export const openRisk = (
  k: 'A' | 'B',
  trades: Trade[],
  excludeId: number | null = null
): number =>
  trades.filter(isU).reduce((s, t) => {
    if (t.id === excludeId || sysOf(t) !== k) return s;
    const c = calc(t);
    return c.open && c.N > 0 ? s + (riskOf(t) * c.rem) / c.N : s;
  }, 0);

export const room = (
  k: 'A' | 'B',
  st: { A: OneOffLoss[]; B: OneOffLoss[] },
  trades: Trade[],
  bank: number,
  cfg: SystemConfig,
  excludeId: number | null = null
): number =>
  Math.max(lim(k, bank, cfg) - sumLoss(k, st, trades) - openRisk(k, trades, excludeId), 0);

export function dayLoss(trades: Trade[], st: { A: OneOffLoss[]; B: OneOffLoss[] }): number {
  const td = ymd(new Date());
  let r = 0;
  trades.filter(isU).forEach((t) => {
    const c = calc(t);
    if (!c.open && c.net < 0 && t.ds === td) r -= c.net;
  });
  (['A', 'B'] as const).forEach((k) =>
    st[k].forEach((e) => {
      if (ymd(new Date(e.t)) === td) r += e.v;
    })
  );
  return r;
}

export interface MonthCartRow {
  m: string;
  L: Trade[];
  n: number;
  w: number;
  l: number;
  pnl: number;
  start: number;
  end: number;
  ret: number | null;
  cum: number;
  cumPct: number | null;
  open: Trade[];
}

export interface CartDataResult {
  rows: MonthCartRow[];
  closed: Trade[];
  open: Trade[];
  cm: string;
  dd: number;
  ddp: number;
}

export function cartData(trades: Trade[], base: number, flows: CashFlow[]): CartDataResult {
  const closed = trades
    .filter(isU)
    .filter((t) => !calc(t).open)
    .sort(byTime);
  const open = trades.filter(isU).filter((t) => calc(t).open);
  const cm = ymd(new Date()).slice(0, 7);
  const ms = trades.filter(isU).map((t) => dOf(t).slice(0, 7));

  if (!ms.length) return { rows: [], closed, open, cm, dd: 0, ddp: 0 };
  ms.push(cm);
  ms.sort();

  const rows: MonthCartRow[] = [];
  let cum = 0;
  let fb = 0;

  for (let m = ms[0], g = 0; m <= ms[ms.length - 1] && g < 600; m = nextM(m), g++) {
    const L = closed.filter((t) => dOf(t).startsWith(m));
    const nets = L.map((t) => calc(t).net);
    const pnl = sm(nets);
    const start = base + cum + fb;
    const fm = sm(flows.filter((x) => x.d.slice(0, 7) === m).map((x) => x.v));
    cum += pnl;
    fb += fm;
    rows.push({
      m,
      L,
      n: L.length,
      w: nets.filter((x) => x > 0).length,
      l: nets.filter((x) => x < 0).length,
      pnl,
      start,
      end: start + pnl + fm,
      ret: start > 0 ? (pnl / start) * 100 : null,
      cum,
      cumPct: base > 0 ? (cum / base) * 100 : null,
      open: open.filter((t) => dOf(t).slice(0, 7) <= m),
    });
  }

  let eq = base;
  let pk = base;
  let dd = 0;
  let ddp = 0;
  closed.forEach((t) => {
    eq += calc(t).net;
    if (eq > pk) pk = eq;
    const d = pk - eq;
    if (d > dd) {
      dd = d;
      ddp = pk > 0 ? (d / pk) * 100 : 0;
    }
  });

  return { rows, closed, open, cm, dd, ddp };
}

export interface ReportItem {
  t: string;
  r?: string;
}

export interface MonthReportResult {
  m: string;
  head: string;
  tone: string;
  P: string[];
  G: ReportItem[];
  Wn: ReportItem[];
  F: ReportItem[];
  n: number;
}

export function monthReport(D: CartDataResult, m: string, cfg: SystemConfig): MonthReportResult | null {
  const i = D.rows.findIndex((r) => r.m === m);
  const r = D.rows[i];
  if (!r) return null;

  const prev = D.rows
    .slice(0, i)
    .reverse()
    .find((x) => x.n > 0);
  const cap0 = r.start;
  const L = r.L;
  const n = r.n;
  const O = r.open;
  const partial = m === D.cm ? ' (mês em andamento, resultado parcial)' : '';
  const nets = L.map((t) => calc(t).net);
  const W = nets.filter((x) => x > 0);
  const Ls = nets.filter((x) => x < 0).map((x) => -x);

  const hit = n ? W.length / n : 0;
  const avgW = W.length ? sm(W) / W.length : 0;
  const avgL = Ls.length ? sm(Ls) / Ls.length : 0;
  const payoff = avgL && avgW ? avgW / avgL : null;
  const pf = Ls.length ? sm(W) / sm(Ls) : null;
  const exp = n ? r.pnl / n : 0;

  let streak = 0;
  let run = 0;
  L.forEach((t) => {
    if (calc(t).net < 0) {
      run++;
      streak = Math.max(streak, run);
    } else run = 0;
  });

  const day: Record<string, number> = {};
  L.forEach((t) => {
    day[dOf(t)] = (day[dOf(t)] || 0) + calc(t).net;
  });
  const dk = Object.keys(day);
  const worstDay = dk.length ? dk.reduce((a, b) => (day[a] < day[b] ? a : b)) : null;
  const worstDayPct = worstDay && cap0 > 0 ? (day[worstDay] / cap0) * 100 : 0;

  const risks = L.map((t) => ({ t, r: riskOf(t) })).filter((x) => x.r > 0);
  const rp = (x: { t: Trade; r: number }) => (cap0 > 0 ? (x.r / cap0) * 100 : 0);
  const maxRisk = risks.length ? Math.max(...risks.map(rp)) : 0;

  const noStop = L.filter((t) => !(t.stop && t.stop > 0)).length;
  const over = risks.filter((x) => x.r > (cap0 * cfg[sysOf(x.t)].max) / 100).length;
  const over1 = risks.filter((x) => rp(x) > 1).length;
  const levB = L.filter((t) => sysOf(t) === 'B' && t.lev > 8).length;
  const bLoss = sm(L.filter((t) => sysOf(t) === 'B' && calc(t).net < 0).map((t) => -calc(t).net));

  const wk: Record<string, number> = {};
  L.filter((t) => sysOf(t) === 'A' && calc(t).net < 0 && t.ds).forEach((t) => {
    const k = wkOf(t.ds!);
    wk[k] = (wk[k] || 0) - calc(t).net;
  });
  const aLoss = Object.values(wk).length ? Math.max(...Object.values(wk)) : 0;

  const su: Record<string, { n: number; pnl: number }> = {};
  L.forEach((t) => {
    const k = t.setup || 'SEM SETUP';
    su[k] = su[k] || { n: 0, pnl: 0 };
    su[k].n++;
    su[k].pnl += calc(t).net;
  });
  const sk = Object.keys(su).sort((a, b) => su[b].pnl - su[a].pnl);
  const bestS = sk[0];
  const worstS = sk[sk.length - 1];

  const noRel = L.filter((t) => !t.rel).length;
  const fees = sm(L.map((t) => t.fees || 0));
  const gross = sm(L.map((t) => calc(t).profit).filter((x) => x > 0));
  const openNoStop = O.filter((t) => !(t.stop && t.stop > 0)).length;
  const shorts = L.filter((t) => t.type === 'SHORT');
  const shortPnl = sm(shorts.map((t) => calc(t).net));

  const broken =
    noStop > 0 ||
    over > 0 ||
    worstDayPct <= -10 ||
    bLoss > (cap0 * cfg.B.limit) / 100 ||
    aLoss > (cap0 * cfg.A.limit) / 100;

  const tone = !n ? '' : r.pnl > 0 ? 'cy' : r.pnl < 0 ? 'neg' : '';
  const head = !n ? 'Sem trades fechados' : r.pnl > 0 ? 'Mês positivo' : r.pnl < 0 ? 'Mês negativo' : 'Mês no zero a zero';

  const mlong = (s: string) =>
    new Date(+s.slice(0, 4), +s.slice(5, 7) - 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });

  const P: string[] = [];
  if (!n) {
    P.push(
      `Nenhum trade foi fechado em ${mlong(m)}${partial}. Ficar fora do mercado também é uma decisão: o ebook ensina que, se a resposta para "hoje é um bom dia para operar?" hesitar, não se opera.`
    );
    P.push(`O acumulado da carteira segue em ${sg(r.cum)}${r.cumPct !== null ? ` (${pp(r.cumPct)})` : ''}.`);
  } else {
    P.push(
      `Em ${mlong(m)}${partial}, a carteira fechou ${n} ${pl(n, 'trade', 'trades')}: ${W.length} ${pl(
        W.length,
        'ganho',
        'ganhos'
      )} e ${Ls.length} ${pl(Ls.length, 'perda', 'perdas')} (taxa de acerto de ${f(hit * 100)}%). Resultado líquido de ${sg(
        r.pnl
      )}${r.ret !== null ? ` (${pp(r.ret)} sobre a banca de ${usd(cap0)})` : ''}. No acumulado, a carteira está em ${sg(
        r.cum
      )}${r.cumPct !== null ? ` (${pp(r.cumPct)})` : ''}.`
    );
    P.push(
      payoff !== null
        ? `O ganho médio foi de ${usd(avgW)} contra perda média de ${usd(avgL)}, um payoff de ${f(
            payoff
          )}x. Em média, cada trade deixou ${sg(exp)}.`
        : `Em média, cada trade deixou ${sg(exp)}.`
    );
    if (prev) {
      const ph = prev.w / prev.n;
      P.push(
        `Em comparação com ${mlong(prev.m)} (${sg(prev.pnl)}), o resultado ${
          r.pnl > prev.pnl ? 'melhorou' : r.pnl < prev.pnl ? 'piorou' : 'ficou igual'
        }${r.pnl !== prev.pnl ? ` em ${usd(Math.abs(r.pnl - prev.pnl))}` : ''} e a taxa de acerto ${
          hit > ph ? 'subiu' : hit < ph ? 'caiu' : 'ficou estável'
        } de ${f(ph * 100)}% para ${f(hit * 100)}%.`
      );
    }
    P.push(
      r.pnl < 0 && !broken
        ? 'Um mês negativo com o risco sob controle faz parte do jogo probabilístico: o ebook lembra que cada trade individual é irrelevante e que o que vale é repetir o processo ao longo de muitos trades.'
        : r.pnl < 0
        ? 'Neste mês o ajuste parece estar mais na execução do que na estratégia. O ebook é direto: a decisão foi sua, e isso significa que a melhoria também está ao seu alcance.'
        : broken
        ? 'Resultado positivo não valida um processo com falhas de risco. Consistência vem de aplicar as regras em todos os trades, sem exceção.'
        : 'Resultado positivo com o risco dentro das regras é o padrão a repetir: a consistência vem da disciplina repetida dia após dia.'
    );
  }

  const G: ReportItem[] = [];
  const Wn: ReportItem[] = [];
  const F: ReportItem[] = [];
  const it = (t: string, r?: string): ReportItem => ({ t, r });

  if (n && exp > 0)
    G.push(
      it(
        `Expectativa positiva: ${sg(exp)} por trade em média${payoff !== null ? `, payoff de ${f(payoff)}x` : ''}${
          pf !== null ? ` e profit factor de ${f(pf)}` : ''
        }.`,
        'Cap. 2 · Pensamento probabilístico'
      )
    );
  if (n && noStop === 0)
    G.push(it('Todos os trades tiveram stop definido, base para calcular o tamanho da posição.', 'Cap. 6 · Gestão de risco'));
  if (risks.length) {
    if (maxRisk <= 1)
      G.push(it(`Risco por trade sempre dentro de 1% da banca (maior: ${f(maxRisk)}%).`, 'Cap. 6 · Gestão de risco'));
    else if (over === 0)
      G.push(
        it(
          `Risco por trade dentro do máximo dos seus sistemas (maior: ${f(maxRisk)}% da banca).`,
          'Cap. 6 · Gestão de risco'
        )
      );
  }
  if (n && noRel === 0) G.push(it('Diário em dia: todos os trades têm relato.', 'Cap. 6 · Rotina diária'));
  if (n >= 3 && sk.length === 1 && su[bestS].pnl > 0)
    G.push(it(`Foco em um único setup (${bestS}), como o ebook recomenda.`, 'Cap. 5 · Setups'));
  else if (sk.length > 1 && su[bestS].pnl > 0)
    G.push(it(`Setup mais consistente: ${bestS}, ${sg(su[bestS].pnl)} em ${su[bestS].n} ${pl(su[bestS].n, 'trade', 'trades')}.`, 'Cap. 5 · Setups'));

  if (noStop > 0)
    Wn.push(
      it(
        `${noStop} ${pl(noStop, 'trade sem stop', 'trades sem stop')}. A fórmula do ebook parte da distância até o stop: tamanho = risco ÷ distância até o stop.`,
        'Cap. 6 · Gestão de risco'
      )
    );
  if (over > 0)
    Wn.push(
      it(
        `${over} ${pl(over, 'trade com risco acima do máximo', 'trades com risco acima do máximo')} do seu sistema (maior: ${f(
          maxRisk
        )}% da banca). A referência do ebook é 1% por trade.`,
        'Cap. 6 · Gestão de risco'
      )
    );
  else if (over1 > 0)
    Wn.push(
      it(
        `${over1} ${pl(over1, 'trade acima', 'trades acima')} de 1% de risco (maior: ${f(
          maxRisk
        )}%). Dentro do máximo dos seus sistemas, mas acima da referência do ebook.`,
        'Cap. 6 · Gestão de risco'
      )
    );
  if (worstDayPct <= -10)
    Wn.push(it(`Pior dia (${dfmt(worstDay || '')}): ${pp(worstDayPct)} da banca, no limite ou além dos -10% por dia do ebook.`, 'Cap. 6 · Limites não negociáveis'));
  else if (worstDayPct <= -5)
    Wn.push(it(`Pior dia (${dfmt(worstDay || '')}): ${pp(worstDayPct)} da banca, metade do limite diário de -10% do ebook.`, 'Cap. 6 · Limites não negociáveis'));
  if (streak >= 3)
    Wn.push(
      it(
        `Sequência de ${streak} perdas seguidas. Revise o diário, confirme se cada entrada seguiu o setup e lembre da regra: se hesitar, não entra.`,
        'Cap. 2 · Teste do conforto'
      )
    );
  if (bLoss > (cap0 * cfg.B.limit) / 100)
    Wn.push(
      it(
        `As perdas do Sistema B somaram ${f((bLoss / cap0) * 100)}% da banca no mês, acima do teto de ${pc(cfg.B.limit)}%.`,
        'Seus limites · Sistema B'
      )
    );
  if (aLoss > (cap0 * cfg.A.limit) / 100)
    Wn.push(
      it(
        `Em uma semana, as perdas do Sistema A chegaram a ${f((aLoss / cap0) * 100)}% da banca, acima do teto de ${pc(cfg.A.limit)}%.`,
        'Seus limites · Sistema A'
      )
    );
  if (levB > 0)
    Wn.push(
      it(
        `${levB} ${pl(levB, 'trade', 'trades')} do Sistema B com alavancagem acima de 8x. O ebook associa médio e longo prazo a baixa alavancagem (Torres Gêmeas: máx. 8x).`,
        'Cap. 3 · Tipos de operação'
      )
    );
  if (payoff !== null && payoff < 1.5)
    Wn.push(
      it(
        `Payoff de ${f(payoff)}x, abaixo do mínimo de 1,5x. Com esse payoff é preciso acertar cerca de ${f(
          100 / (1 + payoff)
        )}% dos trades só para empatar (acerto do mês: ${f(hit * 100)}%).`,
        'Cap. 6 · Gestão de risco'
      )
    );
  if (shorts.length >= 2 && shortPnl < 0)
    Wn.push(
      it(
        `Os shorts somaram ${sg(shortPnl)} no mês. Antes de shortar, confira o LSR: o ebook proíbe shortar com LSR abaixo de 1.`,
        'Cap. 6 · Análise de sentimento'
      )
    );
  if (sk.length > 1 && su[worstS].pnl < 0 && su[worstS].n >= 2)
    Wn.push(it(`Setup ${worstS}: ${sg(su[worstS].pnl)} em ${su[worstS].n} trades. Revise a execução ou pause até entender o que falhou.`, 'Cap. 5 · Setups'));
  if (sk.length >= 4 && su[bestS].n / n < 0.4)
    Wn.push(it(`${sk.length} setups diferentes em ${n} trades. O ebook recomenda dominar um setup antes de aprender outro.`, 'Cap. 5 · Setups'));
  if (noRel > 0)
    Wn.push(it(`${noRel} de ${n} ${pl(n, 'trade sem relato', 'trades sem relato')}. O diário detalhado é a base para revisar erros e acertos.`, 'Cap. 6 · Rotina diária'));
  if (fees > 0 && gross > 0 && fees > gross * 0.2)
    Wn.push(it(`Fees de ${usd(fees)} consumiram ${f((fees / gross) * 100)}% do lucro bruto dos trades vencedores.`));
  if (O.length > 0)
    Wn.push(
      it(
        `${O.length} ${pl(O.length, 'trade aberto', 'trades abertos')} neste mês, ainda fora do resultado acima${
          openNoStop ? ` (${openNoStop} sem stop)` : ''
        }. Confira se o risco continua dentro do planejado.`,
        'Cap. 6 · Gestão de risco'
      )
    );
  if (n > 0 && n < 10)
    Wn.push(
      it(
        `Amostra pequena: ${n} ${pl(n, 'trade', 'trades')}. O ebook usa 100 trades como referência, então evite conclusões definitivas com poucos resultados.`,
        'Cap. 2 · Pensamento probabilístico'
      )
    );

  if (noStop || over || over1)
    F.push(
      it('Antes de cada trade: calcular o stop, definir o tamanho da posição (risco ÷ distância até o stop) e conferir o risco máximo.', 'Cap. 6 · Rotina diária')
    );
  if (streak >= 3 || worstDayPct <= -5)
    F.push(
      it(
        'Definir a meta de perda do dia antes de operar e parar ao atingi-la. Pergunta final: hoje é um bom dia para operar? Se hesitar, não opere.',
        'Cap. 6 · Rotina diária'
      )
    );
  if (payoff !== null && payoff < 1.5)
    F.push(it('Só entrar quando o alvo oferecer payoff de pelo menos 1,5x sobre o stop.', 'Cap. 6 · Gestão de risco'));
  if (sk.length >= 3 || (sk.length > 1 && su[worstS].pnl < 0 && su[worstS].n >= 2))
    F.push(it('Escolher um setup e dominá-lo completamente antes de aprender outro.', 'Cap. 5 · Setups'));
  if (noRel > 0)
    F.push(it('Registrar o relato de cada trade e revisar erros e acertos do dia anterior.', 'Cap. 6 · Rotina diária'));

  [
    it('Manter a rotina: análise macro, sentimento (LSR do BTC) e análise de ativos antes de operar.', 'Cap. 6 · Rotina diária'),
    it('Confiar no processo: cada trade é uma experiência independente e o que conta é a execução repetida.', 'Cap. 2 · Mentalidade'),
    it('Se hesitar em entrar, não entre. O conforto faz parte da estratégia.', 'Cap. 7 · Próximos passos'),
  ].forEach((x) => {
    if (F.length < 2) F.push(x);
  });

  return { m, head, tone, P, G: G.slice(0, 4), Wn: Wn.slice(0, 6), F: F.slice(0, 3), n };
}

export function buildWB(trades: Trade[], base: number, dlim: number): XLSX.WorkBook {
  const by: Record<string, Trade[]> = {};
  trades.filter(isU).forEach((t) => {
    const m = dOf(t).slice(0, 7);
    (by[m] = by[m] || []).push(t);
  });
  const ms = Object.keys(by).sort();
  const wb = XLSX.utils.book_new();

  const MES = [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];

  let prevCap = base;
  let prevNm = '';

  ms.forEach((m, idx) => {
    const L = by[m].slice().sort((a, b) => (a.de + (a.he || '')).localeCompare(b.de + (b.he || '')));
    const nm = MES[+m.slice(5, 7) - 1] + m.slice(0, 4);

    const wsData: any[][] = [];
    wsData.push([
      'SYSTEM',
      'TIME FRAME',
      'ENTRY DATE',
      'EXIT DATE',
      'TYPE',
      'SYMBOL',
      'ENTRY PRICE',
      'EXIT PRICE',
      'NOTIONAL',
      'LEVERAGE',
      'MARGIN',
      'Gain %',
      'RELATO',
      'FEES',
      'ENTRY TIME',
      'EXIT TIME',
      'CONTROLE DE RISCO',
      'PROFIT',
    ]);

    let pnl = 0;
    let g = 0;
    let l = 0;

    L.forEach((t) => {
      const c = calc(t);
      if (!c.open) {
        pnl += c.net;
        if (c.net > 0) g++;
        else if (c.net < 0) l++;
      }
      wsData.push([
        t.setup,
        t.tf,
        t.de,
        t.ds || '',
        t.type,
        t.sym,
        t.entry,
        t.exit > 0 ? t.exit : '',
        t.notional,
        t.lev,
        t.notional / t.lev,
        c.g,
        t.rel,
        t.fees || 0,
        t.he || '',
        t.hs || '',
        riskOf(t) || '',
        c.profit,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, nm);
    prevCap = prevCap + pnl;
    prevNm = nm;
  });

  const rows: any[][] = [
    [
      'MES',
      'SISTEMA_APP',
      'SETUP',
      'TIME_FRAME',
      'TIPO',
      'ATIVO',
      'DATA_ENTRADA',
      'DATA_SAIDA',
      'HORA_ENTRADA',
      'HORA_SAIDA',
      'PRECO_ENTRADA',
      'PRECO_SAIDA',
      'NOTIONAL',
      'ALAVANCAGEM',
      'MARGEM',
      'FEES',
      'GAIN_PCT',
      'PROFIT_BRUTO',
      'PROFIT_LIQUIDO',
      'RESULTADO',
      'RELATO',
      'STOP',
      'ALVO',
      'RISCO_USD',
      'R_MULTIPLO',
      'CORRETORA',
      'MERCADO',
      'ENTRADAS',
      'SAIDAS',
    ],
  ];

  trades
    .filter(isU)
    .slice()
    .sort((a, b) => (a.de + (a.he || '')).localeCompare(b.de + (b.he || '')))
    .forEach((t) => {
      const c = calc(t);
      rows.push([
        dOf(t).slice(0, 7),
        sysOf(t),
        t.setup,
        t.tf,
        t.type,
        t.sym,
        t.de,
        t.ds || '',
        t.he || '',
        t.hs || '',
        t.entry,
        t.exit > 0 ? t.exit : '',
        t.notional,
        t.lev,
        t.notional / t.lev,
        t.fees || 0,
        c.open ? '' : c.g,
        c.open ? '' : c.profit,
        c.open ? '' : c.net,
        c.open ? 'ABERTO' : c.net > 0 ? 'GAIN' : c.net < 0 ? 'LOSS' : 'ZERO',
        t.rel || '',
        t.stop || '',
        t.alvo || '',
        riskOf(t) || '',
        !c.open && riskOf(t) ? c.net / riskOf(t) : '',
        t.corr || '',
        t.mkt || 'FUTUROS',
        legsOf(t)
          .E.map((e) => e.p + '@' + e.n)
          .join(' | '),
        legsOf(t)
          .X.map((x) => x.p + '@' + (x.n || 'resto'))
          .join(' | '),
      ]);
    });

  const wsDados = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsDados, 'DADOS');
  return wb;
}

export function dlBlob(name: string, textOrBlob: string | Blob, type?: string): void {
  const blob = textOrBlob instanceof Blob ? textOrBlob : new Blob([textOrBlob], { type: type || 'application/json' });
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
