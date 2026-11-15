/* UMADBAP — página de fotos: monta um cartão por álbum do Drive (lista em config.js). */
(function () {
  "use strict";
  var F = (window.UMADBAP && UMADBAP.fotos) || { albuns: [] };
  var SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
  var LUA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
  var PASTA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#E8541E" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/><path fill="#FFF6EC" d="M8 16l2.6-3.2 1.9 2.3 1.6-1.9L16.5 16z"/></svg>';

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  if (F.titulo) document.getElementById("fotos-titulo").textContent = F.titulo;

  var lista = document.getElementById("albuns");
  if (!F.albuns.length) {
    lista.outerHTML = '<p class="lead">As fotos deste congresso ainda estão sendo organizadas pela equipe de mídia. Volte em breve!</p>';
    return;
  }
  lista.innerHTML = F.albuns.map(function (a) {
    var noite = /noite/i.test(a.periodo);
    var rotulo = a.dia + " · " + a.periodo;
    return '<li><a class="album" href="' + esc(a.url) + '" target="_blank" rel="noopener" aria-label="Abrir fotos do ' + esc(rotulo) + ' no Google Drive">' +
      (a.capa ? '<img src="' + esc(a.capa) + '" alt="" loading="lazy" decoding="async" width="640" height="426">' : "") +
      '<span class="album-periodo">' + (noite ? LUA : SOL) + esc(a.periodo) + "</span>" +
      "<h3>" + esc(a.dia) + "</h3>" +
      '<span class="album-abrir"><span class="drive">' + PASTA + "Ver fotos no Drive</span>" +
      '<span class="seta" aria-hidden="true">→</span></span></a></li>';
  }).join("");
})();
