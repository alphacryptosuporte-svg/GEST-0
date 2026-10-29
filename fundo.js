/* Fundo diário: uma foto P&B por dia (troca à meia-noite, horário local).
   Para trocar a ordem, editar a lista. Para adicionar fotos: gerar NOME.webp (4K)
   e NOME-hd.webp (1920) em /fundos e incluir uma linha aqui. */
(() => {
  // [arquivo em /fundos, ponto de foco do recorte em telas estreitas]
  const FOTOS = [
    ['cachoeira', '50% 55%'], ['urso-neve', '40% 60%'], ['pier', '55% 50%'],
    ['corredor', '50% 50%'], ['elefante', '40% 50%'], ['everest', '50% 35%'],
    ['casa-lago', '50% 65%'], ['escada', '50% 50%'], ['ursos', '30% 50%'],
    ['dunas', '50% 50%'], ['eiffel', '50% 40%'], ['lago-fiorde', '50% 55%'],
    ['vaca', '45% 50%'], ['rio', '20% 50%']
  ];

  const antigo = document.getElementById('bgfx');
  if (antigo) antigo.remove();

  const raiz = document.createElement('div');
  raiz.id = 'bgfx';
  raiz.setAttribute('aria-hidden', 'true');
  raiz.innerHTML = '<div class="bgi"></div><div class="bgi"></div><div class="bgs"></div>';
  document.body.prepend(raiz);
  const camadas = raiz.querySelectorAll('.bgi');

  // Celulares e telas até Full HD usam a versão de 1920px (menos dados e memória).
  // Para forçar 4K em todo lugar, troque por: const leve = false;
  const leve = innerWidth <= 820 || Math.max(screen.width, screen.height) * (devicePixelRatio || 1) <= 2000;

  let atual = -1, frente = 0;
  const indiceDoDia = () => {
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) % FOTOS.length;
  };

  function mostrar() {
    const i = indiceDoDia();
    if (i === atual) return;
    atual = i;
    const [nome, foco] = FOTOS[i];
    const url = 'fundos/' + nome + (leve ? '-hd' : '') + '.webp';
    const img = new Image();
    img.src = url;
    (img.decode ? img.decode() : new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; }))
      .then(() => {
        if (atual !== i) return;
        const prox = camadas[1 - frente];
        prox.style.backgroundImage = 'url("' + url + '")';
        prox.style.backgroundPosition = foco;
        prox.classList.add('on');
        camadas[frente].classList.remove('on');
        frente = 1 - frente;
      })
      .catch(() => {});
  }

  function agendarMeiaNoite() {
    const n = new Date();
    const ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5) - n;
    setTimeout(() => { mostrar(); agendarMeiaNoite(); }, ms);
  }

  mostrar();
  agendarMeiaNoite();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) mostrar(); });
})();
