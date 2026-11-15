/* UMADBAP — pedido de camisas (individual ou caravana). */
(function () {
  "use strict";
  var U = window.Umadbap, D = window.UmadbapDados, C = window.UMADBAP || {};
  var CAM = C.camisas || {};
  var TAMANHOS = CAM.tamanhos || ["P", "M", "G", "GG", "XG"];
  var MODELOS = CAM.modelos && CAM.modelos.length ? CAM.modelos : [{ id: "oficial", nome: "Camisa oficial" }];
  var MAX = CAM.maxPorItem || 500;

  var form = document.getElementById("form-camisas");
  var botao = document.getElementById("enviar");
  var erroGeral = document.getElementById("erro-geral");
  var conf = document.getElementById("confirmacao");
  var tipo = "individual", modelo = MODELOS[0];
  var chave = D.novaChave();

  if (CAM.aberta === false) return; // aviso "ainda não disponível" fica no HTML

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- modelos (só aparece a escolha se houver mais de um) ---------- */
  function mostrarModelo(m) {
    modelo = m;
    document.getElementById("nome-modelo").textContent = m.nome;
    if (m.foto) document.getElementById("foto-modelo").src = m.foto;
  }
  if (MODELOS.length > 1) {
    var caixaM = document.getElementById("modelos");
    caixaM.innerHTML = MODELOS.map(function (m, i) {
      return '<input type="radio" name="modelo" id="mod-' + i + '" value="' + i + '"' + (i ? "" : " checked") + '><label for="mod-' + i + '">' + esc(m.nome) + "</label>";
    }).join("");
    document.getElementById("campo-modelo").hidden = false;
    U.aoEscolher("modelo", function (v) { mostrarModelo(MODELOS[Number(v)]); });
  } else mostrarModelo(modelo);

  /* ---------- tamanhos (individual) ---------- */
  document.getElementById("tamanhos").innerHTML = TAMANHOS.map(function (t) {
    return '<input type="radio" name="tamanho" id="tam-' + t + '" value="' + t + '"><label for="tam-' + t + '">' + t + "</label>";
  }).join("");

  /* ---------- grades da caravana: feminina e masculina ---------- */
  function contadorHTML(rotulo) {
    return '<div class="contador" data-contador><button type="button" data-menos aria-label="Diminuir ' + rotulo + '">−</button>' +
      '<input type="number" inputmode="numeric" value="0" min="0" aria-label="' + rotulo + '"><button type="button" data-mais aria-label="Aumentar ' + rotulo + '">+</button></div>';
  }
  document.getElementById("grades").innerHTML = [["feminina", "Femininas"], ["masculina", "Masculinas"]].map(function (g) {
    return '<div class="grade-tamanhos" data-genero="' + g[0] + '"><div class="grade-cabeca"><span>' + g[1] + '</span><span class="soma"><b>0</b> peças</span></div>' +
      TAMANHOS.map(function (t) {
        return '<div class="grade-linha" data-tamanho="' + t + '"><span class="t">' + t + "</span>" + contadorHTML(g[1] + " tamanho " + t) + "</div>";
      }).join("") + "</div>";
  }).join("");

  /* ---------- contadores − n + ---------- */
  function valorDe(input) { var n = parseInt(input.value, 10); return isNaN(n) ? 0 : n; }
  function ajustar(cont, delta) {
    var input = cont.querySelector("input");
    var min = Number(input.min) || 0;
    var n = Math.max(min, Math.min(MAX, valorDe(input) + delta));
    input.value = n;
    atualizar();
  }
  form.addEventListener("click", function (e) {
    var b = e.target.closest("[data-menos], [data-mais]");
    if (!b) return;
    ajustar(b.closest("[data-contador]"), b.hasAttribute("data-mais") ? 1 : -1);
  });
  form.addEventListener("input", function (e) { if (e.target.closest("[data-contador]")) atualizar(); });
  form.addEventListener("change", function (e) {
    var cont = e.target.closest("[data-contador]");
    if (cont) ajustar(cont, 0); // corrige valores digitados fora do limite
  });

  /* ---------- itens e total ---------- */
  function itens() {
    if (tipo === "individual") {
      var t = form.querySelector('input[name="tamanho"]:checked');
      var g = form.querySelector('input[name="genero"]:checked');
      var q = valorDe(document.querySelector("#qtd-individual input"));
      return t && q > 0 ? [{ modelo: modelo.id, genero: g.value, tamanho: t.value, quantidade: q }] : [];
    }
    var lista = [];
    form.querySelectorAll(".grade-tamanhos").forEach(function (grade) {
      grade.querySelectorAll(".grade-linha").forEach(function (linha) {
        var q = valorDe(linha.querySelector("input"));
        if (q > 0) lista.push({ modelo: modelo.id, genero: grade.getAttribute("data-genero"), tamanho: linha.getAttribute("data-tamanho"), quantidade: q });
      });
    });
    return lista;
  }

  function atualizar() {
    form.querySelectorAll(".grade-tamanhos").forEach(function (grade) {
      var soma = 0;
      grade.querySelectorAll(".grade-linha").forEach(function (linha) {
        var q = valorDe(linha.querySelector("input"));
        linha.classList.toggle("tem", q > 0);
        linha.querySelector("[data-menos]").disabled = q <= 0;
        soma += q;
      });
      grade.querySelector(".soma b").textContent = soma;
    });
    var qi = document.querySelector("#qtd-individual input");
    document.querySelector("#qtd-individual [data-menos]").disabled = valorDe(qi) <= 1;

    var total = tipo === "individual" ? valorDe(qi) : itens().reduce(function (s, i) { return s + i.quantidade; }, 0);
    document.getElementById("resumo-total").textContent = total + (total === 1 ? " peça" : " peças");
    var v = document.getElementById("resumo-valor");
    v.textContent = CAM.valor != null && total > 0 ? " · " + (CAM.valor * total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
  }

  U.aoEscolher("tipo", function (v) {
    tipo = v;
    document.querySelectorAll("[data-bloco]").forEach(function (b) { b.hidden = b.getAttribute("data-bloco") !== v; });
    U.limparErros(form);
    erroGeral.hidden = true;
    atualizar();
  });

  /* ---------- validação e envio ---------- */
  function coletar() {
    var f = form.elements, ok = true, lista = itens();
    if (tipo === "individual" && !form.querySelector('input[name="tamanho"]:checked')) {
      U.erroCampo(document.getElementById("campo-tamanho"), "Escolha o tamanho."); ok = false;
    } else if (!lista.length) {
      U.erroCampo(document.getElementById(tipo === "individual" ? "campo-tamanho" : "campo-grades"), "Escolha pelo menos uma camisa."); ok = false;
    }
    if (U.limparTexto(f.nome.value).length < 3) { U.erroCampo(f.nome, "Escreva seu nome completo."); ok = false; }
    if (!U.telefoneValido(f.telefone.value)) { U.erroCampo(f.telefone, "Informe um WhatsApp com DDD."); ok = false; }
    if (U.limparTexto(f.cidade.value).length < 2) { U.erroCampo(f.cidade, "Informe a cidade."); ok = false; }
    if (U.limparTexto(f.campo.value).length < 2) { U.erroCampo(f.campo, "Informe o campo ou a igreja."); ok = false; }
    if (!f.consentimento.checked) { U.erroCampo(f.consentimento, "Marque para podermos guardar o pedido."); ok = false; }
    if (!ok) return null;
    return {
      tipo: tipo,
      comprador: { nome: U.limparTexto(f.nome.value), telefone: f.telefone.value.replace(/\D/g, "") },
      cidade: U.limparTexto(f.cidade.value),
      campo: U.limparTexto(f.campo.value),
      caravana: tipo === "caravana" ? U.limparTexto(f.caravana.value) : "",
      observacao: U.limparTexto(f.observacao.value),
      itens: lista,
      consentimento: true,
      site: f.site.value,
      t: Date.now() - U.abertoEm
    };
  }

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
    var original = botao.innerHTML;
    botao.innerHTML = '<span class="girando" aria-hidden="true"></span> Enviando…';
    var r = await D.enviar("pedidos", dados, chave);
    enviando = false;
    botao.disabled = false;
    botao.innerHTML = original;

    if (!r.ok) { erroGeral.textContent = r.mensagem; erroGeral.hidden = false; return; }

    var total = dados.itens.reduce(function (s, i) { return s + i.quantidade; }, 0);
    document.getElementById("conf-codigo").textContent = r.codigo || "—";
    document.getElementById("conf-demo").hidden = !r.demo;
    document.getElementById("conf-texto").textContent = "Seu pedido de " + total + (total === 1 ? " camisa" : " camisas") + " foi registrado. Guarde o código abaixo.";
    form.hidden = true;
    conf.hidden = false;
    conf.scrollIntoView({ behavior: "smooth", block: "start" });
    conf.focus({ preventScroll: true });
  });

  document.getElementById("novo-pedido").addEventListener("click", function () {
    form.reset();
    form.querySelectorAll(".grade-linha input").forEach(function (i) { i.value = 0; });
    document.getElementById("tipo-individual").checked = true;
    document.getElementById("tipo-individual").dispatchEvent(new Event("change"));
    chave = D.novaChave();
    U.abertoEm = Date.now();
    conf.hidden = true;
    form.hidden = false;
    document.getElementById("formulario").scrollIntoView({ behavior: "smooth" });
  });

  atualizar();
})();
