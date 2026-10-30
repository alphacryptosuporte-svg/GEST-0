import React, { useState } from 'react';
import { Trade } from '../types';
import { calc, legsOf, legStats, mny, num, ymd } from '../utils/calculations';

interface CloseTradeModalProps {
  trade: Trade | null;
  onClose: () => void;
  onSave: (updatedTrade: Trade) => void;
}

export const CloseTradeModal: React.FC<CloseTradeModalProps> = ({ trade, onClose, onSave }) => {
  if (!trade) return null;
  const c = calc(trade);
  const now = new Date();

  const [exitPrice, setExitPrice] = useState('');
  const [notionalClose, setNotionalClose] = useState('');
  const [date, setDate] = useState(ymd(now));
  const [time, setTime] = useState(now.toTimeString().slice(0, 8));
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirm = () => {
    const p = num(exitPrice);
    const m = num(notionalClose) || 0;
    if (!(p > 0)) {
      setErrorMsg('Informe o preço de saída.');
      return;
    }
    if (!date) {
      setErrorMsg('Informe a data.');
      return;
    }
    if (m > c.rem + 0.005) {
      setErrorMsg('O notional passa do que ainda está aberto.');
      return;
    }

    const L = legsOf(trade);
    const newExs = L.X.concat([{ p, n: m }]);
    const S = legStats(L.E, newExs, trade.type);

    const updated: Trade = {
      ...trade,
      ent: L.E,
      exs: newExs,
      exit: !S.open && S.cN > 0 ? S.avgExit : 0,
      ds: !S.open ? date : trade.ds,
      hs: !S.open ? time : trade.hs,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,.72)',
        display: 'grid',
        placeItems: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card tf" style={{ maxWidth: 380, width: '90%', background: '#0b0b0b' }}>
        <h3>
          Fechar {trade.sym} {trade.type}
        </h3>
        <label>Preço de saída</label>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value)}
          placeholder="Ex: 68500"
          autoFocus
        />

        <label style={{ marginTop: 10 }}>
          Notional a fechar (vazio = tudo, restam {mny(trade.cart, c.rem)})
        </label>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={notionalClose}
          onChange={(e) => setNotionalClose(e.target.value)}
          placeholder="Ex: 500"
        />

        <div className="r2" style={{ marginTop: 10 }}>
          <div>
            <label>Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>Hora</label>
            <input type="time" step="1" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {errorMsg && <div className="tmsg">{errorMsg}</div>}

        <button className="go" style={{ marginTop: 12 }} onClick={handleConfirm}>
          Fechar trade
        </button>
        <button className="ghost" style={{ marginTop: 8 }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};
