/* UMADBAP — o que todas as páginas usam: menu do celular, topo, máscaras e ajudas. */
(function () {
  "use strict";
  var C = window.UMADBAP || {};

  /* ---------- menu do celular ---------- */
  var botao = document.querySelector(".menu-botao");
  var nav = document.getElementById("menu");
  if (botao && nav) {
    var fechar = function () {
      botao.setAttribute("aria-expanded", "false");
      botao.setAttribute("aria-label", "Abrir menu");
      document.documentElement.classList.remove("menu-aberto");
    };
    botao.addEventListener("click", function () {
      var abrir = botao.getAttribute("aria-expanded") !== "true";
      botao.setAttribute("aria-expanded", String(abrir));
      botao.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
      document.documentElement.classList.toggle("menu-aberto", abrir);
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) fechar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });
    var mq = matchMedia("(min-width: 761px)");
    if (mq.addEventListener) mq.addEventListener("change", fechar);
  }

  /* ---------- topo ganha fundo ao rolar (páginas internas) ---------- */
  var topo = document.querySelector(".topo");
  if (topo && document.body.classList.contains("pagina")) {
    var marcar = function () { topo.classList.toggle("com-fundo", window.scrollY > 8); };
    marcar();
    window.addEventListener("scroll", marcar, { passive: true });
  }

  /* ---------- "a confirmar" para tudo que ainda não tem valor ---------- */
  function real(v) { return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  var cg = C.congresso || {}, ins = C.inscricao || {}, cam = C.camisas || {};
  var info = {
    "congresso-edicao": cg.edicao,
    "congresso-data": cg.data,
    "congresso-local": cg.local,
    "inscricao-valor": ins.valor != null ? real(ins.valor) : null,
    "inscricao-prazo": ins.prazo,
    "camisa-valor": cam.valor != null ? real(cam.valor) : null
  };
  document.querySelectorAll("[data-info]").forEach(function (el) {
    var v = info[el.getAttribute("data-info")];
    el.textContent = v || "a confirmar";
    if (!v) el.classList.add("a-confirmar");
  });

  /* ---------- WhatsApp da equipe (some se não houver número) ---------- */
  document.querySelectorAll("[data-whatsapp]").forEach(function (el) {
    if (!C.whatsapp) { el.hidden = true; return; }
    el.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(el.getAttribute("data-whatsapp") || "Olá! Vim pelo site da UMADBAP.");
  });

  /* ---------- máscara de telefone: (98) 99999-9999 ---------- */
  function mascararTelefone(v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }
  document.addEventListener("input", function (e) {
    if (e.target.matches && e.target.matches("input[data-telefone]")) e.target.value = mascararTelefone(e.target.value);
  });

  /* ---------- ajudas para os formulários ---------- */
  function limparTexto(v) { return String(v || "").replace(/\s+/g, " ").trim(); }

  // marca o campo com erro e mostra a mensagem logo abaixo dele
  function erroCampo(campo, msg) {
    var caixa = campo.closest(".campo") || campo.parentElement;
    caixa.classList.add("com-erro");
    var aviso = caixa.querySelector(".campo-erro");
    if (!aviso) { aviso = document.createElement("p"); aviso.className = "campo-erro"; caixa.appendChild(aviso); }
    aviso.textContent = msg;
    if (campo.setAttribute) campo.setAttribute("aria-invalid", "true");
  }
  function limparErros(form) {
    form.querySelectorAll(".com-erro").forEach(function (c) { c.classList.remove("com-erro"); });
    form.querySelectorAll(".campo-erro").forEach(function (a) { a.remove(); });
    form.querySelectorAll("[aria-invalid]").forEach(function (c) { c.removeAttribute("aria-invalid"); });
  }
  function irParaPrimeiroErro(form) {
    var c = form.querySelector(".com-erro");
    if (!c) return;
    c.scrollIntoView({ behavior: "smooth", block: "center" });
    var f = c.querySelector("input:not([type=hidden]), select, textarea, button");
    if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 350);
  }

  // escolha segmentada (Individual / Caravana etc.) feita com rádios
  function aoEscolher(nome, fn) {
    var radios = document.querySelectorAll('input[name="' + nome + '"]');
    radios.forEach(function (r) {
      r.addEventListener("change", function () { if (r.checked) fn(r.value); });
    });
    radios.forEach(function (r) { if (r.checked) fn(r.value); });
  }

  /* ---------- link de WhatsApp com mensagem montada ---------- */
  function linkWhats(texto) {
    return "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(texto);
  }

  /* ---------- bolha de ajuda: FAQ + mensagem pronta para o WhatsApp ---------- */
  (function bolha() {
    if (!C.whatsapp) return;
    var nomeContato = (C.contato && C.contato.nome) || "equipe";
    var saudacao = "Olá, " + nomeContato + "! Vim pelo site da UMADBAP";
    var ig = '<a href="' + (C.instagram || "#") + '" target="_blank" rel="noopener">@umadbap</a>';
    var inscAberta = !(C.inscricao && C.inscricao.aberta === false);
    var camAberta = !(C.camisas && C.camisas.aberta === false);
    var perguntas = [
      ["Como faço minha inscrição?", inscAberta
        ? 'Na página <a href="inscricao.html">Inscrição</a>. Dá para se inscrever sozinho ou inscrever a caravana da igreja de uma vez. No fim você recebe um código.'
        : "As inscrições e pré-inscrições ainda não estão disponíveis. Fique atento ao Instagram " + ig + ": é por lá que vamos avisar quando abrirem."],
      ["Como compro a camisa do congresso?", camAberta
        ? 'Na página <a href="camisas.html">Camisas</a>: escolha modelagem, tamanho e quantidade. Para caravana, informe quantas de cada tamanho.'
        : "A venda de camisas ainda não está disponível. Fique atento ao Instagram " + ig + " para saber quando abrir."],
      ["Como pago a inscrição ou a camisa?", "Depois do envio, a equipe fala com você pelo WhatsApp para combinar o pagamento. Guarde o seu código."],
      ["Onde vejo as fotos do congresso?", 'Na página <a href="fotos.html">Fotos</a>, separadas por dia e culto, direto no Google Drive.'],
      ["Quando é o próximo congresso?", 'A data e o local serão divulgados em breve. Acompanhe pelo Instagram <a href="' + (C.instagram || "#") + '" target="_blank" rel="noopener">@umadbap</a>.'],
      ["Quero patrocinar o evento. Como faço?", 'Veja a página <a href="patrocinio.html">Patrocínio</a> ou mande uma mensagem aqui embaixo escolhendo "Patrocínio".']
    ];
    var assuntos = ["Inscrição", "Camisas", "Patrocínio", "Outro assunto"];
    var raiz = document.createElement("div");
    raiz.className = "ajuda";
    raiz.innerHTML =
      '<div class="ajuda-painel" id="ajuda-painel" role="dialog" aria-label="Ajuda e contato" hidden>' +
        '<div class="ajuda-topo"><img src="assets/logo-umadbap.jpg" alt="" width="44" height="44">' +
          '<div><strong>Fale com a UMADBAP</strong><small>Respondemos pelo WhatsApp</small></div></div>' +
        '<div class="ajuda-corpo">' +
          '<p class="ajuda-titulo">Perguntas frequentes</p>' +
          perguntas.map(function (q) { return "<details><summary>" + q[0] + "</summary><p>" + q[1] + "</p></details>"; }).join("") +
          '<p class="ajuda-titulo">Mandar mensagem</p>' +
          '<div class="ajuda-assuntos" role="radiogroup" aria-label="Assunto">' +
            assuntos.map(function (a, i) { return '<input type="radio" name="ajuda-assunto" id="ajuda-a' + i + '" value="' + a + '"' + (i ? "" : " checked") + '><label for="ajuda-a' + i + '">' + a + "</label>"; }).join("") +
          "</div>" +
          '<textarea id="ajuda-msg" maxlength="600" placeholder="Escreva sua dúvida (opcional)" aria-label="Sua mensagem"></textarea>' +
          '<a class="botao botao-whats" id="ajuda-enviar" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>' +
            "Enviar no WhatsApp</a>" +
          '<small class="ajuda-quem">' + nomeContato + (C.contato && C.contato.telefone ? " · " + C.contato.telefone : "") + "</small>" +
        "</div>" +
      "</div>" +
      '<button class="ajuda-bolha" type="button" aria-expanded="false" aria-controls="ajuda-painel" aria-label="Ajuda e contato">' +
        '<svg class="balao" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4.3 21l4-1.9c1.2.4 2.4.6 3.7.6 5.5 0 10-3.8 10-8.5S17.5 3 12 3zm-4 9.7a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/></svg>' +
        '<svg class="fechar-x" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>' +
      "</button>";
    document.body.appendChild(raiz);

    var painel = raiz.querySelector(".ajuda-painel");
    var bolhaBtn = raiz.querySelector(".ajuda-bolha");
    var msg = raiz.querySelector("#ajuda-msg");
    var enviar = raiz.querySelector("#ajuda-enviar");

    function montar() {
      var assunto = raiz.querySelector('input[name="ajuda-assunto"]:checked').value;
      var t = saudacao + (assunto === "Outro assunto" ? "." : " e quero falar sobre " + assunto.toLowerCase() + ".");
      var extra = limparTexto(msg.value);
      if (extra) t += "\n\n" + extra;
      enviar.href = linkWhats(t);
    }
    raiz.addEventListener("change", montar);
    msg.addEventListener("input", montar);
    montar();

    function abrir(sim) {
      painel.hidden = !sim;
      raiz.classList.toggle("aberta", sim);
      bolhaBtn.setAttribute("aria-expanded", String(sim));
      if (sim) { raiz.classList.add("visto"); try { sessionStorage.setItem("umadbap-ajuda", "1"); } catch (e) { /* sem armazenamento */ } }
    }
    try { if (sessionStorage.getItem("umadbap-ajuda")) raiz.classList.add("visto"); } catch (e) { /* sem armazenamento */ }
    bolhaBtn.addEventListener("click", function () { abrir(painel.hidden); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !painel.hidden) { abrir(false); bolhaBtn.focus(); } });
    document.addEventListener("click", function (e) { if (!painel.hidden && !raiz.contains(e.target)) abrir(false); });

    // no celular, sobe a bolha enquanto a barra "Enviar" dos formulários está presa embaixo
    var barra = document.querySelector(".enviar-barra.presa");
    if (barra && "IntersectionObserver" in window) {
      var mq = matchMedia("(max-width: 760px)");
      new IntersectionObserver(function (ent) {
        raiz.classList.toggle("alta", mq.matches && ent[0].isIntersecting);
      }).observe(barra.closest("form"));
    }
  })();

  function telefoneValido(v) { var d = String(v).replace(/\D/g, ""); return d.length === 10 || d.length === 11; }

  window.Umadbap = {
    limparTexto: limparTexto, erroCampo: erroCampo, limparErros: limparErros,
    irParaPrimeiroErro: irParaPrimeiroErro, aoEscolher: aoEscolher,
    telefoneValido: telefoneValido, linkWhats: linkWhats, abertoEm: Date.now()
  };
})();
