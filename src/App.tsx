import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trade,
  Broker,
  CashFlow,
  OneOffLoss,
  RendaFixaItem,
  SystemConfig,
  SetupSpec,
  ProtocolState,
  SPEC0,
  DAILY_PHRASES,
  PROTO_STEPS,
} from './types';
import {
  f,
  usd,
  ymd,
  sumLoss,
  lim,
  stateOf,
  dayLoss,
  riskOf,
  sm,
  isU,
  calc,
  num,
} from './utils/calculations';
import { BackgroundFX } from './components/BackgroundFX';
import { ConfirmModal } from './components/ConfirmModal';
import { PhraseModal } from './components/PhraseModal';
import { CloseTradeModal } from './components/CloseTradeModal';
import { RiskView } from './views/RiskView';
import { TradesView } from './views/TradesView';
import { CarteiraView } from './views/CarteiraView';
import { ProtocolView } from './views/ProtocolView';
import { SetupsView } from './views/SetupsView';

const DEFAULT_BROKERS: Broker[] = [
  { n: 'Bitget', c: '#2dd4bf' },
  { n: 'Base', c: '#3b82f6' },
  { n: 'Phantom', c: '#a855f7' },
  { n: 'Íon Itaú', c: '#f97316' },
];

const DEFAULT_CFG: SystemConfig = {
  A: {
    name: 'Sistema A',
    per: 'semana',
    limit: 6,
    min: 0.5,
    max: 2,
    reset: 'Nova semana',
  },
  B: {
    name: 'Sistema B',
    per: 'mês',
    limit: 8,
    min: 1.5,
    max: 3,
    reset: 'Novo mês',
  },
};

