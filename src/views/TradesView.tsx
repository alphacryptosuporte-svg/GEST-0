import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Trade, Leg, Broker, SystemConfig, SetupSpec, SETUPS, TFS } from '../types';
import {
  f,
  usd,
  mny,
  sgm,
  sg,
  pc,
  fp,
  num,
  ymd,
  dfmt,
  calc,
  legsOf,
  legStats,
  riskOf,
  specFor,
  infoFor,
  sysOf,
  dOf,
  room,
  cartData,
  buildWB,
  dlBlob,
  openRisk,
  sumLoss,
  lim,
  byTime,
  isU,
} from '../utils/calculations';

interface TradesViewProps {
  trades: Trade[];
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  brokers: Broker[];
  setBrokers: React.Dispatch<React.SetStateAction<Broker[]>>;
  bank: number;
  base: number;
  cfg: SystemConfig;
  specs: SetupSpec[];
  dlim: number;
  st: any;
  flows: any[];
  onOpenCloseModal: (trade: Trade) => void;
  askConfirm: (msg: string) => Promise<boolean>;
  onRestoreBackup: (data: any, isFull: boolean) => void;
  fullBackupData: any;
}

export const TradesView: React.FC<TradesViewProps> = ({
  trades,
  setTrades,
  brokers,
  setBrokers,
  bank,
  base,
  cfg,
  specs,
  dlim,
  st,
  flows,
  onOpenCloseModal,
  askConfirm,
  onRestoreBackup,
  fullBackupData,
}) => {
  const [tCart, setTCart] = useState<'USD' | 'BRL'>('USD');
  const [tView, setTView] = useState<'USD' | 'BRL'>('USD');
  const [tType, setTType] = useState<'LONG' | 'SHORT'>('LONG');
  const [mkt, setMkt] = useState<'FUTUROS' | 'SPOT'>('FUTUROS');
  const [editId, setEditId] = useState<number | null>(null);

  const [setup, setSetup] = useState('');
  const [tf, setTf] = useState('M15');
  const [sym, setSym] = useState('');
  const [corr, setCorr] = useState('');
  const [lev, setLev] = useState('10');
  const [fees, setFees] = useState('');
  const [de, setDe] = useState(ymd(new Date()));
  const [ds, setDs] = useState('');
  const [he, setHe] = useState('');
  const [hs, setHs] = useState('');
  const [rel, setRel] = useState('');
  const [stop, setStop] = useState('');
  const [alvo, setAlvo] = useState('');

  // Entries
  const [fEnt, setFEnt] = useState('');
  const [fNot, setFNot] = useState('');
  const [eMore, setEMore] = useState<Leg[]>([]);

  // Exits
  const [fExit, setFExit] = useState('');
  const [fExitN, setFExitN] = useState('');
  const [xMore, setXMore] = useState<Leg[]>([]);

  const [tmsg, setTmsg] = useState('');
  const [month, setMonth] = useState(ymd(new Date()).slice(0, 7));

  // Filters
  const [tfQ, setTfQ] = useState('');
  const [tfS, setTfS] = useState('');
  const [tfC, setTfC] = useState('');
  const [tfR, setTfR] = useState('');
  const [tfO, setTfO] = useState('D');

  const [xmsg, setXmsg] = useState('');
  const [kmsg, setKmsg] = useState('');
  const [bkText, setBkText] = useState('');
  const [lastBk, setLastBk] = useState<number>(() => {
    try {
      return +localStorage.getItem('gr_lastbk')! || 0;
    } catch (e) {
      return 0;
    }
  });

  // Collect months available for tView
  const availableMonths = [
    ...new Set([
      ...trades.filter((t) => (t.cart || 'USD') === tView).map((t) => dOf(t).slice(0, 7)),
      ymd(new Date()).slice(0, 7),
      month,
    ]),
  ]
    .sort()
    .reverse();

  // Clear form
  const clearForm = () => {
    setEditId(null);
    setSetup('');
    setSym('');
    setFEnt('');
    setFNot('');
    setEMore([]);
    setFExit('');
    setFExitN('');
    setXMore([]);
    setStop('');
    setAlvo('');
    setLev('10');
    setFees('');
    setDe(ymd(new Date()));
    setDs('');
    setHe('');
    setHs('');
    setRel('');
    setCorr('');
    setMkt('FUTUROS');
    setTType('LONG');
    setTmsg('');
  };

  const handleEditTrade = (t: Trade) => {
    setEditId(t.id);
    setTView(t.cart || 'USD');
    setTCart(t.cart || 'USD');
    setSetup(t.setup);
    setTf(t.tf);
    setCorr(t.corr || '');
    setMkt(t.mkt === 'SPOT' ? 'SPOT' : 'FUTUROS');
    setTType(t.type);
    setSym(t.sym);

    const L = legsOf(t);
    setFEnt(L.E[0] ? pc(L.E[0].p) : '');
    setFNot(L.E[0] ? pc(L.E[0].n) : '');
    setEMore(L.E.slice(1));

    setFExit(L.X[0] ? pc(L.X[0].p) : '');
    setFExitN(L.X[0] && L.X[0].n > 0 ? pc(L.X[0].n) : '');
    setXMore(L.X.slice(1));

    setStop(t.stop ? pc(t.stop) : '');
    setAlvo(t.alvo ? pc(t.alvo) : '');
    setLev(t.mkt !== 'SPOT' ? pc(t.lev) : '1');
    setFees(t.fees ? pc(t.fees) : '');
    setDe(t.de);
    setDs(t.ds || '');
    setHe(t.he || '');
    setHs(t.hs || '');
    setRel(t.rel || '');
    setTmsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrade = async (id: number) => {
    const ok = await askConfirm('Excluir este trade?');
    if (!ok) return;
    setTrades((prev) => prev.filter((x) => x.id !== id));
    if (editId === id) clearForm();
  };

  // Compile current form legs
  const getFormLegs = () => {
    const E: Leg[] = [];
    const p1 = num(fEnt);
    const n1 = num(fNot);
    if (p1 > 0 && n1 > 0) E.push({ p: p1, n: n1 });
    eMore.forEach((leg) => {
      if (leg.p > 0 && leg.n > 0) E.push(leg);
    });

    const X: Leg[] = [];
    const xp1 = num(fExit);
    const xn1 = num(fExitN) || 0;
    if (xp1 > 0) X.push({ p: xp1, n: xn1 });
    xMore.forEach((leg) => {
      if (leg.p > 0) X.push(leg);
    });

    return { E, X };
  };

  const commitTrade = () => {
    const { E, X } = getFormLegs();
    const S = legStats(E, X, tType);
    const finalLev = mkt === 'SPOT' ? 1 : num(lev) || 10;

    const t: Trade = {
      id: editId || Date.now(),
      setup: setup.trim().toUpperCase(),
      tf,
      type: tType,
      mkt,
      corr,
      sym: sym.trim().toUpperCase(),
      entry: S.avg,
      exit: !S.open && S.cN > 0 ? S.avgExit : 0,
      stop: num(stop) || 0,
      alvo: num(alvo) || 0,
      notional: S.N,
      lev: finalLev,
      fees: num(fees) || 0,
      de,
      ds: ds || (!S.open ? ymd(new Date()) : ''),
      he,
      hs,
      rel: rel.trim(),
      cart: tCart,
      ent: E,
      exs: X,
    };

    if (!t.sym || !E.length || !t.de) {
      setTmsg('Preencha ativo, ao menos uma entrada (preço e notional) e a data de entrada.');
      return;
    }

    if (X.reduce((x, y) => x + y.n, 0) > S.N + 0.005) {
      setTmsg('As saídas somam mais que a posição.');
      return;
    }

    setTrades((prev) => (editId ? prev.map((x) => (x.id === editId ? t : x)) : [...prev, t]));
    setMonth(dOf(t).slice(0, 7));
    setTView(t.cart);
    clearForm();
  };

  const handleSaveTrade = async () => {
    const k = sysOf({ tf });
    const notionalNum = num(fNot) + eMore.reduce((a, b) => a + b.n, 0);
    const entryNum = num(fEnt);
    const stopNum = num(stop) || 0;
    const tCheck = { notional: notionalNum, entry: entryNum, stop: stopNum };

    if (!editId && bank > 0 && !(num(fExit) > 0) && tCart === 'USD') {
      const rest = room(k, st, trades, bank, cfg);
      const r = riskOf(tCheck);
      const oR = openRisk(k, trades);
      let w = '';
      if (sumLoss(k, st, trades) >= lim(k, bank, cfg)) {
        w = `O Sistema ${k} está travado (teto atingido). Registrar este trade mesmo assim?`;
      } else if (r > rest) {
        w = `O risco deste trade (${usd(r)}) é maior que o espaço que resta no teto do Sistema ${k} (${usd(
          rest
        )}${oR > 0 ? ', já descontados ' + usd(oR) + ' de risco em trades abertos' : ''}). Registrar mesmo assim?`;
      }
      if (w) {
        const ok = await askConfirm(w);
        if (!ok) return;
      }
    }

    commitTrade();
  };

  // Preview calculations
  const { E: curE, X: curX } = getFormLegs();
  const S0 = legStats(curE, curX, tType);
  const curEntry = S0.avg;
  const curNotional = S0.N;
  const curLev = mkt === 'SPOT' ? 1 : num(lev) || 10;
  const curStop = num(stop) || 0;
  const curAlvo = num(alvo) || 0;

  const sp = specFor(setup, tf, specs, cfg);
  const maxRiskAllowed = (bank * sp.pct) / 100;
  const curSys = sysOf({ tf });
  const remainingRoom = room(curSys, st, trades, bank, cfg, editId);
  const effectiveMaxRisk = Math.min(maxRiskAllowed, remainingRoom);

  let rmaxText = '';
  let rmaxSub = '';
  let rmaxIsWarn = false;

  if (!setup.trim()) {
    rmaxText = 'Escolha o setup para ver o risco máximo permitido neste trade.';
  } else if (!(bank > 0)) {
    rmaxText = 'Informe o capital da banca na aba Risco.';
    rmaxIsWarn = true;
  } else {
    rmaxSub =
      `${pc(sp.pct)}% da banca ${sp.label}` +
      (sp.known ? ` (T.F ${sp.low ? 'até' : 'acima de'} H1).` : `. Setup sem regra própria: vale o limite do Sistema ${curSys}.`);
    if (remainingRoom < maxRiskAllowed) {
      rmaxSub += ` Limitado pelo que resta no teto do Sistema ${curSys}: ${usd(remainingRoom)}.`;
    }
    if (sp.spec && sp.spec.n === 'RETRAÇÃO' && TFS.indexOf(tf) < TFS.indexOf('H1')) {
      rmaxSub += ' Setup indicado para T.F acima de H1.';
    }
    const nf = infoFor(setup);
    if (nf && nf.rule) rmaxSub += ' ' + nf.rule;

    if (remainingRoom <= 0) {
      rmaxIsWarn = true;
      rmaxText = `Teto do Sistema ${curSys} atingido: não abra este trade.`;
    } else {
      rmaxText = `Risco máximo neste trade: ${usd(effectiveMaxRisk)}`;
    }
  }

  // Preview description & warnings
  let prevDesc = '';
  let prevWarn = false;
  if (curEntry > 0 && curNotional > 0) {
    const tempT: Trade = {
      id: 0,
      setup,
      tf,
      type: tType,
      sym,
      entry: curEntry,
      exit: !S0.open && S0.cN > 0 ? S0.avgExit : 0,
      notional: curNotional,
      fees: num(fees) || 0,
      stop: curStop,
      alvo: curAlvo,
      lev: curLev,
      de,
      rel: '',
      mkt,
      corr,
      cart: tCart,
      ent: curE,
      exs: curX,
    };
    const c = calc(tempT);
    const r = riskOf(tempT);

    prevDesc = `Margem ${usd(curNotional / curLev)}. Sistema ${curSys}.`;
    if (curE.length > 1) prevDesc += ` Preço médio de entrada ${fp(c.avg)}.`;
    if (!c.open) {
      prevDesc += ` Resultado ${sg(c.net)} (${f(c.g * 100)}%).`;
    } else if (c.part) {
      prevDesc += ` Realizado até agora ${sg(c.net)} (${f(c.g * 100)}% sobre ${usd(c.cN)} fechados). Restam ${usd(
        c.rem
      )} abertos.`;
    }

    if (curX.reduce((a, x) => a + x.n, 0) > c.N + 0.005) {
      prevDesc += ' As saídas somam mais que a posição.';
      prevWarn = true;
    }

    if (r > 0) {
      prevDesc += ` Risco ${usd(r)}` + (bank > 0 ? ` (${f((r / bank) * 100)}% da banca)` : '') + '.';
      if (bank > 0) {
        if (r > maxRiskAllowed) {
          prevDesc += ` Acima do risco máximo ${sp.label} (${usd(maxRiskAllowed)}).`;
          prevWarn = true;
        } else {
          prevDesc += ' Dentro do limite.';
        }
      }
      if (curAlvo > 0 && curStop > 0) {
        const pay = Math.abs(curAlvo - curEntry) / Math.abs(curEntry - curStop);
        prevDesc += ` Payoff planejado ${f(pay)}x` + (pay < 1.5 ? ' (abaixo de 1,5x).' : '.');
        if (pay < 1.5) prevWarn = true;
      }
    }

    const nf = infoFor(setup);
    if (nf && nf.maxLev && curLev > nf.maxLev) {
      prevDesc += ` Alavancagem acima do máximo do setup (${nf.maxLev}x).`;
      prevWarn = true;
    }
    if (nf && nf.maxMargin && bank > 0 && curNotional / curLev > (bank * nf.maxMargin) / 100) {
      prevDesc += ` Margem acima do máximo do setup (${nf.maxMargin}% da banca = ${usd((bank * nf.maxMargin) / 100)}).`;
      prevWarn = true;
    }
  }

  // Notional quick chips based on stop
  const pcalcChips: Array<{ label: string; n: number }> = [];
  if (curEntry > 0 && curStop > 0 && curEntry !== curStop && bank > 0 && tCart === 'USD') {
    const dist = Math.abs(curEntry - curStop) / curEntry;
    [0.25, 0.5, 0.75, 1].forEach((mult) => {
      const p = +(sp.pct * mult).toFixed(2);
      const n = (bank * p) / 100 / dist;
      pcalcChips.push({ label: `Risco ${pc(p)}% → ${usd(n)}`, n });
    });
  }

  // Month summary calculations
  const curMonthTrades = trades
    .filter(
      (t) =>
        (t.cart || 'USD') === tView &&
        (dOf(t).slice(0, 7) === month || (calc(t).open && t.de.slice(0, 7) < month && month <= ymd(new Date()).slice(0, 7)))
    )
    .sort((a, b) => +calc(b).open - +calc(a).open || (dOf(b) + (b.hs || '')).localeCompare(dOf(a) + (a.hs || '')));

  let pnlMonth = 0;
  let gCount = 0;
  let lCount = 0;
  const wins: number[] = [];
  const losses: number[] = [];

  curMonthTrades.forEach((t) => {
    const c = calc(t);
    if (c.open) return;
    pnlMonth += c.net;
    if (c.net > 0) {
      gCount++;
      wins.push(c.net);
    } else if (c.net < 0) {
      lCount++;
      losses.push(-c.net);
    }
  });

  const cData = cartData(trades, base, flows);
  const cRow = cData.rows.find((r) => r.m === month);
  const updatedBanca = cRow ? cRow.end : base + pnlMonth;
  const totalClosed = gCount + lCount;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const payoffVal = avgLoss ? avgWin / avgLoss : null;
  const profitFactor = losses.length ? wins.reduce((a, b) => a + b, 0) / losses.reduce((a, b) => a + b, 0) : null;

  // Mini equity curve
  const clTrades = curMonthTrades.filter((t) => !calc(t).open).sort(byTime);
  let ac = 0;
  const pts = [0, ...clTrades.map((t) => (ac += calc(t).net))];
  const mn = Math.min(...pts);
  const mxp = Math.max(...pts);
  const spVal = mxp - mn || 1;
  const svgX = (i: number) => (i / (pts.length - 1)) * 600;
  const svgY = (v: number) => 64 - ((v - mn) / spVal) * 58;

  // Filter and sort trades
  const filteredTrades = curMonthTrades
    .filter((t) => {
      const c = calc(t);
      if (tfS && t.setup !== tfS) return false;
      if (tfC && (t.corr || '') !== tfC) return false;
      if (tfR === 'G' && !(!c.open && c.net > 0)) return false;
      if (tfR === 'L' && !(!c.open && c.net < 0)) return false;
      if (tfR === 'O' && !c.open) return false;
      if (tfQ) {
        const q = tfQ.toUpperCase();
        const str = [t.sym, t.setup, t.corr, t.rel].join(' ').toUpperCase();
        if (!str.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (tfO === 'A') return byTime(a, b);
      if (tfO === 'G') return calc(b).net - calc(a).net;
      if (tfO === 'P') return calc(a).net - calc(b).net;
      return (calc(b).open ? 1 : 0) - (calc(a).open ? 1 : 0) || (dOf(b) + (b.hs || '')).localeCompare(dOf(a) + (a.hs || ''));
    });

  // Export spreadsheet
  const handleExportXLSX = () => {
    if (!trades.filter((t) => isU(t)).length) {
      setXmsg('Registre ao menos um trade antes de baixar.');
      return;
    }
    try {
      const wb = buildWB(trades, base, dlim);
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const bl = new Blob([out], { type: 'application/octet-stream' });
      const fn = 'TRADES_' + ymd(new Date()) + '.xlsx';
      dlBlob(fn, bl);
      setXmsg('Planilha gerada com sucesso.');
    } catch (e: any) {
      setXmsg('Não foi possível baixar (' + (e?.message || 'erro') + ').');
    }
  };

  // Backup & Restore
  const handleBackup = () => {
    const name = 'backup-gestao-risco-' + ymd(new Date()) + '.json';
    const jsonStr = JSON.stringify(fullBackupData, null, 2);
    try {
      dlBlob(name, jsonStr);
      const now = Date.now();
      localStorage.setItem('gr_lastbk', String(now));
      setLastBk(now);
      setKmsg('Backup gerado.');
    } catch (e) {
      setKmsg('Download bloqueado. Copie o texto abaixo:');
      setBkText(jsonStr);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then(async (tx) => {
        const o = JSON.parse(tx);
        const raw = Array.isArray(o) ? o : o.trades;
        if (!Array.isArray(raw)) throw new Error('Formato desconhecido');
        const isFull = !Array.isArray(o) && o.v === 1;
        const ok = await askConfirm(
          isFull
            ? `Restaurar backup com ${raw.length} trades? Isso substitui os dados atuais.`
            : `Importar ${raw.length} trades adicionais?`
        );
        if (ok) {
          onRestoreBackup(o, isFull);
          setKmsg(isFull ? 'Backup restaurado com sucesso.' : `${raw.length} trades importados.`);
        }
      })
      .catch((err) => {
        setKmsg('Erro ao ler arquivo: ' + err.message);
      });
    e.target.value = '';
  };

  const corOf = (name: string) => brokers.find((b) => b.n === name);

  return (
    <div id="vTrades" className="tgrid">
      {/* Trade Form */}
      <div className="card tf">
        <h3 id="fTitle">{editId ? 'Editar trade' : 'Novo trade'}</h3>

        <label>Carteira</label>
        <div className="seg" style={{ marginBottom: 10 }}>
          <button
            className={tCart === 'USD' ? 'on' : ''}
            onClick={() => {
              setTCart('USD');
              setTView('USD');
            }}
          >
            USD
          </button>
          <button
            className={tCart === 'BRL' ? 'on' : ''}
            onClick={() => {
              setTCart('BRL');
              setTView('BRL');
              setMkt('SPOT');
            }}
          >
            BRL · Ações
          </button>
        </div>

        <div className="r2">
          <div>
            <label>Setup</label>
            <input
              placeholder="SCALP"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              list="dlS"
              autoComplete="off"
            />
            <datalist id="dlS">
              {SETUPS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label>Time frame</label>
            <select value={tf} onChange={(e) => setTf(e.target.value)}>
              {TFS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="seg" style={{ marginBottom: 10 }}>
          <button
            className={tType === 'LONG' ? 'on' : ''}
            onClick={() => setTType('LONG')}
          >
            LONG
          </button>
          <button
            className={tType === 'SHORT' ? 'on' : ''}
            disabled={mkt === 'SPOT'}
            onClick={() => setTType('SHORT')}
          >
            SHORT
          </button>
        </div>

        <div className="r2">
          <div>
            <label>Ativo</label>
            <input
              placeholder="BTC"
              value={sym}
              onChange={(e) => setSym(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label>Corretora</label>
            <select value={corr} onChange={(e) => setCorr(e.target.value)}>
              <option value="">(sem corretora)</option>
              {brokers.map((b) => (
                <option key={b.n} value={b.n}>
                  {b.n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="seg" style={{ marginBottom: 12 }}>
          <button
            className={mkt === 'FUTUROS' ? 'on' : ''}
            disabled={tCart === 'BRL'}
            onClick={() => setMkt('FUTUROS')}
          >
            Futuros
          </button>
          <button
            className={mkt === 'SPOT' ? 'on' : ''}
            onClick={() => {
              setMkt('SPOT');
              setLev('1');
              if (tType === 'SHORT') setTType('LONG');
            }}
          >
            Spot
          </button>
        </div>

        {/* Entries */}
        <label>Entradas: preço e notional ({tCart === 'BRL' ? 'R$' : 'US$'})</label>
        <div className="lg">
          <input
            inputMode="decimal"
            placeholder="Preço"
            value={fEnt}
            onChange={(e) => setFEnt(e.target.value)}
          />
          <input
            inputMode="decimal"
            placeholder={`Notional ${tCart === 'BRL' ? 'R$' : 'US$'}`}
            value={fNot}
            onChange={(e) => setFNot(e.target.value)}
          />
          <span />
        </div>
        {eMore.map((leg, idx) => (
          <div key={idx} className="lg">
            <input
              inputMode="decimal"
              placeholder="Preço"
              value={pc(leg.p)}
              onChange={(e) => {
                const updated = [...eMore];
                updated[idx].p = num(e.target.value);
                setEMore(updated);
              }}
            />
            <input
              inputMode="decimal"
              placeholder={`Notional ${tCart === 'BRL' ? 'R$' : 'US$'}`}
              value={pc(leg.n)}
              onChange={(e) => {
                const updated = [...eMore];
                updated[idx].n = num(e.target.value);
                setEMore(updated);
              }}
            />
            <button
              type="button"
              aria-label="Remover"
              onClick={() => setEMore(eMore.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="lnk"
          onClick={() => setEMore([...eMore, { p: 0, n: 0 }])}
        >
          + Entrada
        </button>

        {/* Exits */}
        <label>Saídas: preço e notional fechado ({tCart === 'BRL' ? 'R$' : 'US$'})</label>
        <div className="lg">
          <input
            inputMode="decimal"
            placeholder="Preço (vazio se aberto)"
            value={fExit}
            onChange={(e) => setFExit(e.target.value)}
          />
          <input
            inputMode="decimal"
            placeholder="Notional (vazio = tudo)"
            value={fExitN}
            onChange={(e) => setFExitN(e.target.value)}
          />
          <span />
        </div>
        {xMore.map((leg, idx) => (
          <div key={idx} className="lg">
            <input
              inputMode="decimal"
              placeholder="Preço"
              value={pc(leg.p)}
              onChange={(e) => {
                const updated = [...xMore];
                updated[idx].p = num(e.target.value);
                setXMore(updated);
              }}
            />
            <input
              inputMode="decimal"
              placeholder="Notional (vazio = resto)"
              value={leg.n ? pc(leg.n) : ''}
              onChange={(e) => {
                const updated = [...xMore];
                updated[idx].n = num(e.target.value);
                setXMore(updated);
              }}
            />
            <button
              type="button"
              aria-label="Remover"
              onClick={() => setXMore(xMore.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="lnk"
          onClick={() => setXMore([...xMore, { p: 0, n: 0 }])}
        >
          + Saída
        </button>

        <div className="r2">
          <div>
            <label>Stop (opcional)</label>
            <input
              inputMode="decimal"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
            />
          </div>
          <div>
            <label>Alvo (opcional)</label>
            <input
              inputMode="decimal"
              value={alvo}
              onChange={(e) => setAlvo(e.target.value)}
            />
          </div>
        </div>

        <div className="r2">
          <div>
            <label>Alavancagem</label>
            <input
              inputMode="decimal"
              disabled={mkt === 'SPOT'}
              value={lev}
              onChange={(e) => setLev(e.target.value)}
            />
          </div>
          <div>
            <label>Fees ({tCart === 'BRL' ? 'R$' : 'US$'})</label>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </div>
        </div>

        <div className="r2">
          <div>
            <label>Data de entrada</label>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
            />
          </div>
          <div>
            <label>Data de saída</label>
            <input
              type="date"
              value={ds}
              onChange={(e) => setDs(e.target.value)}
            />
          </div>
        </div>

        <div className="r2">
          <div>
            <label>Hora de entrada</label>
            <input
              type="time"
              step="1"
              value={he}
              onChange={(e) => setHe(e.target.value)}
            />
          </div>
          <div>
            <label>Hora de saída</label>
            <input
              type="time"
              step="1"
              value={hs}
              onChange={(e) => setHs(e.target.value)}
            />
          </div>
        </div>

        {/* Risk max banner & quick chips */}
        {tCart === 'USD' && (
          <div className={`rmax ${rmaxIsWarn ? 'w' : ''}`}>
            {rmaxText}
            {rmaxSub && <small>{rmaxSub}</small>}
          </div>
        )}

        {pcalcChips.length > 0 && (
          <div className="chips">
            {pcalcChips.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFNot(pc(c.n.toFixed(2)))}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {prevDesc && <div className={`prev ${prevWarn ? 'w' : ''}`}>{prevDesc}</div>}

        <label>Relato</label>
        <textarea
          placeholder="O que aconteceu, o que aprendeu, se seguiu o plano"
          value={rel}
          onChange={(e) => setRel(e.target.value)}
        />

        {tmsg && <div className="tmsg">{tmsg}</div>}

        <button className="go" onClick={handleSaveTrade}>
          {editId ? 'Salvar alterações' : 'Salvar trade'}
        </button>
        {editId && (
          <button
            className="ghost"
            style={{ marginTop: 8 }}
            onClick={clearForm}
          >
            Cancelar edição
          </button>
        )}
      </div>

      {/* Right Column: Month summary, filters, table, brokers, backup */}
      <div>
        <div className="card tsum">
          <div className="thead">
            <h3>Resumo do mês</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="seg" style={{ margin: 0, width: 170 }}>
                <button
                  className={tView === 'USD' ? 'on' : ''}
                  onClick={() => setTView('USD')}
                >
                  USD
                </button>
                <button
                  className={tView === 'BRL' ? 'on' : ''}
                  onClick={() => setTView('BRL')}
                >
                  BRL
                </button>
              </div>
              <button
                className="ghost"
                style={{ width: 'auto', padding: '8px 14px' }}
                onClick={handleExportXLSX}
              >
                Baixar planilha (.xlsx)
              </button>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {new Date(+m.slice(0, 4), +m.slice(5, 7) - 1).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sumrow">
            <div>
              <small>PNL do mês</small>
              <b className={pnlMonth > 0 ? 'pos' : pnlMonth < 0 ? 'neg' : ''}>
                {sgm(tView, pnlMonth)}
              </b>
            </div>
            {tView === 'USD' ? (
              <>
                <div>
                  <small>Banca atualizada</small>
                  <b>{usd(updatedBanca)}</b>
                </div>
                <div>
                  <small>Limite de perda ({pc(dlim)}%)</small>
                  <b>{usd((updatedBanca * dlim) / 100)}</b>
                </div>
              </>
            ) : (
              <div>
                <small>Acumulado em ações</small>
                <b className={pnlMonth > 0 ? 'pos' : pnlMonth < 0 ? 'neg' : ''}>
                  {sgm('BRL', pnlMonth)}
                </b>
              </div>
            )}
            <div>
              <small>Taxa de acerto</small>
              <b className={totalClosed ? (gCount / totalClosed >= 0.5 ? 'cy' : 'neg') : ''}>
                {totalClosed ? f((gCount / totalClosed) * 100) + '%' : '-'}
              </b>
              {totalClosed ? (
                <small>
                  {gCount} ganhos e {lCount} perdas
                </small>
              ) : null}
            </div>
            <div>
              <small>Ganho médio</small>
              <b>{mny(tView, avgWin)}</b>
            </div>
            <div>
              <small>Perda média</small>
              <b>{mny(tView, avgLoss)}</b>
            </div>
            <div>
              <small>Payoff</small>
              <b className={avgLoss ? (avgWin / avgLoss >= 1.5 ? 'cy' : 'neg') : wins.length ? 'cy' : ''}>
                {payoffVal !== null ? f(payoffVal) + 'x' : wins.length ? '∞' : '-'}
              </b>
            </div>
            <div>
              <small>Profit factor</small>
              <b className={profitFactor !== null ? (profitFactor >= 1 ? 'cy' : 'neg') : wins.length ? 'cy' : ''}>
                {profitFactor !== null ? f(profitFactor) : wins.length ? '∞' : '-'}
              </b>
            </div>
          </div>

          {/* Equity curve SVG */}
          {clTrades.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <svg
                viewBox="0 0 600 70"
                preserveAspectRatio="none"
                style={{ width: '100%', height: 70, display: 'block' }}
                aria-label="Curva de resultado do mês"
              >
                <line
                  x1="0"
                  x2="600"
                  y1={svgY(0)}
                  y2={svgY(0)}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                />
                <polyline
                  fill="none"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  style={{ stroke: ac >= 0 ? '#22e5ff' : 'var(--bad)' }}
                  points={pts.map((v, i) => svgX(i) + ',' + svgY(v)).join(' ')}
                />
              </svg>
            </div>
          )}

          {xmsg && <div className="tmsg" style={{ marginBottom: 0 }}>{xmsg}</div>}
        </div>

        {/* Filters */}
        <div className="card tf">
          <h3>Filtrar trades</h3>
          <input
            placeholder="Buscar ativo, setup, corretora ou relato"
            autoComplete="off"
            value={tfQ}
            onChange={(e) => setTfQ(e.target.value)}
          />
          <div className="r2" style={{ marginTop: 10 }}>
            <select value={tfS} onChange={(e) => setTfS(e.target.value)}>
              <option value="">Todos os setups</option>
              {[...new Set(trades.map((t) => t.setup).filter(Boolean))].sort().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={tfC} onChange={(e) => setTfC(e.target.value)}>
              <option value="">Todas as corretoras</option>
              {brokers.map((b) => (
                <option key={b.n} value={b.n}>
                  {b.n}
                </option>
              ))}
            </select>
          </div>
          <div className="r2" style={{ margin: 0 }}>
            <select value={tfR} onChange={(e) => setTfR(e.target.value)}>
              <option value="">Todos os resultados</option>
              <option value="G">Ganhos</option>
              <option value="L">Perdas</option>
              <option value="O">Abertos</option>
            </select>
            <select value={tfO} onChange={(e) => setTfO(e.target.value)}>
              <option value="D">Mais recentes</option>
              <option value="A">Mais antigos</option>
              <option value="G">Maior ganho</option>
              <option value="P">Maior perda</option>
            </select>
          </div>
          {filteredTrades.length !== curMonthTrades.length && (
            <p className="note" style={{ margin: '8px 0 0' }}>
              Mostrando {filteredTrades.length} de {curMonthTrades.length} trades do mês.
            </p>
          )}
        </div>

        {/* Trades Table */}
        <div className="card">
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>Saída</th>
                  <th>Setup</th>
                  <th>Tipo</th>
                  <th>Ativo</th>
                  <th>Entrada</th>
                  <th>Notional</th>
                  <th>Gain %</th>
                  <th>Profit líquido</th>
                  <th>Sist.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t) => {
                  const c = calc(t);
                  const bc = c.open && t.corr ? corOf(t.corr) : null;
                  const nE = (t.ent || []).length;
                  const nX = (t.exs || []).length;
                  const riskT = riskOf(t);

                  return (
                    <tr
                      key={t.id}
                      className={`${c.open ? 'open' : ''} ${bc ? 'bc' : ''}`}
                      style={
                        bc
                          ? {
                              backgroundColor: `rgba(${parseInt(bc.c.slice(1, 3), 16)}, ${parseInt(
                                bc.c.slice(3, 5),
                                16
                              )}, ${parseInt(bc.c.slice(5, 7), 16)}, 0.15)`,
                              boxShadow: `inset 3px 0 0 ${bc.c}`,
                            }
                          : undefined
                      }
                      onClick={() => handleEditTrade(t)}
                      title={t.rel}
                    >
                      <td>
                        {dfmt(dOf(t))}
                        {c.open && (
                          <small>
                            {t.de.slice(0, 7) < month ? 'aberto desde ' + dfmt(t.de) : 'aberto'}
                          </small>
                        )}
                      </td>
                      <td>
                        {t.setup || '-'}
                        <small>{t.tf}</small>
                      </td>
                      <td>
                        <span className={`ty ${t.type}`}>{t.type}</span>
                        {t.mkt === 'SPOT' && <small>spot</small>}
                      </td>
                      <td>
                        {t.sym}
                        {t.corr && (
                          <small>
                            <i
                              className="dt"
                              style={{
                                background: corOf(t.corr) ? corOf(t.corr)!.c : '#777',
                              }}
                            />
                            {t.corr}
                          </small>
                        )}
                        {t.rel && <small>com relato</small>}
                      </td>
                      <td>
                        {fp(c.avg)}
                        {nE > 1 && <small>{nE} entradas</small>}
                        <small>
                          {c.open
                            ? c.part
                              ? 'saída parcial ' + fp(c.avgExit)
                              : '-'
                            : fp(c.avgExit) + (nX > 1 ? ` (${nX} saídas)` : '')}
                        </small>
                      </td>
                      <td>
                        {mny(tView, t.notional)}
                        <small>
                          {t.mkt === 'SPOT' ? 'spot' : pc(t.lev) + 'x'}
                          {c.part && ', restam ' + mny(tView, c.rem)}
                        </small>
                      </td>
                      <td>{c.open && !c.part ? '-' : f(c.g * 100) + '%'}</td>
                      <td className={c.open && !c.part ? '' : c.net > 0 ? 'pos' : c.net < 0 ? 'neg' : ''}>
                        {c.open && !c.part ? '-' : sgm(tView, c.net)}
                        {c.part && <small>realizado</small>}
                        {!c.open && riskT > 0 ? <small>{f(c.net / riskT)}R</small> : null}
                      </td>
                      <td>
                        <span className="sy">{sysOf(t)}</span>
                      </td>
                      <td>
                        {c.open && (
                          <button
                            className="fx"
                            aria-label="Fechar trade"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCloseModal(t);
                            }}
                          >
                            Fechar
                          </button>
                        )}
                        <button
                          aria-label="Excluir trade"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrade(t.id);
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!curMonthTrades.length && (
            <div className="empty" style={{ paddingTop: 14 }}>
              Nenhum trade neste mês. Preencha o formulário e salve.
            </div>
          )}
        </div>

        {/* Brokers Card */}
        <div className="card" id="brCard" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Corretoras</h3>
          <div id="brList">
            {brokers.map((b, i) => (
              <div key={i} className="lg2">
                <input
                  type="color"
                  value={b.c}
                  onChange={(e) => {
                    const updated = [...brokers];
                    updated[i].c = e.target.value;
                    setBrokers(updated);
                  }}
                  aria-label={`Cor de ${b.n}`}
                />
                <input
                  type="text"
                  value={b.n}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const oldName = brokers[i].n;
                    const updated = [...brokers];
                    updated[i].n = newName;
                    setBrokers(updated);
                    setTrades((prev) =>
                      prev.map((t) => (t.corr === oldName ? { ...t, corr: newName } : t))
                    );
                  }}
                  aria-label="Nome da corretora"
                />
                <button
                  type="button"
                  aria-label="Remover corretora"
                  onClick={async () => {
                    const ok = await askConfirm(
                      `Remover a corretora ${b.n}? Os trades já cadastrados mantêm o nome, mas perdem a cor.`
                    );
                    if (ok) {
                      setBrokers(brokers.filter((_, idx) => idx !== i));
                    }
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="lnk"
            onClick={() => {
              const cs = ['#facc15', '#ef4444', '#10b981', '#ec4899', '#06b6d4', '#84cc16'];
              setBrokers([
                ...brokers,
                {
                  n: 'Nova corretora ' + (brokers.length + 1),
                  c: cs[brokers.length % cs.length],
                },
              ]);
            }}
          >
            + Corretora
          </button>
          <p className="note" style={{ margin: 0 }}>
            Trades abertos aparecem na cor da corretora escolhida.
          </p>
        </div>

        {/* Backup Card */}
        <div className="card bk" style={{ marginTop: 20 }}>
          <p>Seus dados ficam salvos neste navegador. Baixe um backup de vez em quando.</p>
          <p className="note" style={{ margin: 0, flex: '1 1 100%' }}>
            {lastBk
              ? 'Último backup: ' + new Date(lastBk).toLocaleDateString('pt-BR')
              : 'Você ainda não fez backup.'}
          </p>
          <button className="ghost" onClick={handleBackup}>
            Backup (.json)
          </button>
          <label className="ghost" style={{ cursor: 'pointer', textAlign: 'center' }}>
            Restaurar backup
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleRestoreFile}
            />
          </label>
          {kmsg && (
            <div className="tmsg" style={{ margin: 0, width: '100%' }}>
              {kmsg}
            </div>
          )}
          {bkText && (
            <textarea
              readOnly
              value={bkText}
              style={{
                width: '100%',
                height: 90,
                marginTop: 8,
                background: 'rgba(0,0,0,.35)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: 8,
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
