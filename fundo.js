/* Fundo diário: uma imagem por dia (data local). Imagens 4K na pasta fundos/, estilo incluído. */
(function(){
  /* Imagens 4K (3840 px de largura) em /fundos, resolvidas a partir do local deste script */
  var BASE=(document.currentScript&&document.currentScript.src||'').replace(/[^\/]*$/,'');
  var IMAGENS=[]; for(var n=1;n<=14;n++)IMAGENS.push(BASE+'fundos/'+(n<10?'0':'')+n+'.jpg');
  var st=document.createElement('style');st.textContent=".bg{position:fixed;top:0;right:0;bottom:0;left:0;z-index:0;pointer-events:none;background:#000 center/cover no-repeat;opacity:0;transition:opacity 1.2s ease;--scrim:.5}\n.bg.on{opacity:1}\n.bg::after{content:\"\";position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(180deg,rgba(0,0,0,calc(var(--scrim) + .1)) 0%,rgba(0,0,0,var(--scrim)) 45%,rgba(0,0,0,calc(var(--scrim) + .12)) 100%)}\n:root{--card:rgba(8,8,8,.84)}\n.wrap{position:relative;z-index:1}\n.card{border-color:rgba(255,255,255,.14)}\n.tabs button:not(.on){background:rgba(8,8,8,.84)}\nheader h1,header p,.today{text-shadow:0 2px 12px rgba(0,0,0,.7)}";document.head.appendChild(st);
  var el=document.getElementById('bg');
  if(!el){el=document.createElement('div');el.id='bg';el.className='bg';el.setAttribute('aria-hidden','true');document.body.insertBefore(el,document.body.firstChild)}
  var atual=-1;
  function indiceDoDia(){var d=new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5)%IMAGENS.length}
  function pelicula(img){
    var s=.5;
    try{var c=document.createElement('canvas');c.width=c.height=24;var x=c.getContext('2d');x.drawImage(img,0,0,24,24);
      var p=x.getImageData(0,0,24,24).data,t=0;for(var i=0;i<p.length;i+=4)t+=(p[i]*.299+p[i+1]*.587+p[i+2]*.114)/255;
      s=Math.min(.74,Math.max(.42,.36+t/(p.length/4)*.5))}catch(e){}
    el.style.setProperty('--scrim',s.toFixed(2));
  }
  function aplicar(){
    var i=indiceDoDia();if(i===atual)return;atual=i;
    var img=new Image();
    img.onload=function(){if(i!==atual)return;pelicula(img);el.style.backgroundImage='url("'+IMAGENS[i]+'")';el.classList.add('on')};
    img.src=IMAGENS[i];
  }
  aplicar();setInterval(aplicar,60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)aplicar()});
})();
