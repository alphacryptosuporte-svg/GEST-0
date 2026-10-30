import React, { useState } from 'react';
import { Trade, CashFlow, RendaFixaItem, SystemConfig } from '../types';
import {
  f,
  usd,
  mny,
  sgm,
  sg,
  pc,
  pp,
  pl,
  num,
  ymd,
  calc,
  riskOf,
  dOf,
  sm,
  cartData,
  monthReport,
  isU,
} from '../utils/calculations';

interface CarteiraViewProps {
  trades: Trade[];
  base: number;
  setBase: (val: number) => void;
  baseB: number;
  setBaseB: (val: number) => void;
  flows: CashFlow[];
  setFlows: React.Dispatch<React.SetStateAction<CashFlow[]>>;
  rf: RendaFixaItem[];
  setRf: React.Dispatch<React.SetStateAction<RendaFixaItem[]>>;
  bank: number;
  setBank: (val: number) => void;
  cfg: SystemConfig;
  askConfirm: (msg: string) => Promise<boolean>;
}

export const CarteiraView: React.FC<CarteiraViewProps> = ({
  trades,
  base,
  setBase,
  baseB,
  setBaseB,
  flows,
  setFlows,
  rf,
  setRf,
  bank,
  setBank,
  cfg,
  askConfirm,
}) => {
  const [rfMonth, setRfMonth] = useState(ymd(new Date()).slice(0, 7));
  const [cmonth, setCmonth] = useState('');
  const [pdim, setPdim] = useState<'setup' | 'ativo' | 'corretora' | 'dia' | 'hora'>('setup');

  // New cash flow form
  const [flD, setFlD] = useState(ymd(new Date()));
  const [flV, setFlV] = useState('');

  // Fixed income inputs
  const [rfTitleUSD, setRfTitleUSD] = useState('');
  const [rfInitUSD, setRfInitUSD] = useState('');
  const [rfTitleBRL, setRfTitleBRL] = useState('');
  const [rfInitBRL, setRfInitBRL] = useState('');

  const D = cartData(trades, base, flows);
  const rows = D.rows;
  const withT = rows.filter((r) => r.n > 0);

  const selectedMonth =
    cmonth || (withT.length ? withT[withT.length - 1].m : rows.length ? rows[rows.length - 1].m : '');

  const rep = selectedMonth ? monthReport(D, selectedMonth, cfg) : null;

  // Add flow
  const handleAddFlow = () => {
    const v = num(flV);
    if (!flD || isNaN(v) || !v) return;
    setFlows([...flows, { d: flD, v }]);
    setFlV('');
  };

  const handleDelFlow = (idx: number) => {
    setFlows(flows.filter((_, i) => i !== idx));
  };

  const handleUseCap = async () => {
    const totalPnl = sm(rows.map((r) => r.pnl));
    const totalFlows = sm(flows.map((x) => x.v));
    const v = base + totalFlows + totalPnl;
    const ok = await askConfirm(
      `Definir o capital da aba Risco como ${usd(v)}? Os tetos e o risco por trade passam a usar este valor.`
    );
    if (ok) {
      setBank(Math.max(0, +v.toFixed(2)));
    }
  };

  // Fixed income handlers
  const handleAddRf = (c: 'USD' | 'BRL') => {
    const t = c === 'USD' ? rfTitleUSD.trim() : rfTitleBRL.trim();
    if (!t) return;
    const p = num(c === 'USD' ? rfInitUSD : rfInitBRL);
    setRf([
      ...rf,
      {
        id: Date.now(),
        t,
        c,
        p: isNaN(p) ? 0 : p,
        m: {},
        a: {},
      },
    ]);
    if (c === 'USD') {
      setRfTitleUSD('');
      setRfInitUSD('');
    } else {
      setRfTitleBRL('');
      setRfInitBRL('');
    }
  };

  const handleDelRf = async (id: number, title: string) => {
    const ok = await askConfirm(`Remover a renda fixa "${title}"?`);
    if (!ok) return;
    setRf(rf.filter((x) => x.id !== id));
  };

  const handleRfAporte = (id: number, val: string) => {
    setRf(
      rf.map((item) => {
        if (item.id !== id) return item;
        const newA = { ...item.a };
        if (val.trim() === '') delete newA[rfMonth];
        else {
          const n = num(val);
          if (!isNaN(n)) newA[rfMonth] = n;
        }
        return { ...item, a: newA };
      })
    );
  };

  const handleRfProfit = (id: number, val: string) => {
    setRf(
      rf.map((item) => {
        if (item.id !== id) return item;
        const newM = { ...item.m };
        if (val.trim() === '') delete newM[rfMonth];
        else {
          const n = num(val);
          if (!isNaN(n)) newM[rfMonth] = n;
        }
        return { ...item, m: newM };
      })
    );
  };

  // SVG Chart calculation
  const chartPts = [{ l: 'início', v: base }, ...rows.map((r) => ({ l: r.m.slice(5, 7) + '/' + r.m.slice(2, 4), v: r.end }))];
  const chartVs = chartPts.map((p) => p.v);
  const mnChart = Math.min(...chartVs);
  const mxChart = Math.max(...chartVs);
  const padChart = (mxChart - mnChart || Math.abs(base) || 1) * 0.12;
  const loChart = mnChart - padChart;
  const hiChart = mxChart + padChart;
  const W_chart = 560;
  const H_chart = 210;
  const plChart = 14;
  const prChart = 14;
  const ptChart = 30;
  const pbChart = 30;

  const X_chart = (i: number) =>
    plChart + (chartPts.length > 1 ? (i / (chartPts.length - 1)) * (W_chart - plChart - prChart) : (W_chart - plChart - prChart) / 2);
  const Y_chart = (v: number) => ptChart + (1 - (v - loChart) / (hiChart - loChart)) * (H_chart - ptChart - pbChart);
  const isUpChart = chartPts[chartPts.length - 1].v >= base;
  const colChart = isUpChart ? '#22e5ff' : 'var(--bad)';
  const stepChart = Math.ceil(chartPts.length / 8);
  const lastIdx = chartPts.length - 1;

  // Performance dimension breakdown
  const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const PD = {
    setup: (t: Trade) => t.setup || 'SEM SETUP',
    ativo: (t: Trade) => t.sym,
    corretora: (t: Trade) => t.corr || '(sem corretora)',
    dia: (t: Trade) => DIA[new Date(dOf(t) + 'T00:00:00').getDay()],
    hora: (t: Trade) => (t.he ? t.he.slice(0, 2) + 'h' : 'sem hora'),
  };

  const perfGroups: Record<
    string,
    { n: number; w: number; pnl: number; R: number; nR: number }
  > = {};
  const perfTotals = { n: 0, pnl: 0, R: 0, nR: 0 };

  trades.filter(isU).forEach((t) => {
    const c = calc(t);
    if (c.open) return;
    const k = PD[pdim](t);
    const r = riskOf(t);
    const g = (perfGroups[k] = perfGroups[k] || { n: 0, w: 0, pnl: 0, R: 0, nR: 0 });
    g.n++;
    perfTotals.n++;
    if (c.net > 0) g.w++;
    g.pnl += c.net;
    perfTotals.pnl += c.net;
    if (r > 0) {
      g.R += c.net / r;
      g.nR++;
      perfTotals.R += c.net / r;
      perfTotals.nR++;
    }
  });

  const perfRows = Object.entries(perfGroups).sort((a, b) =>
    pdim === 'dia'
      ? DIA.indexOf(a[0]) - DIA.indexOf(b[0])
      : pdim === 'hora'
      ? a[0].localeCompare(b[0])
      : b[1].pnl - a[1].pnl
  );

  const sR = (v: number) => (v >= 0 ? '+' : '') + f(v) + 'R';

  // Overall accumulated wallet metrics
  const totalFlowSum = sm(flows.map((x) => x.v));
  const totalPnlSum = sm(rows.map((r) => r.pnl));
  const totalWins = sm(rows.map((r) => r.w));
  const totalLosses = sm(rows.map((r) => r.l));
  const totalTradesCount = totalWins + totalLosses;
  const allWinsList = D.closed.map((t) => calc(t).net).filter((x) => x > 0);
  const allLossesList = D.closed.map((t) => -calc(t).net).filter((x) => x > 0);

  const currentCapital = base + totalFlowSum + totalPnlSum;

  const renderRendaFixaCol = (c: 'USD' | 'BRL') => {
    const items = rf.filter((r) => r.c === c);
    const m = rfMonth;
    const upto = (o: Record<string, number>) =>
      Object.keys(o || {})
        .filter((k) => k <= m)
        .reduce((a, k) => a + o[k], 0);

    const tp = trades
      .filter((t) => (t.cart || 'USD') === c && !calc(t).open && dOf(t).slice(0, 7) === m)
      .reduce((a, t) => a + calc(t).net, 0);

    const pr = items.reduce((a, r) => a + ((r.m || {})[m] || 0), 0);
    const am = items.reduce((a, r) => a + ((r.a || {})[m] || 0), 0);
    const ap = items.reduce((a, r) => a + (r.p || 0) + upto(r.a || {}), 0);
    const ac = items.reduce((a, r) => a + upto(r.m || {}), 0);
    const rc = ap + ac;

    const tc =
      c === 'USD'
        ? (() => {
            const rs = D.rows.filter((r) => r.m <= m);
            return rs.length
              ? rs[rs.length - 1].end
              : base + sm(flows.filter((x) => x.d.slice(0, 7) <= m).map((x) => x.v));
          })()
        : baseB +
          trades
            .filter((t) => t.cart === 'BRL' && !calc(t).open && dOf(t).slice(0, 7) <= m)
            .reduce((a, t) => a + calc(t).net, 0);

    return (
      <div className="cbox">
        <h4>Carteira {c}</h4>
        <div className="caps">
          <div>
            <small>{c === 'USD' ? 'Capital em trades' : 'Capital em ações'}</small>
            <b>{mny(c, tc)}</b>
          </div>
          <div>
            <small>Capital em renda fixa</small>
            <b>{mny(c, rc)}</b>
          </div>
          <div className="tot">
            <small>Capital total da carteira</small>
            <b>{mny(c, tc + rc)}</b>
          </div>
        </div>

        {c === 'BRL' && (
          <label className="bl">
            Capital inicial em ações (R$)
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={baseB ? pc(baseB) : ''}
              onChange={(e) => {
                const n = num(e.target.value);
                setBaseB(isNaN(n) || n < 0 ? 0 : n);
              }}
            />
          </label>
        )}

        <div className="sumrow">
          <div>
            <small>{c === 'USD' ? 'Trades no mês' : 'Ações no mês'}</small>
            <b className={tp > 0 ? 'pos' : tp < 0 ? 'neg' : ''}>{sgm(c, tp)}</b>
          </div>
          <div>
            <small>Renda fixa no mês</small>
            <b className={pr > 0 ? 'pos' : pr < 0 ? 'neg' : ''}>{sgm(c, pr)}</b>
          </div>
          <div>
            <small>Total do mês</small>
            <b className={tp + pr > 0 ? 'pos' : tp + pr < 0 ? 'neg' : ''}>{sgm(c, tp + pr)}</b>
          </div>
          <div>
            <small>Aportes no mês</small>
            <b>{mny(c, am)}</b>
          </div>
          <div>
            <small>Aplicado em RF</small>
            <b>{mny(c, ap)}</b>
          </div>
          <div>
            <small>RF acumulada</small>
            <b className={ac > 0 ? 'pos' : ac < 0 ? 'neg' : ''}>{sgm(c, ac)}</b>
          </div>
        </div>

        <h5>Renda fixa {c}</h5>
        <div>
          {items.length ? (
            items.map((r) => (
              <div key={r.id} className="rfr">
                <div className="n">
                  <b>{r.t}</b>
                  <small>
                    Aplicado {mny(c, (r.p || 0) + upto(r.a || {}))}
                    {r.p ? ` (inicial ${mny(c, r.p)})` : ''} · Lucro acum. {sgm(c, upto(r.m || {}))}
                  </small>
                </div>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => handleDelRf(r.id, r.t)}
                >
                  ×
                </button>
                <div className="in">
                  <label>
                    Aporte do mês
                    <input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={(r.a || {})[rfMonth] !== undefined ? pc((r.a || {})[rfMonth]) : ''}
                      onChange={(e) => handleRfAporte(r.id, e.target.value)}
                    />
                  </label>
                  <label>
                    Lucro do mês
                    <input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={(r.m || {})[rfMonth] !== undefined ? pc((r.m || {})[rfMonth]) : ''}
                      onChange={(e) => handleRfProfit(r.id, e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Nenhuma renda fixa ainda.</div>
          )}
        </div>

        <div className="rfa">
          <input
            placeholder="Título (ex.: CDB 110% CDI)"
            autoComplete="off"
            value={c === 'USD' ? rfTitleUSD : rfTitleBRL}
            onChange={(e) => (c === 'USD' ? setRfTitleUSD(e.target.value) : setRfTitleBRL(e.target.value))}
          />
          <input
            inputMode="decimal"
            placeholder="Valor inicial aplicado (opcional)"
            autoComplete="off"
            value={c === 'USD' ? rfInitUSD : rfInitBRL}
            onChange={(e) => (c === 'USD' ? setRfInitUSD(e.target.value) : setRfInitBRL(e.target.value))}
          />
          <button className="ghost" onClick={() => handleAddRf(c)}>
            + Renda fixa
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="vCart" className="cgrid">
      {/* Fixed Income Card */}
      <div className="card" id="rfCard">
        <div className="thead" style={{ marginBottom: 12 }}>
          <h3>Carteiras USD e BRL</h3>
          <input
            type="month"
            id="rfM"
            aria-label="Mês"
            value={rfMonth}
            onChange={(e) => setRfMonth(e.target.value || rfMonth)}
          />
        </div>
        <p className="note" style={{ margin: '0 0 14px' }}>
          Renda fixa com lucro do mês anotado manualmente. Trades da carteira BRL (ações brasileiras) entram em R$ e não afetam os limites de risco em USD.
        </p>
        <div className="cols2">
          {renderRendaFixaCol('USD')}
          {renderRendaFixaCol('BRL')}
        </div>
      </div>

      {/* Accumulated USD Wallet */}
      <div className="card">
        <div className="thead">
          <h3>Carteira USD acumulada (trades)</h3>
          <small id="cInfo" style={{ color: 'var(--ink3)', fontSize: 12 }}>
            {rows.length ? `Capital inicial: ${usd(base)} (editável em Capital e movimentações)` : ''}
          </small>
        </div>
        {rows.length > 0 && (
          <div className="sumrow">
            <div>
              <small>Resultado acumulado</small>
              <b className={totalPnlSum > 0 ? 'cy' : totalPnlSum < 0 ? 'neg' : ''}>
                {sg(totalPnlSum)}
              </b>
            </div>
            <div>
              <small>Retorno acumulado</small>
              <b className={base > 0 && totalPnlSum > 0 ? 'cy' : base > 0 && totalPnlSum < 0 ? 'neg' : ''}>
                {base > 0 ? pp((totalPnlSum / base) * 100) : '-'}
              </b>
              <small>sobre {usd(base)}</small>
            </div>
            <div>
              <small>Capital atual</small>
              <b className="cy">{usd(currentCapital)}</b>
            </div>
            <div>
              <small>Drawdown máximo</small>
              <b className={D.dd > 0 ? 'neg' : ''}>{D.dd > 0 ? '-' + usd(D.dd) : '-'}</b>
              {D.dd > 0 && <small>{f(D.ddp)}% do pico</small>}
            </div>
            <div>
              <small>Trades fechados</small>
              <b>{totalTradesCount}</b>
              {D.open.length > 0 && <small>{D.open.length} em aberto</small>}
            </div>
            <div>
              <small>Taxa de acerto</small>
              <b className={totalTradesCount ? (totalWins / totalTradesCount >= 0.5 ? 'cy' : 'neg') : ''}>
                {totalTradesCount ? f((totalWins / totalTradesCount) * 100) + '%' : '-'}
              </b>
              {totalTradesCount ? (
                <small>
                  {totalWins} ganhos e {totalLosses} perdas
                </small>
              ) : null}
            </div>
            <div>
              <small>Profit factor</small>
              <b className={allLossesList.length ? (sm(allWinsList) / sm(allLossesList) >= 1 ? 'cy' : 'neg') : allWinsList.length ? 'cy' : ''}>
                {allLossesList.length
                  ? f(sm(allWinsList) / sm(allLossesList))
                  : allWinsList.length
                  ? '∞'
                  : '-'}
              </b>
            </div>
            <div>
              <small>Meses positivos</small>
              <b className={withT.length ? (withT.filter((r) => r.pnl > 0).length / withT.length >= 0.5 ? 'cy' : 'neg') : ''}>
                {withT.length ? `${withT.filter((r) => r.pnl > 0).length} de ${withT.length}` : '-'}
              </b>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <svg
              viewBox={`0 0 ${W_chart} ${H_chart}`}
              style={{ width: '100%', height: 'auto', display: 'block', font: '12px var(--f)' }}
              role="img"
              aria-label="Capital da carteira mês a mês"
            >
              <line
                x1={plChart}
                x2={W_chart - prChart}
                y1={Y_chart(base)}
                y2={Y_chart(base)}
                stroke="var(--line)"
                strokeDasharray="4 4"
              />
              <polyline
                fill="none"
                stroke={colChart}
                strokeWidth={2.2}
                strokeLinejoin="round"
                points={chartPts.map((p, i) => X_chart(i) + ',' + Y_chart(p.v)).join(' ')}
              />
              {chartPts.map((p, i) => (
                <React.Fragment key={i}>
                  <circle
                    cx={X_chart(i)}
                    cy={Y_chart(p.v)}
                    r={i === lastIdx ? 4.5 : 3}
                    fill={colChart}
                  />
                  {(i % stepChart === 0 || i === lastIdx) && (
                    <text
                      x={X_chart(i)}
                      y={H_chart - 8}
                      textAnchor={i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle'}
                      fill="var(--ink3)"
                    >
                      {p.l}
                    </text>
                  )}
                </React.Fragment>
              ))}
              <text
                x={X_chart(lastIdx)}
                y={Math.max(14, Y_chart(chartPts[lastIdx].v) - 12)}
                textAnchor={lastIdx === 0 ? 'start' : 'end'}
                fill="var(--ink)"
                style={{ fontWeight: 700 }}
              >
                {usd(chartPts[lastIdx].v)}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Month by month table */}
      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Mês a mês</h3>
        <div className="cwrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Trades</th>
                <th>Acerto</th>
                <th>Resultado</th>
                <th>Retorno</th>
                <th>Acumulado</th>
                <th>Acum. %</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .reverse()
                .map((r) => {
                  const mLabel =
                    new Date(+r.m.slice(0, 4), +r.m.slice(5, 7) - 1).toLocaleDateString('pt-BR', {
                      month: 'short',
                    }) +
                    '/' +
                    r.m.slice(2, 4);
                  return (
                    <tr
                      key={r.m}
                      onClick={() => setCmonth(r.m)}
                      style={r.m === selectedMonth ? { background: 'var(--soft)' } : undefined}
                    >
                      <td style={{ textTransform: 'capitalize' }}>
                        {mLabel}
                        {r.open.length > 0 && (
                          <small>
                            {r.open.length} aberto{r.open.length > 1 ? 's' : ''}
                          </small>
                        )}
                      </td>
                      <td>{r.n || '-'}</td>
                      <td className={r.n ? (r.w / r.n >= 0.5 ? 'cy' : 'neg') : ''}>
                        {r.n ? f((r.w / r.n) * 100) + '%' : '-'}
                      </td>
                      <td className={r.n ? (r.pnl > 0 ? 'cy' : r.pnl < 0 ? 'neg' : '') : ''}>
                        {r.n ? sg(r.pnl) : '-'}
                      </td>
                      <td className={r.n && r.ret !== null ? (r.ret > 0 ? 'cy' : r.ret < 0 ? 'neg' : '') : ''}>
                        {r.n && r.ret !== null ? pp(r.ret) : '-'}
                      </td>
                      <td className={r.cum > 0 ? 'cy' : r.cum < 0 ? 'neg' : ''}>{sg(r.cum)}</td>
                      <td className={r.cum > 0 ? 'cy' : r.cum < 0 ? 'neg' : ''}>
                        {r.cumPct !== null ? pp(r.cumPct) : '-'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty" style={{ paddingTop: 14 }}>
            Nenhum trade registrado ainda. Salve trades na aba Trades para acompanhar a carteira.
          </div>
        )}
      </div>

      {/* Capital and cash flows */}
      <div className="card tf">
        <h3>Capital e movimentações</h3>
        <div className="r2">
          <div>
            <label>Capital inicial da carteira (US$)</label>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={base ? pc(base) : ''}
              onChange={(e) => {
                const n = num(e.target.value);
                setBase(isNaN(n) || n < 0 ? 0 : n);
              }}
            />
          </div>
          <div>
            <label>
              Capital atual: <b>{usd(currentCapital)}</b>
            </label>
            <button
              type="button"
              className="ghost"
              style={{ marginTop: 2 }}
              onClick={handleUseCap}
            >
              Aplicar ao teto de risco
            </button>
          </div>
        </div>

        <div className="r2">
          <div>
            <label>Data do aporte ou saque</label>
            <input
              type="date"
              value={flD}
              onChange={(e) => setFlD(e.target.value)}
            />
          </div>
          <div>
            <label>Valor (negativo = saque)</label>
            <input
              inputMode="decimal"
              placeholder="500 ou -200"
              value={flV}
              onChange={(e) => setFlV(e.target.value)}
            />
          </div>
        </div>
        <button className="ghost" onClick={handleAddFlow}>
          Registrar movimentação
        </button>

        <div id="flList" style={{ marginTop: 8 }}>
          {flows
            .slice()
            .reverse()
            .map((x, i) => (
              <div key={i} className="row">
                <div className="n">
                  {x.d.slice(8, 10)}/{x.d.slice(5, 7)}/{x.d.slice(0, 4)}
                  <small>{x.v >= 0 ? 'aporte' : 'saque'}</small>
                </div>
                <b className={x.v >= 0 ? 'pos' : 'neg'}>{sg(x.v)}</b>
                <button
                  aria-label="Remover"
                  onClick={() => handleDelFlow(flows.length - 1 - i)}
                >
                  ×
                </button>
              </div>
            ))}
        </div>
        <p className="note">
          O capital inicial e as movimentações alimentam só a Carteira. Mudar o capital da aba Risco não reescreve mais o histórico.
        </p>
      </div>

      {/* Performance by dimension */}
      <div className="card" id="perfCard">
        <h3 style={{ marginBottom: 10 }}>Desempenho por recorte</h3>
        <div className="chips" id="perfDims">
          {(['setup', 'ativo', 'corretora', 'dia', 'hora'] as const).map((dim) => (
            <button
              key={dim}
              data-d={dim}
              className={pdim === dim ? 'on' : ''}
              onClick={() => setPdim(dim)}
            >
              {dim === 'setup'
                ? 'Setup'
                : dim === 'ativo'
                ? 'Ativo'
                : dim === 'corretora'
                ? 'Corretora'
                : dim === 'dia'
                ? 'Dia da semana'
                : 'Hora de entrada'}
            </button>
          ))}
        </div>

        {perfTotals.n > 0 && (
          <div
            className="sumrow"
            style={{ margin: '0 0 12px', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}
          >
            <div>
              <small>Trades fechados</small>
              <b>{perfTotals.n}</b>
            </div>
            <div>
              <small>R acumulado</small>
              <b className={perfTotals.R > 0 ? 'cy' : perfTotals.R < 0 ? 'neg' : ''}>
                {sR(perfTotals.R)}
              </b>
              <small>em {perfTotals.nR} com stop</small>
            </div>
            <div>
              <small>Expectativa</small>
              <b className={perfTotals.nR && perfTotals.R > 0 ? 'cy' : perfTotals.nR && perfTotals.R < 0 ? 'neg' : ''}>
                {perfTotals.nR ? sR(perfTotals.R / perfTotals.nR) : '-'}
              </b>
              <small>por trade com stop</small>
            </div>
            <div>
              <small>Expectativa em US$</small>
              <b className={perfTotals.pnl > 0 ? 'cy' : perfTotals.pnl < 0 ? 'neg' : ''}>
                {sg(perfTotals.pnl / perfTotals.n)}
              </b>
              <small>por trade</small>
            </div>
          </div>
        )}

        <div className="cwrap">
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Trades</th>
                <th>Acerto</th>
                <th>Resultado</th>
                <th>Expectativa</th>
              </tr>
            </thead>
            <tbody>
              {perfRows.length ? (
                perfRows.map(([k, g]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{g.n}</td>
                    <td>{f((g.w / g.n) * 100)}%</td>
                    <td className={g.pnl > 0 ? 'pos' : g.pnl < 0 ? 'neg' : ''}>{sg(g.pnl)}</td>
                    <td>
                      {g.nR ? sR(g.R / g.nR) : '-'}
                      <small>{g.nR} com stop</small>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--ink3)' }}>
                    Sem trades fechados na carteira USD.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ margin: '10px 0 0' }}>
          Considera trades fechados da carteira USD. O R de cada trade é o resultado dividido pelo risco até o stop; trades sem stop ficam fora da conta de R.
        </p>
      </div>

      {/* Monthly Report Card */}
      {rows.length > 0 && rep && (
        <div className="card" id="cRepCard">
          <div className="thead" style={{ marginBottom: 12 }}>
            <h3>Relatório do mês</h3>
            <select value={selectedMonth} onChange={(e) => setCmonth(e.target.value)}>
              {rows
                .slice()
                .reverse()
                .map((r) => (
                  <option key={r.m} value={r.m}>
                    {new Date(+r.m.slice(0, 4), +r.m.slice(5, 7) - 1).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
            </select>
          </div>

          <div className="rep">
            <span className={`hl ${rep.tone}`}>{rep.head}</span>
            {rep.P.map((p, i) => (
              <p key={i}>{p}</p>
            ))}

            {rep.G.length > 0 && (
              <>
                <h4>O que funcionou</h4>
                <ul>
                  {rep.G.map((x, i) => (
                    <li key={i} className="g">
                      <i />
                      <div>
                        {x.t}
                        {x.r && <small>{x.r}</small>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {rep.Wn.length > 0 ? (
              <>
                <h4>Pontos de atenção</h4>
                <ul>
                  {rep.Wn.map((x, i) => (
                    <li key={i} className="w">
                      <i />
                      <div>
                        {x.t}
                        {x.r && <small>{x.r}</small>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : rep.n > 0 ? (
              <>
                <h4>Pontos de atenção</h4>
                <ul>
                  <li className="g">
                    <i />
                    <div>Nenhuma regra de risco foi violada neste mês.</div>
                  </li>
                </ul>
              </>
            ) : null}

            <h4>Foco para o próximo mês</h4>
            <ul>
              {rep.F.map((x, i) => (
                <li key={i} className="f">
                  <i />
                  <div>
                    {x.t}
                    {x.r && <small>{x.r}</small>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="src">
              Relatório gerado automaticamente a partir dos seus trades, com base no ebook Masterclass de Trading (Mentoria Horistic). Material educativo, não é recomendação de investimento.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
