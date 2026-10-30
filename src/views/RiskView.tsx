import React, { useState } from 'react';
import { OneOffLoss, SystemConfig, Trade } from '../types';
import {
  f,
  usd,
  pc,
  num,
  lim,
  sumLoss,
  pctLoss,
  stateOf,
  openRisk,
  room,
} from '../utils/calculations';

interface RiskViewProps {
  bank: number;
  setBank: (val: number) => void;
  st: { A: OneOffLoss[]; B: OneOffLoss[] };
  trades: Trade[];
  cfg: SystemConfig;
  onAddLoss: (sys: 'A' | 'B', val: number) => void;
  onDelLoss: (sys: 'A' | 'B', timestamp: number) => void;
  onResetLosses: (sys: 'A' | 'B') => void;
}

export const RiskView: React.FC<RiskViewProps> = ({
  bank,
  setBank,
  st,
  trades,
  cfg,
  onAddLoss,
  onDelLoss,
  onResetLosses,
}) => {
  const [curSys, setCurSys] = useState<'A' | 'B'>('A');
  const [inpVal, setInpVal] = useState('');
  const [bankStr, setBankStr] = useState(bank ? pc(bank) : '');

  const R = 75;
  const C = 2 * Math.PI * R;

  const renderCard = (k: 'A' | 'B') => {
    const c = cfg[k];
    const s = sumLoss(k, st, trades);
    const L = lim(k, bank, cfg);
    const p = Math.min(pctLoss(k, st, trades, bank, cfg), 100);
    const oR = openRisk(k, trades);
    const rest = room(k, st, trades, bank, cfg);
    const [lbl, lv] = stateOf(k, st, trades, bank, cfg);
    const col = lv === 'bad' ? 'var(--bad)' : lv === 'warn' ? 'var(--warn)' : '';

    const sub =
      bank <= 0
        ? 'Informe o capital da banca'
        : rest > 0
        ? 'Ainda cabem ' + usd(rest) + ' de perda' + (oR > 0 ? ' (' + usd(oR) + ' comprometidos em trades abertos)' : '')
        : 'Não abra novas operações';

    const isLocked = bank > 0 && s >= L;

    return (
      <section className={`card sys ${k === 'B' ? 'b' : ''} ${isLocked ? 'lock' : ''}`}>
        <div className="top">
          <h2>{c.name}</h2>
          <span className="tag">Teto por {c.per}</span>
        </div>
        <div className="ring">
          <svg viewBox="0 0 176 176">
            <circle className="t" cx="88" cy="88" r={R} />
            <circle
              className="p"
              cx="88"
              cy="88"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - p / 100)}
              style={col ? { stroke: col } : undefined}
            />
          </svg>
          <div className="mid">
            <b>{usd(s)}</b>
            <span>de {usd(L)}</span>
          </div>
        </div>
        <div className="state" style={col ? { color: col } : undefined}>
          {lbl}
        </div>
        <div className="sub">{sub}</div>
        <div className="facts">
          <div className="fact">
            <small>Perda na banca</small>
            <strong>
              {f(bank > 0 ? (s / bank) * 100 : 0)}% de {c.limit}%
            </strong>
          </div>
          <div className="fact">
            <small>Risco por trade</small>
            <strong>
              {usd((bank * c.min) / 100)} a {usd((bank * c.max) / 100)}
            </strong>
          </div>
        </div>
        <button className="ghost" onClick={() => onResetLosses(k)}>
          {c.reset}
        </button>
      </section>
    );
  };

  const handleBankChange = (valStr: string) => {
    setBankStr(valStr);
    const v = num(valStr);
    setBank(isNaN(v) || v < 0 ? 0 : v);
  };

  const handleRegisterLoss = () => {
    const v = num(inpVal);
    if (bank <= 0) {
      alert('Informe o capital da banca primeiro.');
      return;
    }
    if (isNaN(v) || v <= 0) {
      alert('Digite uma perda em dólares maior que zero, por exemplo 12,50.');
      return;
    }
    onAddLoss(curSys, v);
    setInpVal('');
  };

  const curLossNum = num(inpVal);
  const curSysCfg = cfg[curSys];
  const isOver = curLossNum > (bank * curSysCfg.max) / 100;
  const hintText =
    curLossNum > 0 && bank > 0
      ? `${f((curLossNum / bank) * 100)}% da banca` +
        (isOver ? `. Acima do risco máximo por trade do ${curSysCfg.name} (${usd((bank * curSysCfg.max) / 100)}).` : '.')
      : '';

  const allLosses = [
    ...st.A.map((e) => ({ ...e, k: 'A' as const })),
    ...st.B.map((e) => ({ ...e, k: 'B' as const })),
  ].sort((x, y) => y.t - x.t);

  return (
    <div className="grid" id="vRisco">
      <div>
        <div className="cards">
          {renderCard('A')}
          {renderCard('B')}
        </div>
        <div className="rules">
          <div className="card">
            <h3>Sistema A, curto prazo</h3>
            <p id="rA">
              Teto de <b>{pc(cfg.A.limit)}%</b> da banca ({usd(lim('A', bank, cfg))}) por semana. Risco por trade de{' '}
              <b>0,5% a 2%</b> ({usd(bank * 0.005)} a {usd(bank * 0.02)}). Zera sozinho toda segunda-feira. Só perdas contam; ganhos
              não devolvem espaço.
            </p>
          </div>
          <div className="card">
            <h3>Sistema B, médio e longo prazo</h3>
            <p id="rB">
              Teto de <b>{pc(cfg.B.limit)}%</b> da banca ({usd(lim('B', bank, cfg))}) por mês. Risco por trade de{' '}
              <b>1,5% a 3%</b> ({usd(bank * 0.015)} a {usd(bank * 0.03)}). Zera sozinho todo dia 1º. Só perdas contam; ganhos não
              devolvem espaço.
            </p>
          </div>
        </div>
      </div>

      <aside>
        <div className="card bank">
          <h3>Capital da banca</h3>
          <div className="field pre">
            <span className="l">$</span>
            <input
              id="bankInp"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              autoComplete="off"
              aria-label="Capital da banca em dólares"
              value={bankStr}
              onChange={(e) => handleBankChange(e.target.value)}
            />
          </div>
          <p className="note">Os tetos e o risco por trade se ajustam a este valor.</p>
        </div>

        <div className="card reg">
          <h3>Perda avulsa</h3>
          <div className="seg" role="tablist">
            <button
              data-s="A"
              className={curSys === 'A' ? 'on' : ''}
              onClick={() => setCurSys('A')}
            >
              Sistema A
            </button>
            <button
              data-s="B"
              className={curSys === 'B' ? 'on' : ''}
              onClick={() => setCurSys('B')}
            >
              Sistema B
            </button>
          </div>
          <div className="field pre">
            <span className="l">$</span>
            <input
              id="inp"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              autoComplete="off"
              aria-label="Perda em dólares"
              value={inpVal}
              onChange={(e) => setInpVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRegisterLoss();
              }}
            />
          </div>
          <div className="chips">
            {[0.5, 1, 1.5, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInpVal(pc(+((bank * p) / 100).toFixed(2)))}
              >
                {usd((bank * p) / 100)} <small style={{ opacity: 0.6 }}>{pc(p)}%</small>
              </button>
            ))}
          </div>
          <div className="hint" style={isOver ? { color: 'var(--warn)' } : undefined}>
            {hintText}
          </div>
          <button
            className={`go ${curSys === 'B' ? 'b' : ''}`}
            onClick={handleRegisterLoss}
          >
            Registrar perda
          </button>
        </div>

        <div className="card hist">
          <h3>Histórico de perdas avulsas</h3>
          <div className="list">
            {allLosses.length ? (
              allLosses.map((e) => (
                <div key={e.t} className="row">
                  <span
                    className="d"
                    style={{ background: e.k === 'A' ? 'var(--a)' : 'var(--b)' }}
                  />
                  <div className="n">
                    {cfg[e.k].name}
                    <small>
                      {new Date(e.t).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      , {f(bank > 0 ? (e.v / bank) * 100 : 0)}% da banca
                    </small>
                  </div>
                  <b>-{usd(e.v)}</b>
                  <button
                    title="Remover"
                    aria-label="Remover registro"
                    onClick={() => onDelLoss(e.k, e.t)}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                Nenhuma perda avulsa. As perdas dos trades fechados entram sozinhas, pela aba Trades.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
