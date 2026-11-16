/* UMADBAP — versão alternativa: submenu "Congresso", abas da página de edição e o vídeo da página inicial. */
(function () {
  "use strict";

  /* ---------- submenu (clique no celular e no teclado; no computador também abre ao passar o mouse) ---------- */
  document.querySelectorAll(".menu-sub").forEach(function (sub) {
    var botao = sub.querySelector(".menu-sub-botao");
    botao.addEventListener("click", function (e) {
      e.stopPropagation();
      var abrir = !sub.classList.contains("aberto");
      sub.classList.toggle("aberto", abrir);
      botao.setAttribute("aria-expanded", String(abrir));
    });
  });
  function fecharSubs() {
    document.querySelectorAll(".menu-sub.aberto").forEach(function (s) {
      s.classList.remove("aberto");
      s.querySelector(".menu-sub-botao").setAttribute("aria-expanded", "false");
    });
  }
  document.addEventListener("click", function (e) { if (!e.target.closest(".menu-sub")) fecharSubs(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharSubs(); });

  /* ---------- abas: marca a seção que está na tela ---------- */
  var abas = document.querySelectorAll(".abas a[href^='#']");
  if (abas.length && "IntersectionObserver" in window) {
    var porId = {};
    abas.forEach(function (a) { porId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        abas.forEach(function (a) { a.classList.remove("ativa"); });
        var a = porId[e.target.id];
        if (a) { a.classList.add("ativa"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(porId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- vídeo da página inicial: começa mudo quando aparece; botão liga o som ---------- */
  var video = document.getElementById("video-alt");
  if (video) {
    var leve = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    var reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var som = document.getElementById("som-alt");
    var carregado = false;
    function carregar() {
      if (carregado) return;
      carregado = true;
      video.src = leve ? video.getAttribute("data-src-leve") : video.getAttribute("data-src");
    }
    function tocar() { carregar(); var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!reduzido || !video.muted) tocar(); }
        else if (video.muted) video.pause();
      }, { threshold: 0.25 }).observe(video);
    } else if (!reduzido) { tocar(); }
    if (som) som.addEventListener("click", function () {
      video.muted = !video.muted;
      if (!video.muted) tocar();
      som.setAttribute("aria-pressed", String(!video.muted));
      som.querySelector("span").textContent = video.muted ? "Ativar som" : "Silenciar";
    });
  }
})();
