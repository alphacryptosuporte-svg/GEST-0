import React from 'react';
import { SetupSpec, SystemConfig, SPEC0, EMAS4, INFO } from '../types';
import { usd, pc, num } from '../utils/calculations';

interface SetupsViewProps {
  specs: SetupSpec[];
  setSpecs: React.Dispatch<React.SetStateAction<SetupSpec[]>>;
  bank: number;
  cfg: SystemConfig;
  setCfg: React.Dispatch<React.SetStateAction<SystemConfig>>;
  dlim: number;
  setDlim: (val: number) => void;
  askConfirm: (msg: string) => Promise<boolean>;
}

export const SetupsView: React.FC<SetupsViewProps> = ({
  specs,
  setSpecs,
  bank,
  cfg,
  setCfg,
  dlim,
  setDlim,
  askConfirm,
}) => {
  const handleSpecChange = (idx: number, key: 'lo' | 'hi', valStr: string) => {
    const n = num(valStr);
    if (n > 0 && n <= 100) {
      const updated = [...specs];
      updated[idx][key] = n;
      setSpecs(updated);
    }
  };

  const handleResetSpecs = async () => {
    const ok = await askConfirm(
      'Restaurar os limites padrão (banca de $600: 2%, 1% e 3%)?'
    );
    if (ok) {
      setSpecs(SPEC0.map((x) => ({ ...x })));
    }
  };

  const handleResetCfg = () => {
    setCfg({
      A: { ...cfg.A, limit: 6 },
      B: { ...cfg.B, limit: 8 },
    });
    setDlim(10);
  };

  const getRiskTxt = (s: (typeof INFO)[0]) => {
    const ns = s.risk || [];
    if (!ns.length) return 'Sem limite próprio: vale o do ' + (s.sys || 'sistema') + '.';
    return ns
      .map((nm) => {
        const x = specs.find((y) => y.n === nm);
        if (!x) return '';
        const t =
          x.lo === x.hi
            ? `${pc(x.lo)}% (${usd((bank * x.lo) / 100)})`
            : `até H1 ${pc(x.lo)}% (${usd((bank * x.lo) / 100)}) | acima de H1 ${pc(x.hi)}% (${usd((bank * x.hi) / 100)})`;
        return (ns.length > 1 ? nm + ': ' : '') + t;
      })
      .join(' | ');
  };

  return (
    <div id="vSpec" className="sgrid">
      {/* Risk table by operational */}
      <div className="card">
        <div className="thead" style={{ marginBottom: 12 }}>
          <h3>Risco máximo por operacional</h3>
          <button className="ghost" style={{ width: 'auto', padding: '8px 14px' }} onClick={handleResetSpecs}>
            Restaurar padrão
          </button>
        </div>
        <p className="note" style={{ margin: '0 0 14px' }}>
          Os valores originais foram definidos para uma banca de $600 (12 = 2%, 6 = 1%, 18 = 3%). Aqui eles ficam em % da banca e acompanham o capital atual:{' '}
          <b style={{ color: 'var(--ink)' }}>{usd(bank)}</b>. Edite o % de qualquer linha para ajustar.
        </p>

        <div className="twrap" style={{ maxHeight: 'none' }}>
          <table className="sp">
            <thead>
              <tr>
                <th>Operacional</th>
                <th>T.F até H1</th>
                <th>T.F acima de H1</th>
                <th>Regra</th>
              </tr>
            </thead>
            <tbody>
              {specs.map((x, i) => (
                <tr key={x.n}>
                  <td>
                    <b>{x.n}</b>
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      value={pc(x.lo)}
                      onChange={(e) => handleSpecChange(i, 'lo', e.target.value)}
                      aria-label={`${x.n} até H1`}
                    />{' '}
                    %<small>{usd((bank * x.lo) / 100)}</small>
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      value={pc(x.hi)}
                      onChange={(e) => handleSpecChange(i, 'hi', e.target.value)}
                      aria-label={`${x.n} acima de H1`}
                    />{' '}
                    %<small>{usd((bank * x.hi) / 100)}</small>
                  </td>
                  <td style={{ whiteSpace: 'normal', color: 'var(--ink2)', fontSize: 12.5 }}>{x.r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Setups Specs details */}
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Especificações dos setups</h3>
        <p className="note" style={{ margin: '0 0 14px' }}>
          Resumo do ebook Masterclass de Trading. Toque num setup para ver time frame, entrada, stop, alvo e o risco máximo atual.
        </p>

        {/* 4 EMAs */}
        <details className="sd" open>
          <summary>
            As 4 EMAs
            <small>base de todos os setups</small>
            <span className="tg">Base</span>
          </summary>
          <div className="bd">
            <dl>
              {EMAS4.map((e, idx) => (
                <React.Fragment key={idx}>
                  <dt>{e[0]}</dt>
                  <dd>{e[1]}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p style={{ marginTop: 10 }}>
              Tendência de alta: EMA 7 e 30 acima da EMA 100, que está acima da EMA 197. Invertido: tendência de baixa. Médias cruzadas: não opere.
            </p>
          </div>
        </details>

        {/* Setups list */}
        {INFO.map((x, i) => (
          <details key={i} className="sd">
            <summary>
              {x.n}
              <small>{x.eb}</small>
              <span className="tg">{x.tag}</span>
            </summary>
            <div className="bd">
              {x.desc}
              <dl>
                {x.tf && (
                  <>
                    <dt>Time frame</dt>
                    <dd>{x.tf}</dd>
                  </>
                )}
                {x.ent && (
                  <>
                    <dt>Entrada</dt>
                    <dd>{x.ent}</dd>
                  </>
                )}
                {x.stop && (
                  <>
                    <dt>Stop</dt>
                    <dd>{x.stop}</dd>
                  </>
                )}
                {x.alvo && (
                  <>
                    <dt>Alvo</dt>
                    <dd>{x.alvo}</dd>
                  </>
                )}
                {x.conf && (
                  <>
                    <dt>Confluências</dt>
                    <dd>{x.conf}</dd>
                  </>
                )}
                {x.rule && (
                  <>
                    <dt>Regras extras</dt>
                    <dd>{x.rule}</dd>
                  </>
                )}
                <dt>Risco máximo</dt>
                <dd className="rk">{getRiskTxt(x)}</dd>
              </dl>
            </div>
          </details>
        ))}

        {/* General rules */}
        <details className="sd">
          <summary>
            Regras gerais
            <small>valem para todos os setups</small>
            <span className="tg">Geral</span>
          </summary>
          <div className="bd">
            <ul>
              <li>LSR: proibido shortar com LSR abaixo de 1.</li>
              <li>Linhas de tendência: usar a partir do T.F de 4h, traçando só por pavios ou só por fechamentos, nunca misturando.</li>
              <li>Análise do macro para o micro: comece sempre pelos time frames maiores.</li>
              <li>Se hesitar em entrar, não entre.</li>
              <li>SCALP e VIP não têm setup descrito no ebook.</li>
            </ul>
          </div>
        </details>
      </div>

      {/* Loss ceilings configs */}
      <div className="card tf">
        <h3 style={{ marginBottom: 4 }}>Tetos de perda</h3>
        <p className="note" style={{ margin: '0 0 14px' }}>
          Percentuais da banca usados nos cartões, avisos, resumo e relatórios.
        </p>

        <div className="r2">
          <div>
            <label>Sistema A, por semana (%)</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={pc(cfg.A.limit)}
              onChange={(e) => {
                const n = num(e.target.value);
                if (n > 0 && n <= 100) {
                  setCfg({ ...cfg, A: { ...cfg.A, limit: n } });
                }
              }}
            />
          </div>
          <div>
            <label>Sistema B, por mês (%)</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={pc(cfg.B.limit)}
              onChange={(e) => {
                const n = num(e.target.value);
                if (n > 0 && n <= 100) {
                  setCfg({ ...cfg, B: { ...cfg.B, limit: n } });
                }
              }}
            />
          </div>
        </div>

        <label>Limite de perda do resumo mensal (%)</label>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={pc(dlim)}
          onChange={(e) => {
            const n = num(e.target.value);
            if (n > 0 && n <= 100) setDlim(n);
          }}
        />

        <button className="ghost" style={{ marginTop: 12 }} onClick={handleResetCfg}>
          Restaurar padrão (6%, 8% e 10%)
        </button>
      </div>

      {/* Info card */}
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Como o limite é aplicado</h3>
        <p className="note" style={{ margin: 0, lineHeight: 1.7 }}>
          Ao cadastrar um trade, escolha o setup e o time frame: o app mostra na hora o risco máximo daquele operacional. Se o que resta no teto semanal (Sistema A) ou mensal (Sistema B) for menor, vale o menor valor. Com stop preenchido, o app avisa quando o risco passa do máximo e sugere o notional para cada nível de risco. Setups sem regra própria (MEIO DIA, VIP) usam o limite do sistema.
        </p>
      </div>
    </div>
  );
};
