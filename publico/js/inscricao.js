/* UMADBAP — página de inscrição (individual ou caravana). */
(function () {
  "use strict";
  var U = window.Umadbap, D = window.UmadbapDados, C = window.UMADBAP || {};
  var MAX = (C.inscricao && C.inscricao.maxParticipantesCaravana) || 200;

  var form = document.getElementById("form-inscricao");
  var lista = document.getElementById("participantes");
  var resumo = document.getElementById("resumo-qtd");
  var botao = document.getElementById("enviar");
  var erroGeral = document.getElementById("erro-geral");
  var conf = document.getElementById("confirmacao");
  var tipo = "individual";
  var chave = D.novaChave(); // a mesma chave em todas as tentativas deste envio

  if (C.inscricao && C.inscricao.aberta === false) return; // aviso "ainda não disponível" fica no HTML

  /* ---------- participantes da caravana ---------- */
  function novoParticipante(foco) {
    if (lista.children.length >= MAX) return;
    var n = lista.children.length + 1;
    var li = document.createElement("li");
    li.className = "participante";
    li.innerHTML =
      '<input type="text" maxlength="120" autocomplete="off" placeholder="Nome completo" aria-label="Nome do participante ' + n + '">' +
      '<input type="number" inputmode="numeric" min="1" max="120" placeholder="Idade" aria-label="Idade do participante ' + n + '">' +
      '<button class="remover" type="button" aria-label="Remover participante ' + n + '">×</button>';
    lista.appendChild(li);
    if (foco) li.querySelector("input").focus();
    atualizarResumo();
  }
  lista.addEventListener("click", function (e) {
    var b = e.target.closest(".remover");
    if (!b) return;
    var li = b.closest("li");
    if (lista.children.length > 1) li.remove();
    else li.querySelectorAll("input").forEach(function (i) { i.value = ""; });
    atualizarResumo();
  });
  lista.addEventListener("input", atualizarResumo);
  document.getElementById("add-participante").addEventListener("click", function () { novoParticipante(true); });
  for (var i = 0; i < 3; i++) novoParticipante(false);

  function participantesPreenchidos() {
    return Array.prototype.filter.call(lista.children, function (li) {
      var c = li.querySelectorAll("input");
      return c[0].value.trim() || c[1].value.trim();
    });
  }

  function atualizarResumo() {
    if (tipo === "individual") { resumo.textContent = "1 pessoa"; return; }
    var n = participantesPreenchidos().length;
    resumo.textContent = n + (n === 1 ? " participante" : " participantes");
  }

  /* ---------- individual x caravana ---------- */
  U.aoEscolher("tipo", function (v) {
    tipo = v;
    document.querySelectorAll("[data-bloco]").forEach(function (b) { b.hidden = b.getAttribute("data-bloco") !== v; });
    U.limparErros(form);
    erroGeral.hidden = true;
    atualizarResumo();
  });

  /* ---------- validação ---------- */
  function idadeOk(v) { var n = Number(v); return v !== "" && Number.isInteger(n) && n >= 1 && n <= 120; }
  function nomeOk(v) { return U.limparTexto(v).length >= 3; }

  function coletar() {
    var f = form.elements, ok = true;
    var dados = {
      tipo: tipo,
      cidade: U.limparTexto(f.cidade.value),
      campo: U.limparTexto(f.campo.value),
      consentimento: f.consentimento.checked,
      site: f.site.value, // armadilha para robôs
      t: Date.now() - U.abertoEm
    };

    if (tipo === "individual") {
      if (!nomeOk(f.nome.value)) { U.erroCampo(f.nome, "Escreva seu nome completo."); ok = false; }
      if (!idadeOk(f.idade.value)) { U.erroCampo(f.idade, "Idade válida."); ok = false; }
      if (!U.telefoneValido(f.telefone.value)) { U.erroCampo(f.telefone, "Informe um WhatsApp com DDD."); ok = false; }
      dados.responsavel = { nome: U.limparTexto(f.nome.value), telefone: f.telefone.value.replace(/\D/g, "") };
      dados.participantes = [{ nome: dados.responsavel.nome, idade: Number(f.idade.value) }];
    } else {
      if (!nomeOk(f.responsavel.value)) { U.erroCampo(f.responsavel, "Escreva o nome do responsável."); ok = false; }
      if (!U.telefoneValido(f.responsavel_telefone.value)) { U.erroCampo(f.responsavel_telefone, "Informe um WhatsApp com DDD."); ok = false; }
      var pessoas = [], linhasRuins = false;
      participantesPreenchidos().forEach(function (li) {
        var c = li.querySelectorAll("input");
        var bomNome = nomeOk(c[0].value), boaIdade = idadeOk(c[1].value);
        if (!bomNome) { c[0].setAttribute("aria-invalid", "true"); linhasRuins = true; }
        if (!boaIdade) { c[1].setAttribute("aria-invalid", "true"); linhasRuins = true; }
        pessoas.push({ nome: U.limparTexto(c[0].value), idade: Number(c[1].value) });
      });
      var caixa = document.getElementById("campo-participantes");
      if (!pessoas.length) { U.erroCampo(caixa, "Adicione pelo menos um participante."); ok = false; }
      else if (linhasRuins) { U.erroCampo(caixa, "Confira os nomes e idades marcados em vermelho."); ok = false; }
      dados.caravana = U.limparTexto(f.caravana.value);
      dados.responsavel = { nome: U.limparTexto(f.responsavel.value), telefone: f.responsavel_telefone.value.replace(/\D/g, "") };
      dados.participantes = pessoas;
    }

    if (dados.cidade.length < 2) { U.erroCampo(f.cidade, "Informe a cidade."); ok = false; }
    if (dados.campo.length < 2) { U.erroCampo(f.campo, "Informe o campo ou a igreja."); ok = false; }
    if (!dados.consentimento) { U.erroCampo(f.consentimento, "Marque para podermos guardar a inscrição."); ok = false; }
    return ok ? dados : null;
  }

  /* ---------- envio ---------- */
  var enviando = false;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (enviando) return;
    U.limparErros(form);
    erroGeral.hidden = true;
    var dados = coletar();
    if (!dados) { U.irParaPrimeiroErro(form); return; }

    enviando = true;
    botao.disabled = true;
    botao.innerHTML = '<span class="girando" aria-hidden="true"></span> Enviando…';
    var r = await D.enviar("inscricoes", dados, chave);
    enviando = false;
    botao.disabled = false;
    botao.innerHTML = '<span class="rotulo-botao">Enviar inscrição</span> <span class="botao-seta" aria-hidden="true">→</span>';

    if (!r.ok) { erroGeral.textContent = r.mensagem; erroGeral.hidden = false; return; }

    document.getElementById("conf-codigo").textContent = r.codigo || "—";
    document.getElementById("conf-demo").hidden = !r.demo;
    document.getElementById("conf-texto").textContent = tipo === "caravana"
      ? "Glória a Deus! A caravana com " + dados.participantes.length + (dados.participantes.length === 1 ? " participante" : " participantes") + " foi inscrita. Guarde o código abaixo."
      : "Glória a Deus! Guarde o código abaixo — ele identifica a sua inscrição.";
    form.hidden = true;
    conf.hidden = false;
    conf.scrollIntoView({ behavior: "smooth", block: "start" });
    conf.focus({ preventScroll: true });
  });

  document.getElementById("nova-inscricao").addEventListener("click", function () {
    form.reset();
    lista.innerHTML = "";
    for (var i = 0; i < 3; i++) novoParticipante(false);
    document.getElementById("tipo-individual").checked = true;
    document.getElementById("tipo-individual").dispatchEvent(new Event("change"));
    chave = D.novaChave();
    U.abertoEm = Date.now();
    conf.hidden = true;
    form.hidden = false;
    document.getElementById("formulario").scrollIntoView({ behavior: "smooth" });
  });
})();
