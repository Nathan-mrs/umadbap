/* UMADBAP — comportamento sob medida da página.
 * 1) topo ganha fundo depois da abertura
 * 2) PICO: a marca a fogo (lê o progresso da cena #marca)
 * 3) Movimento-assinatura "o sopro": a velocidade da rolagem sopra a brasa e solta fagulhas
 */
(function () {
  "use strict";
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var topo = document.querySelector(".topo");
  var marca = document.getElementById("marca");
  var frente = document.getElementById("queima-frente");
  var canvas = document.getElementById("fagulhas");

  function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }
  function faixa(p, a, b) { return limitar((p - a) / (b - a), 0, 1); }
  function suave(t) { return t * t * (3 - 2 * t); }

  /* ---------- 0. vídeo da abertura, com som (a pessoa pode silenciar) ---------- */
  var leve = document.documentElement.classList.contains("modo-leve");
  var video = document.getElementById("video-abertura");
  // celular em pé: os reels verticais do congresso (nativos 9:16), tocando em sequência;
  // telas deitadas e computador: o vídeo 16:9 em loop
  if (window.innerWidth <= 900 && window.innerHeight > window.innerWidth) {
    var reels = video.dataset.srcLeve.split(","), atual = 0, adiantado = false;
    video.poster = video.dataset.capaLeve;
    video.loop = false;
    video.src = reels[0];
    video.addEventListener("ended", function () {
      atual = (atual + 1) % reels.length;
      adiantado = false;
      video.src = reels[atual];        // mantém o estado de som escolhido pela pessoa
      video.play().catch(function () {});
    });
    // adianta o próximo reel quando o atual já estiver quase no fim
    video.addEventListener("timeupdate", function () {
      if (adiantado || !video.duration || video.duration - video.currentTime >= 6) return;
      adiantado = true;
      var l = document.createElement("link");
      l.rel = "prefetch"; l.as = "video"; l.href = reels[(atual + 1) % reels.length];
      document.head.appendChild(l);
    });
  } else {
    video.src = video.dataset.src;
  }
  video.preload = reduzido ? "none" : "auto";
  var botaoSom = document.getElementById("botao-som");
  var escolheuSilencio = false; // se a pessoa silenciou, nunca religamos sozinhos
  var videoVisivel = true;

  function mostrarSom() {
    var comSom = !video.muted && !video.paused;
    botaoSom.setAttribute("aria-pressed", comSom ? "true" : "false");
    botaoSom.querySelector("span").textContent = comSom ? "Silenciar" : "Ativar som";
    // com a música tocando e o vídeo fora da tela, o botão acompanha a pessoa (canto inferior esquerdo)
    var flutuar = comSom && !videoVisivel;
    if (flutuar && botaoSom.parentNode !== document.body) document.body.appendChild(botaoSom);
    else if (!flutuar && botaoSom.parentNode === document.body) casaDoBotao.insertBefore(botaoSom, vizinhoDoBotao);
    botaoSom.classList.toggle("flutuante", flutuar);
  }
  // lugar original do botão (dentro da cena do vídeo), para devolvê-lo quando o vídeo voltar à tela
  var casaDoBotao = botaoSom.parentNode, vizinhoDoBotao = botaoSom.nextSibling;
  video.addEventListener("play", mostrarSom);
  video.addEventListener("pause", mostrarSom);
  video.addEventListener("volumechange", function () {
    mostrarSom();
    if (video.muted && !videoVisivel) video.pause(); // silenciou longe do vídeo: pausa para poupar bateria
  });
  function ligarSom() {
    video.muted = false;
    return video.play().then(mostrarSom, function () { video.muted = true; mostrarSom(); });
  }

  botaoSom.addEventListener("click", function () {
    if (!video.muted && !video.paused) {
      video.muted = true; escolheuSilencio = true; mostrarSom();
    } else {
      escolheuSilencio = false; ligarSom();
    }
  });

  if (!reduzido) {
    // navegadores só deixam tocar com som depois de um toque/clique; tentamos com som e,
    // se recusarem, tocamos mudo e ligamos o som na primeira interação da pessoa
    video.muted = false;
    video.play().then(mostrarSom, function () {
      video.muted = true;
      video.play().then(mostrarSom, mostrarSom);
      function primeiraInteracao(e) {
        if (botaoSom.contains(e.target)) return; // o botão decide sozinho
        ["pointerdown", "keydown", "touchend"].forEach(function (t) { window.removeEventListener(t, primeiraInteracao, true); });
        if (!escolheuSilencio) ligarSom();
      }
      ["pointerdown", "keydown", "touchend"].forEach(function (t) { window.addEventListener(t, primeiraInteracao, true); });
    });
    // fora da tela: com som, a música continua tocando enquanto a pessoa rola a página;
    // sem som, o vídeo pausa (ninguém está ouvindo) e economiza bateria. Ao voltar, continua.
    new IntersectionObserver(function (es) {
      videoVisivel = es[0].isIntersecting;
      if (videoVisivel) video.play().catch(function () {});
      else if (video.muted) video.pause();
      mostrarSom();
    }, { threshold: 0.15 }).observe(video);
  }
  mostrarSom();

  // aba escondida: vídeo mudo pausa (ninguém vê); com som, a música segue em segundo plano
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (video.muted) video.pause();
    } else if (video.muted && videoVisivel && !reduzido) {
      video.play().catch(function () {});
    }
  });

  /* ---------- 2. a marca a fogo ---------- */
  var estadoMarca = { progresso: 0, frenteX: 0, queimando: false, ativo: false };
  var marcaTopo = 0, marcaAltura = 0, vh = window.innerHeight; // medidas em cache (refeitas só ao redimensionar)
  var marcaPerto = false, entradaPerto = true;

  function atualizarMarca() {
    var rTopo = marcaTopo - window.scrollY;
    var percurso = marcaAltura - vh;
    var p = percurso > 0 ? limitar(-rTopo / percurso, 0, 1) : 1;
    estadoMarca.ativo = rTopo < vh && rTopo + marcaAltura > 0;

    var queima = suave(faixa(p, 0.12, 0.68));          // o ferro atravessa a frase
    // leitura de layout antes das escritas (só no computador, onde há fagulhas, e só enquanto queima)
    var svg = (!leve && queima > 0 && queima < 1) ? marca.querySelector(".marca-svg").getBoundingClientRect() : null;
    var calor = faixa(p, 0.0, 0.12) * (1 - faixa(p, 0.72, 0.9));
    var esfria = faixa(p, 0.68, 0.88);                 // passou o fogo: a brasa esfria e vira marca
    var versiculo = faixa(p, 0.76, 0.9);

    frente.setAttribute("width", (queima * 1100).toFixed(1));
    marca.style.setProperty("--frente", queima.toFixed(4));
    marca.style.setProperty("--calor", calor.toFixed(3));
    marca.style.setProperty("--brilho", (1 - esfria * 0.6).toFixed(3));
    estadoMarca.queima = queima;
    marca.style.setProperty("--versiculo", versiculo.toFixed(3));

    estadoMarca.progresso = p;
    estadoMarca.queimando = queima > 0 && queima < 1 && estadoMarca.ativo;
    // posição da frente do fogo na tela (para as fagulhas nascerem dali)
    if (svg) {
      estadoMarca.frenteX = svg.left + svg.width * (queima * 1060 - 20) / 1000;
      estadoMarca.svg = svg;
    }
  }

  if (reduzido) {
    frente.setAttribute("width", "1100");
    return;
  }

  /* ---------- 1. entrada: a logo na frente voa e pousa no canto do topo ---------- */
  var raiz = document.documentElement;
  var entrada = document.querySelector(".entrada");
  var voo = document.getElementById("logo-voo");
  var alvo = document.querySelector(".topo-marca img");
  var entradaAltura = 0, alvoRet = { left: 0, top: 0, width: 40 };

  // mede uma vez (e de novo ao redimensionar): nada de ler layout a cada quadro de rolagem
  function medirCena() {
    vh = window.innerHeight;
    entradaAltura = entrada.offsetHeight;
    var m = marca.getBoundingClientRect();
    marcaTopo = m.top + window.scrollY; marcaAltura = marca.offsetHeight;
    var a = alvo.getBoundingClientRect();
    alvoRet = { left: a.left, top: a.top, width: a.width };
  }
  medirCena();

  function atualizarEntrada() {
    if (leve) return; // no celular a página abre direto, sem o voo da logo
    var percurso = entradaAltura - vh;
    var p = percurso > 0 ? limitar(window.scrollY / percurso, 0, 1) : 1;
    var t = suave(faixa(p, 0, 0.55));                     // o voo
    var L = window.innerWidth, A = vh;
    var tam = Math.min(L * 0.56, A * 0.46, 320);
    var x0 = (L - tam) / 2, y0 = (A - tam) / 2 - A * 0.02;
    var a = alvoRet;
    var x = x0 + (a.left - x0) * t, y = y0 + (a.top - y0) * t;
    var esc = 1 + (a.width / tam - 1) * t;
    voo.style.width = voo.style.height = tam + "px";
    voo.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + esc.toFixed(4) + ")";
    var pousou = t > 0.995;
    voo.classList.toggle("pousou", pousou);
    raiz.style.setProperty("--logo-pousada", pousou ? "1" : "0");
    raiz.style.setProperty("--halo", (1 - t).toFixed(3));
    raiz.style.setProperty("--topo", faixa(p, 0.3, 0.55).toFixed(3));
    raiz.style.setProperty("--veu", (1 - faixa(p, 0.15, 0.6)).toFixed(3));
    raiz.style.setProperty("--zoom-foto", (1.18 - 0.14 * faixa(p, 0.1, 0.85)).toFixed(4));
    raiz.style.setProperty("--texto-in", suave(faixa(p, 0.5, 0.85)).toFixed(3));
  }
  atualizarEntrada();

  /* ---------- 3. o sopro: fagulhas ---------- */
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var L = 0, A = 0;
  function medir() {
    L = window.innerWidth; A = window.innerHeight;
    if (leve) return; // celular: sem fagulhas, o canvas nem é dimensionado
    canvas.width = L * dpr; canvas.height = A * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  medir();

  var fagulhas = [];
  var MAX = L < 700 ? 110 : 220;
  var ultimoY = window.scrollY, velocidade = 0, rodando = false;

  function soltar(x, y, forca) {
    if (fagulhas.length >= MAX) return;
    fagulhas.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(0.6 + Math.random() * 1.6) * forca,
      vida: 1,
      queda: 0.006 + Math.random() * 0.012,
      r: 0.8 + Math.random() * 1.9,
      fase: Math.random() * 6.28
    });
  }

  function quadro() {
    var y = window.scrollY;
    var dy = Math.abs(y - ultimoY);
    ultimoY = y;
    velocidade = velocidade * 0.86 + dy * 0.14;

    // a rolagem sopra: fagulhas nascem do pé da tela, proporcionais ao sopro
    var n = Math.min(velocidade / 9, 4);
    for (var i = 0; i < n; i++) {
      if (Math.random() < n - i) soltar(Math.random() * L, A + 6, 1 + velocidade / 40);
    }
    // no pico, o ferro em brasa espirra fagulhas da frente do fogo
    if (estadoMarca.queimando && velocidade > 0.4) {
      var s = estadoMarca.svg;
      for (var k = 0; k < 3; k++) soltar(estadoMarca.frenteX + (Math.random() - 0.5) * 30, s.top + Math.random() * s.height, 1.4);
    }

    ctx.clearRect(0, 0, L, A);
    ctx.globalCompositeOperation = "lighter";
    for (var j = fagulhas.length - 1; j >= 0; j--) {
      var f = fagulhas[j];
      f.fase += 0.08;
      f.x += f.vx + Math.sin(f.fase) * 0.35;
      f.y += f.vy;
      f.vy *= 0.995;
      f.vida -= f.queda;
      if (f.vida <= 0 || f.y < -10) { fagulhas.splice(j, 1); continue; }
      var a = f.vida;
      ctx.fillStyle = "rgba(255," + Math.round(120 + 100 * a) + "," + Math.round(40 * a) + "," + (a * 0.85).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.6 + a * 0.6), 0, 6.283);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    if (fagulhas.length || velocidade > 0.05) {
      requestAnimationFrame(quadro);
    } else {
      rodando = false; // dorme até a próxima rolagem
    }
  }

  function acordar() {
    if (leve) return; // fagulhas da rolagem ficam só no computador (poupa bateria no celular)
    if (!rodando) { rodando = true; ultimoY = window.scrollY; requestAnimationFrame(quadro); }
  }

  /* ---------- ciclo ---------- */
  // as cenas só rodam enquanto estão perto da tela; ao sair, um último quadro fixa o estado final
  var agendado = false;
  function aoRolar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(function () {
      agendado = false;
      topo.classList.toggle("com-fundo", window.scrollY > entradaAltura - vh);
      if (entradaPerto) atualizarEntrada();
      if (marcaPerto) atualizarMarca();
    });
    acordar();
  }
  var largRef = window.innerWidth;
  function aoRedimensionar() {
    // no celular a barra do navegador some e volta (muda só a altura): não refaz tudo por isso
    if (window.innerWidth === largRef && Math.abs(window.innerHeight - vh) < 120) return;
    largRef = window.innerWidth;
    medir(); medirCena(); atualizarEntrada(); atualizarMarca();
  }
  window.addEventListener("scroll", aoRolar, { passive: true });
  window.addEventListener("resize", aoRedimensionar, { passive: true });
  window.addEventListener("load", function () { medirCena(); aoRolar(); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      entradaPerto = es[0].isIntersecting;
      atualizarEntrada(); // ao entrar ou sair, assenta o estado certo
    }, { rootMargin: "50% 0px" }).observe(entrada);
    new IntersectionObserver(function (es) {
      marcaPerto = es[0].isIntersecting;
      medirCena();
      atualizarMarca(); // ao entrar ou sair, assenta o estado certo
    }, { rootMargin: "50% 0px" }).observe(marca);
  } else { marcaPerto = true; }
  atualizarMarca();
  aoRolar();
})();
