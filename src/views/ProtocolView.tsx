import React from 'react';
import { ProtocolState, ProtocolStep, Trade, PROTO_STEPS } from '../types';
import { f, sg, ymd, calc, sm, pl, num, isU } from '../utils/calculations';

interface ProtocolViewProps {
  proto: ProtocolState;
  setProto: React.Dispatch<React.SetStateAction<ProtocolState>>;
  trades: Trade[];
  onCompleteProtocol: () => void;
  askConfirm: (msg: string) => Promise<boolean>;
  onOverrideGated: () => void;
  phist: Record<string, { ok: number; n: number; e: string }>;
}

export const ProtocolView: React.FC<ProtocolViewProps> = ({
  proto,
  setProto,
  trades,
  onCompleteProtocol,
  askConfirm,
  onOverrideGated,
  phist,
}) => {
  const isStepDone = (s: ProtocolStep): boolean => {
    if (s.final) return proto.e === 'go';
    if (s.subs) return s.subs.every((_, i) => proto.c[`${s.id}.${i}`]);
    return !!proto.c[s.id];
  };

  const completedCount = PROTO_STEPS.filter(isStepDone).length;
  const totalCount = PROTO_STEPS.length;
  const isAllDone = completedCount === totalCount;

  const toggleStep = (stepId: string) => {
    const wasAllDone = PROTO_STEPS.every(isStepDone);
    const parts = stepId.split('.');
    const id = parts[0];
    const s = PROTO_STEPS.find((x) => x.id === id);
    if (!s) return;

    const newC = { ...proto.c };
    if (parts.length === 1) {
      if (s.subs) {
        const allSubsDone = isStepDone(s);
        s.subs.forEach((_, j) => {
          newC[`${id}.${j}`] = !allSubsDone;
        });
      } else {
        newC[id] = !newC[id];
      }
    } else {
      newC[stepId] = !newC[stepId];
    }

    const updated = { ...proto, c: newC };
    setProto(updated);

    const willBeAllDone = PROTO_STEPS.every((st) => {
      if (st.final) return updated.e === 'go';
      if (st.subs) return st.subs.every((_, i) => updated.c[`${st.id}.${i}`]);
      return !!updated.c[st.id];
    });

    if (!wasAllDone && willBeAllDone) {
      onCompleteProtocol();
    }
  };

  const handleDecision = (val: 'go' | 'stop') => {
    const wasAllDone = PROTO_STEPS.every(isStepDone);
    const newE = proto.e === val ? '' : val;
    const updated = { ...proto, e: newE };
    setProto(updated);

    const willBeAllDone = PROTO_STEPS.every((st) => {
      if (st.final) return updated.e === 'go';
      if (st.subs) return st.subs.every((_, i) => updated.c[`${st.id}.${i}`]);
      return !!updated.c[st.id];
    });

    if (!wasAllDone && willBeAllDone) {
      onCompleteProtocol();
    }
  };

  const handleReset = async () => {
    const ok = await askConfirm('Reiniciar o checklist de hoje?');
    if (!ok) return;
    setProto({
      d: ymd(new Date()),
      c: {},
      g: '',
      l: '',
      e: '',
      o: false,
    });
  };

  // Historical correlation stats
  const D: Record<string, number> = {};
  trades.filter(isU).forEach((t) => {
    const c = calc(t);
    if (c.open || !t.ds) return;
    D[t.ds] = (D[t.ds] || 0) + c.net;
  });

  const G: { 1: number[]; 0: number[] } = { 1: [], 0: [] };
  Object.keys(D).forEach((d) => {
    if (phist[d]) {
      G[phist[d].ok ? 1 : 0].push(D[d]);
    }
  });

  const todayStr = ymd(new Date());
  let streak = 0;
  for (const d of Object.keys(phist).sort().reverse()) {
    if (phist[d].ok) streak++;
    else if (d !== todayStr) break;
  }

  return (
    <div id="vProto" className="pgrid">
      <div className="gate-note">
        <b>Passo obrigatório de hoje.</b> Conclua o protocolo abaixo para liberar o app. Até lá, as outras abas e as informações ficam bloqueadas.
      </div>

      <div className="card">
        <div className="thead">
          <h3>Protocolo diário</h3>
          <button className="ghost" style={{ width: 'auto', padding: '8px 14px' }} onClick={handleReset}>
            Reiniciar o dia
          </button>
        </div>

        <div className="pbar">
          <i style={{ width: `${(completedCount / totalCount) * 100}%` }} />
        </div>

        <div className="pst">
          {proto.e === 'stop' ? (
            <span className="neg">Hoje sem operar. Ficar fora também é uma decisão válida.</span>
          ) : isAllDone ? (
            <span className="cy">Protocolo completo. Bom trading.</span>
          ) : (
            `${completedCount} de ${totalCount} etapas concluídas`
          )}
        </div>

        <div id="pList">
          {PROTO_STEPS.map((s, k) => {
            const on = isStepDone(s);
            const bad = s.final && proto.e === 'stop';

            return (
              <div key={s.id} className={`pi ${on ? 'on' : ''}`}>
                <button
                  className={`pn ${bad ? 'bad' : ''}`}
                  aria-label={s.t}
                  onClick={() => !s.final && toggleStep(s.id)}
                >
                  {bad ? '✕' : on ? '✓' : k + 1}
                </button>
                <div className="pb">
                  <b onClick={() => !s.final && toggleStep(s.id)}>{s.t}</b>
                  <small>{s.d}</small>

                  {/* Subitems */}
                  {s.subs && (
                    <div className="ps">
                      {s.subs.map((sub, j) => (
                        <button
                          key={j}
                          type="button"
                          className={proto.c[`${s.id}.${j}`] ? 'on' : ''}
                          onClick={() => toggleStep(`${s.id}.${j}`)}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Goals */}
                  {s.goals && (
                    <div className="r2" style={{ marginTop: 12 }}>
                      <div>
                        <label>Meta de ganho do dia (US$)</label>
                        <input
                          inputMode="decimal"
                          value={proto.g}
                          onChange={(e) => setProto({ ...proto, g: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Perda máxima do dia (US$)</label>
                        <input
                          inputMode="decimal"
                          value={proto.l}
                          onChange={(e) => setProto({ ...proto, l: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Final Question */}
                  {s.final && (
                    <div className="seg" style={{ marginTop: 12 }}>
                      <button
                        className={proto.e === 'go' ? 'on' : ''}
                        onClick={() => handleDecision('go')}
                      >
                        Sim, estou pronto
                      </button>
                      <button
                        className={proto.e === 'stop' ? 'on' : ''}
                        onClick={() => handleDecision('stop')}
                      >
                        Hesito, hoje não opero
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {proto.e === 'stop' && (
            <div className="pi pd">
              <div className="pn">10</div>
              <div className="pb">
                <b>DISCLAIMER</b>
                <small>Se estiver afobado, opere na Phantom.</small>
                <button className="pgo" onClick={onOverrideGated}>
                  Decidi operar mesmo assim
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Protocol x Results Card */}
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Protocolo × resultado</h3>
        <div
          className="sumrow"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}
        >
          <div>
            <small>Protocolo completo</small>
            <b className={G[1].length && sm(G[1]) > 0 ? 'pos' : G[1].length && sm(G[1]) < 0 ? 'neg' : ''}>
              {G[1].length ? sg(sm(G[1]) / G[1].length) : '-'}
            </b>
            <small>
              {G[1].length} {pl(G[1].length, 'dia', 'dias')} com trades
              {G[1].length ? `, ${G[1].filter((x) => x > 0).length} no positivo` : ''}
            </small>
          </div>
          <div>
            <small>Protocolo incompleto</small>
            <b className={G[0].length && sm(G[0]) > 0 ? 'pos' : G[0].length && sm(G[0]) < 0 ? 'neg' : ''}>
              {G[0].length ? sg(sm(G[0]) / G[0].length) : '-'}
            </b>
            <small>
              {G[0].length} {pl(G[0].length, 'dia', 'dias')} com trades
              {G[0].length ? `, ${G[0].filter((x) => x > 0).length} no positivo` : ''}
            </small>
          </div>
          <div>
            <small>Sequência atual</small>
            <b>{streak}</b>
            <small>{pl(streak, 'dia completo seguido', 'dias completos seguidos')}</small>
          </div>
        </div>
        <p className="note" style={{ margin: '10px 0 0' }}>
          {G[0].length + G[1].length < 5
            ? 'Ainda são poucos dias com protocolo registrado e trades fechados. A comparação ganha sentido depois de algumas semanas.'
            : 'Média de resultado por dia com trades fechados (pela data de saída), separada pelo protocolo daquele dia.'}
        </p>
      </div>

      <p className="note" style={{ margin: 0 }}>
        Baseado na rotina diária do ebook Masterclass de Trading. O checklist reinicia sozinho a cada novo dia e fica salvo neste navegador.
      </p>
    </div>
  );
};
