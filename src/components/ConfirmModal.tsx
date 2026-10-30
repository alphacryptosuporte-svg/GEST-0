import React from 'react';

interface ConfirmModalProps {
  message: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel }) => {
  if (!message) return null;

  return (
    <div
      id="modal"
      style={{
        display: 'grid',
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,.72)',
        placeItems: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="card" style={{ maxWidth: 380, width: '90%', background: '#0b0b0b' }}>
        <p id="mTxt" style={{ marginBottom: 16, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" id="mNo" onClick={onCancel}>
            Cancelar
          </button>
          <button className="go" id="mYes" style={{ background: 'var(--bad)', color: '#fff' }} onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
