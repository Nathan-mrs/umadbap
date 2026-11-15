/* UMADBAP — envio de inscrições e pedidos.
 * Tenta a API (/api/...). Se o banco ainda não estiver ligado (API ausente ou
 * respondendo "sem_banco"), entra em MODO DEMONSTRAÇÃO: guarda só neste aparelho
 * e avisa a pessoa. Com o banco ligado, nada aqui precisa mudar.
 */
(function () {
  "use strict";
  var BASE = (window.UMADBAP && UMADBAP.api && UMADBAP.api.base) || "/api";

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 3) | 8).toString(16);
    });
  }

  function codigoLocal(prefixo) {
    var abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 6; i++) s += abc[(Math.random() * abc.length) | 0];
    return prefixo + "-" + s;
  }

  function guardarDemo(tipo, dados, chave) {
    var codigo = codigoLocal(tipo === "inscricoes" ? "INS" : "CAM");
    try {
      var lista = JSON.parse(localStorage.getItem("umadbap-demo-" + tipo) || "[]");
      lista.push({ codigo: codigo, chave: chave, dados: dados, em: new Date().toISOString() });
      localStorage.setItem("umadbap-demo-" + tipo, JSON.stringify(lista));
    } catch (e) { /* aparelho sem armazenamento: segue só com a confirmação */ }
    return { ok: true, demo: true, codigo: codigo };
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* tipo: "inscricoes" | "pedidos". A chave evita registro duplicado se a pessoa
     tocar duas vezes ou a internet cair no meio do envio. */
  async function enviar(tipo, dados, chave) {
    chave = chave || uuid();
    var ultimoErro = null;
    for (var i = 0; i < 3; i++) {
      try {
        var resp = await fetch(BASE + "/" + tipo, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": chave },
          body: JSON.stringify(dados)
        });
        var corpo = {};
        try { corpo = await resp.json(); } catch (e) { /* resposta sem JSON */ }

        if (resp.ok) return { ok: true, demo: false, codigo: corpo.codigo };
        // API ainda não publicada (404/405) ou banco não ligado (503 sem_banco)
        if (resp.status === 404 || resp.status === 405 || corpo.erro === "sem_banco") return guardarDemo(tipo, dados, chave);
        // dados recusados pelo servidor: mostrar o motivo, não repetir
        if (resp.status === 400 || resp.status === 422) return { ok: false, mensagem: corpo.mensagem || "Confira os dados e tente de novo." };
        if (resp.status === 429) return { ok: false, mensagem: "Muitos envios seguidos deste aparelho. Aguarde um minuto e tente de novo." };
        ultimoErro = corpo.mensagem;
      } catch (e) {
        ultimoErro = null; // sem internet ou queda momentânea
      }
      await esperar(800 * Math.pow(2, i)); // 0,8s → 1,6s → 3,2s
    }
    return { ok: false, mensagem: ultimoErro || "Não conseguimos enviar agora. Confira sua internet e toque em enviar de novo — seus dados continuam aqui." };
  }

  window.UmadbapDados = { enviar: enviar, novaChave: uuid };
})();