export const App: React.FC = () => {
  // Navigation
  const [tab, setTab] = useState<'R' | 'T' | 'C' | 'P' | 'S'>(() => {
    try {
      const saved = localStorage.getItem('gr_tab');
      if (saved === 'R' || saved === 'T' || saved === 'C' || saved === 'P' || saved === 'S') {
        return saved;
      }
    } catch (e) {}
    return 'R';
  });

  // Capital & Bank
  const [bank, setBank] = useState<number>(() => {
    try {
      const b = localStorage.getItem('gr_bank');
      if (b !== null) return parseFloat(b) || 0;
    } catch (e) {}
    return 600;
  });

  const [base, setBase] = useState<number>(() => {
    try {
      const bs = localStorage.getItem('gr_base');
      if (bs !== null) return parseFloat(bs) || 0;
    } catch (e) {}
    return 600;
  });

  const [baseB, setBaseB] = useState<number>(() => {
    try {
      const b = localStorage.getItem('gr_baseB');
      if (b !== null) return parseFloat(b) || 0;
    } catch (e) {}
    return 0;
  });

  // Configuration & Ceilings
  const [cfg, setCfg] = useState<SystemConfig>(() => {
    try {
      const o = JSON.parse(localStorage.getItem('gr_cfg') || '{}');
      return {
        A: { ...DEFAULT_CFG.A, limit: o.A > 0 ? o.A : DEFAULT_CFG.A.limit },
        B: { ...DEFAULT_CFG.B, limit: o.B > 0 ? o.B : DEFAULT_CFG.B.limit },
      };
    } catch (e) {}
    return DEFAULT_CFG;
  });

  const [dlim, setDlim] = useState<number>(() => {
    try {
      const o = JSON.parse(localStorage.getItem('gr_cfg') || '{}');
      if (o.D > 0) return o.D;
    } catch (e) {}
    return 10;
  });

  // Setups Specs
  const [specs, setSpecs] = useState<SetupSpec[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gr_specs') || '{}');
      return SPEC0.map((x) => ({
        ...x,
        lo: saved[x.n]?.lo > 0 ? saved[x.n].lo : x.lo,
        hi: saved[x.n]?.hi > 0 ? saved[x.n].hi : x.hi,
      }));
    } catch (e) {}
    return SPEC0.map((x) => ({ ...x }));
  });

  // One-off losses
  const [st, setSt] = useState<{ A: OneOffLoss[]; B: OneOffLoss[] }>(() => {
    try {
      const r = localStorage.getItem('gr_v3');
      if (r) return JSON.parse(r);
    } catch (e) {}
    return { A: [], B: [] };
  });

  // Trades
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const r = localStorage.getItem('gr_trades');
      if (r) {
        const raw = JSON.parse(r);
        if (Array.isArray(raw)) return raw;
      }
    } catch (e) {}
    return [];
  });

  // Cash flows
  const [flows, setFlows] = useState<CashFlow[]>(() => {
    try {
      const r = localStorage.getItem('gr_flows');
      if (r) return JSON.parse(r);
    } catch (e) {}
    return [];
  });

  // Brokers
  const [brokers, setBrokers] = useState<Broker[]>(() => {
    try {
      const o = JSON.parse(localStorage.getItem('gr_brokers') || 'null');
      if (Array.isArray(o) && o.length) return o.filter((x) => x && x.n);
    } catch (e) {}
    return DEFAULT_BROKERS;
  });

  // Fixed Income (Renda Fixa)
  const [rf, setRf] = useState<RendaFixaItem[]>(() => {
    try {
      const r = localStorage.getItem('gr_rf');
      if (r) return JSON.parse(r);
    } catch (e) {}
    return [];
  });

  // Daily protocol
  const todayYMD = ymd(new Date());
  const [proto, setProto] = useState<ProtocolState>(() => {
    try {
      const r = JSON.parse(localStorage.getItem('gr_proto') || 'null');
      if (r && r.d === todayYMD && r.c) return r;
    } catch (e) {}
    return {
      d: todayYMD,
      c: {},
      g: '',
      l: '',
      e: '',
      o: false,
    };
  });

  // Protocol history
  const [phist, setPhist] = useState<Record<string, { ok: number; n: number; e: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gr_phist') || '{}') || {};
    } catch (e) {
      return {};
    }
  });

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [phrase, setPhrase] = useState<string | null>(null);
  const [closeTradeModal, setCloseTradeModal] = useState<Trade | null>(null);

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem('gr_bank', String(bank));
      localStorage.setItem('gr_base', String(base));
      localStorage.setItem('gr_baseB', String(baseB));
    } catch (e) {}
  }, [bank, base, baseB]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_cfg', JSON.stringify({ A: cfg.A.limit, B: cfg.B.limit, D: dlim }));
    } catch (e) {}
  }, [cfg, dlim]);

  useEffect(() => {
    try {
      const o: Record<string, { lo: number; hi: number }> = {};
      specs.forEach((x) => (o[x.n] = { lo: x.lo, hi: x.hi }));
      localStorage.setItem('gr_specs', JSON.stringify(o));
    } catch (e) {}
  }, [specs]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_v3', JSON.stringify(st));
    } catch (e) {}
  }, [st]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_trades', JSON.stringify(trades));
    } catch (e) {}
  }, [trades]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_flows', JSON.stringify(flows));
    } catch (e) {}
  }, [flows]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_brokers', JSON.stringify(brokers));
    } catch (e) {}
  }, [brokers]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_rf', JSON.stringify(rf));
    } catch (e) {}
  }, [rf]);

  useEffect(() => {
    try {
      localStorage.setItem('gr_tab', tab);
    } catch (e) {}
  }, [tab]);

  // Update protocol history whenever protocol changes
  useEffect(() => {
    try {
      localStorage.setItem('gr_proto', JSON.stringify(proto));
      const isStepDone = (s: (typeof PROTO_STEPS)[0]): boolean => {
        if (s.final) return proto.e === 'go';
        if (s.subs) return s.subs.every((_, i) => proto.c[`${s.id}.${i}`]);
        return !!proto.c[s.id];
      };
      const n = PROTO_STEPS.filter(isStepDone).length;
      const isOk = n === PROTO_STEPS.length ? 1 : 0;
      setPhist((prev) => {
        const updated = {
          ...prev,
          [proto.d]: { ok: isOk, n, e: proto.e || '' },
        };
        try {
          localStorage.setItem('gr_phist', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (e) {}
  }, [proto]);

  // Gate check
  const isProtoComplete = useMemo(() => {
    if (proto.d !== todayYMD) return false;
    const isStepDone = (s: (typeof PROTO_STEPS)[0]): boolean => {
      if (s.final) return proto.e === 'go';
      if (s.subs) return s.subs.every((_, i) => proto.c[`${s.id}.${i}`]);
      return !!proto.c[s.id];
    };
    return PROTO_STEPS.every(isStepDone) || !!proto.o;
  }, [proto, todayYMD]);

  useEffect(() => {
    document.body.classList.toggle('gated', !isProtoComplete);
    if (!isProtoComplete && tab !== 'P') {
      setTab('P');
    }
  }, [isProtoComplete, tab]);

  // Lock status
  const isLockA = bank > 0 && sumLoss('A', st, trades) >= lim('A', bank, cfg);
  const isLockB = bank > 0 && sumLoss('B', st, trades) >= lim('B', bank, cfg);
  const isLocked = isLockA || isLockB;

  useEffect(() => {
    document.body.classList.toggle('locked', isLocked);
  }, [isLocked]);

  // Confirm modal wrapper
  const askConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({ message, resolve });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmModal) {
      confirmModal.resolve(result);
      setConfirmModal(null);
    }
  };

  // Frase do dia
  const showDailyPhrase = () => {
    const t = new Date();
    const idx =
      Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5) % DAILY_PHRASES.length;
    setPhrase(DAILY_PHRASES[idx]);
  };

  const handleCompleteProtocol = () => {
    showDailyPhrase();
    if (tab === 'P') setTab('R');
  };

  const handleOverrideGated = () => {
    setProto((prev) => ({ ...prev, o: true }));
    showDailyPhrase();
    setTab('R');
  };

  // One-off loss handlers
  const handleAddLoss = (k: 'A' | 'B', val: number) => {
    setSt((prev) => ({
      ...prev,
      [k]: [...prev[k], { v: val, t: Date.now() }],
    }));
  };

  const handleDelLoss = (k: 'A' | 'B', timestamp: number) => {
    setSt((prev) => ({
      ...prev,
      [k]: prev[k].filter((e) => e.t !== timestamp),
    }));
  };

  const handleResetLosses = async (k: 'A' | 'B') => {
    const ok = await askConfirm(
      `Apagar todas as perdas avulsas do ${cfg[k].name}? (O teto já ignora sozinho as de períodos anteriores.) Perdas de trades não são apagadas: elas entram pela data de saída.`
    );
    if (ok) {
      setSt((prev) => ({ ...prev, [k]: [] }));
    }
  };

  // Status Banner calculation
  const [lblA, lvA] = stateOf('A', st, trades, bank, cfg);
  const [lblB, lvB] = stateOf('B', st, trades, bank, cfg);

  let bannerMsg = '';
  let bannerLevel: '' | 'warn' | 'bad' = '';

  const dl = num(proto.l);
  const curDayLoss = dayLoss(trades, st);

  if (bank <= 0) {
    bannerMsg = 'Informe o capital da banca para calcular os tetos.';
    bannerLevel = 'warn';
  } else if (isLockA && isLockB) {
    bannerMsg = 'Os dois sistemas estão travados. Pare e revise a estratégia.';
    bannerLevel = 'bad';
  } else if (isLockA) {
    bannerMsg = 'Sistema A travado nesta semana. Não abra trades de curto prazo (M15/H1).';
    bannerLevel = 'bad';
  } else if (isLockB) {
    bannerMsg = 'Sistema B travado neste mês. Não abra trades de longo prazo.';
    bannerLevel = 'bad';
  } else if (lvA === 'warn' || lvB === 'warn') {
    bannerMsg =
      'Atenção: ' +
      (lvA === 'warn' && lvB === 'warn'
        ? 'os dois sistemas estão'
        : lvA === 'warn'
        ? 'o Sistema A está'
        : 'o Sistema B está') +
      ' perto do teto.';
    bannerLevel = 'warn';
  } else {
    bannerMsg = 'Os dois sistemas estão liberados para novas entradas.';
  }

  if (proto.d === todayYMD && dl > 0 && curDayLoss >= dl) {
    bannerMsg = `Perda máxima do dia atingida (${usd(curDayLoss)} de ${usd(dl)}). Pare de operar hoje.`;
    bannerLevel = 'bad';
  }

  // Open trades risk extra text
  const openTrades = trades.filter(isU).filter((t) => calc(t).open);
  if (openTrades.length > 0) {
    const rOpen = sm(openTrades.map(riskOf));
    const ns = openTrades.filter((t) => !(t.stop && t.stop > 0)).length;
    bannerMsg +=
      ` Risco em aberto: ${usd(rOpen)}` +
      (bank > 0 ? ` (${f((rOpen / bank) * 100)}% da banca)` : '') +
      (ns ? `, ${ns} sem stop` : '') +
      '.';
  }

  // Backup data for export
  const fullBackupData = {
    v: 1,
    bank,
    base,
    flows,
    st,
    trades,
    brokers,
    rf,
    baseB,
    specs: Object.fromEntries(specs.map((x) => [x.n, { lo: x.lo, hi: x.hi }])),
    cfg: { A: cfg.A.limit, B: cfg.B.limit, D: dlim },
    phist,
  };

  const handleRestoreBackup = (data: any, isFull: boolean) => {
    if (isFull) {
      if (data.bank >= 0) setBank(data.bank);
      if (data.base >= 0) setBase(data.base);
      if (data.baseB >= 0) setBaseB(data.baseB);
      if (Array.isArray(data.flows)) setFlows(data.flows);
      if (data.st && data.st.A && data.st.B) setSt(data.st);
      if (Array.isArray(data.trades)) setTrades(data.trades);
      if (Array.isArray(data.brokers) && data.brokers.length) setBrokers(data.brokers);
      if (Array.isArray(data.rf)) setRf(data.rf);
      if (data.cfg) {
        setCfg({
          A: { ...DEFAULT_CFG.A, limit: data.cfg.A || 6 },
          B: { ...DEFAULT_CFG.B, limit: data.cfg.B || 8 },
        });
        if (data.cfg.D) setDlim(data.cfg.D);
      }
      if (data.specs) {
        setSpecs((prev) =>
          prev.map((s) => ({
            ...s,
            lo: data.specs[s.n]?.lo || s.lo,
            hi: data.specs[s.n]?.hi || s.hi,
          }))
        );
      }
      if (data.phist) setPhist(data.phist);
    } else {
      const raw = Array.isArray(data) ? data : data.trades;
      if (Array.isArray(raw)) {
        const existingKeys = new Set(trades.map((t) => `${t.sym}|${t.entry}|${t.de}|${t.he}`));
        const newTrades = raw.filter((t) => !existingKeys.has(`${t.sym}|${t.entry}|${t.de}|${t.he}`));
        setTrades((prev) => [...prev, ...newTrades]);
      }
    }
  };

  return (
    <>
      <BackgroundFX locked={isLocked} />

      <div className="wrap">
        <header>
          <div>
            <h1>Gestão de risco</h1>
            <p>Teto de perda acumulada por semana e por mês, calculado sobre o capital da banca.</p>
          </div>
          <div className="today">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="tabs" aria-label="Seções do app">
          <button
            id="tabR"
            className={tab === 'R' ? 'on' : ''}
            onClick={() => isProtoComplete && setTab('R')}
          >
            Risco
          </button>
          <button
            id="tabT"
            className={tab === 'T' ? 'on' : ''}
            onClick={() => isProtoComplete && setTab('T')}
          >
            Trades
          </button>
          <button
            id="tabC"
            className={tab === 'C' ? 'on' : ''}
            onClick={() => isProtoComplete && setTab('C')}
          >
            Carteira
          </button>
          <button
            id="tabP"
            className={tab === 'P' ? 'on' : ''}
            onClick={() => setTab('P')}
          >
            Protocolo
          </button>
          <button
            id="tabS"
            className={tab === 'S' ? 'on' : ''}
            onClick={() => isProtoComplete && setTab('S')}
          >
            Setups
          </button>
        </nav>

        {/* Status Banner */}
        <div id="banner" className={`banner ${bannerLevel}`}>
          <i />
          <span>{bannerMsg}</span>
        </div>

        {/* Tab Views */}
        {tab === 'R' && (
          <RiskView
            bank={bank}
            setBank={setBank}
            st={st}
            trades={trades}
            cfg={cfg}
            onAddLoss={handleAddLoss}
            onDelLoss={handleDelLoss}
            onResetLosses={handleResetLosses}
          />
        )}

        {tab === 'T' && (
          <TradesView
            trades={trades}
            setTrades={setTrades}
            brokers={brokers}
            setBrokers={setBrokers}
            bank={bank}
            base={base}
            cfg={cfg}
            specs={specs}
            dlim={dlim}
            st={st}
            flows={flows}
            onOpenCloseModal={(t) => setCloseTradeModal(t)}
            askConfirm={askConfirm}
            onRestoreBackup={handleRestoreBackup}
            fullBackupData={fullBackupData}
          />
        )}

        {tab === 'C' && (
          <CarteiraView
            trades={trades}
            base={base}
            setBase={setBase}
            baseB={baseB}
            setBaseB={setBaseB}
            flows={flows}
            setFlows={setFlows}
            rf={rf}
            setRf={setRf}
            bank={bank}
            setBank={setBank}
            cfg={cfg}
            askConfirm={askConfirm}
          />
        )}

        {tab === 'P' && (
          <ProtocolView
            proto={proto}
            setProto={setProto}
            trades={trades}
            onCompleteProtocol={handleCompleteProtocol}
            askConfirm={askConfirm}
            onOverrideGated={handleOverrideGated}
            phist={phist}
          />
        )}

        {tab === 'S' && (
          <SetupsView
            specs={specs}
            setSpecs={setSpecs}
            bank={bank}
            cfg={cfg}
            setCfg={setCfg}
            dlim={dlim}
            setDlim={setDlim}
            askConfirm={askConfirm}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        message={confirmModal?.message || null}
        onConfirm={() => handleConfirmClose(true)}
        onCancel={() => handleConfirmClose(false)}
      />

      {/* Frase do dia */}
      <PhraseModal phrase={phrase} onClose={() => setPhrase(null)} />

      {/* Quick Close Trade Modal */}
      <CloseTradeModal
        trade={closeTradeModal}
        onClose={() => setCloseTradeModal(null)}
        onSave={(updated) => {
          setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
      />
    </>
  );
};
