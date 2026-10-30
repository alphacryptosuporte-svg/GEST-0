import React, { useEffect } from 'react';

interface PhraseModalProps {
  phrase: string | null;
  onClose: () => void;
}

export const PhraseModal: React.FC<PhraseModalProps> = ({ phrase, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (phrase) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('phron');
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('phron');
    };
  }, [phrase, onClose]);

  if (!phrase) return null;

  return (
    <div id="phr" className="show" onClick={onClose}>
      <span>Frase do dia</span>
      <div className="phq">
        <p id="phrTxt">{phrase}</p>
      </div>
    </div>
  );
};
