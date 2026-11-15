/* UMADBAP — patrocínio: o "Fale conosco" monta a mensagem e abre o WhatsApp do contato. */
(function () {
  "use strict";
  var U = window.Umadbap, C = window.UMADBAP || {};
  var contato = C.contato || {};
  document.querySelectorAll("[data-contato-nome]").forEach(function (el) { if (contato.nome) el.textContent = contato.nome; });
  document.querySelectorAll("[data-contato-tel]").forEach(function (el) { if (contato.telefone) el.textContent = contato.telefone; });

  var form = document.getElementById("form-contato");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    U.limparErros(form);
    var f = form.elements;
    var nome = U.limparTexto(f.nome.value);
    if (nome.length < 3) { U.erroCampo(f.nome, "Escreva seu nome."); U.irParaPrimeiroErro(form); return; }
    var empresa = U.limparTexto(f.empresa.value);
    var texto = "Olá, " + (contato.nome || "equipe da UMADBAP") + "! Meu nome é " + nome +
      (empresa ? " (" + empresa + ")" : "") + " e vim pelo site da UMADBAP. Tenho interesse em apoiar o congresso — forma de apoio: " + f.forma.value + ".";
    var msg = U.limparTexto(f.mensagem.value);
    if (msg) texto += "\n\n" + msg;
    window.open(U.linkWhats(texto), "_blank", "noopener");
  });
})();
