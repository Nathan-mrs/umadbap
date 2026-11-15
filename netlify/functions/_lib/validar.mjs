// UMADBAP — validação no servidor. O navegador também valida, mas aqui é a palavra final:
// limpa os textos, confere limites e monta só os campos esperados (o resto é descartado).

export const TAMANHOS = ["P", "M", "G", "GG", "XG"];
export const GENEROS = ["masculina", "feminina"];
const MAX_PARTICIPANTES = 200;
const MAX_POR_ITEM = 500;
const MAX_PECAS = 2000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class Recusa extends Error {}
const recusar = (msg) => { throw new Recusa(msg); };

function texto(v, { min = 0, max = 120, nome = "campo" } = {}) {
  const s = String(v ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F<>]/g, "") // sem caracteres de controle nem tags
    .replace(/\s+/g, " ")
    .trim();
  if (s.length < min) recusar(`Preencha ${nome}.`);
  if (s.length > max) recusar(`${nome} está longo demais.`);
  return s;
}
function telefone(v) {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 11) recusar("Informe um WhatsApp válido, com DDD.");
  return d;
}
function inteiro(v, min, max, nome) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) recusar(`Confira ${nome}.`);
  return n;
}

function base(c) {
  if (!c || typeof c !== "object") recusar("Dados inválidos.");
  if (c.consentimento !== true) recusar("É preciso autorizar o uso dos dados.");
  const tipo = c.tipo === "caravana" ? "caravana" : c.tipo === "individual" ? "individual" : recusar("Escolha individual ou caravana.");
  return {
    tipo,
    cidade: texto(c.cidade, { min: 2, max: 80, nome: "a cidade" }),
    campo: texto(c.campo, { min: 2, max: 120, nome: "o campo / igreja" }),
    caravana: tipo === "caravana" ? texto(c.caravana, { max: 120, nome: "o nome da caravana" }) : ""
  };
}

function tentar(fn) {
  try { return { ok: true, valor: fn() }; }
  catch (e) { if (e instanceof Recusa) return { ok: false, mensagem: e.message }; throw e; }
}

export function validarInscricao(c) {
  return tentar(() => {
    const v = base(c);
    const r = c.responsavel || {};
    v.responsavel = { nome: texto(r.nome, { min: 3, nome: "o nome" }), telefone: telefone(r.telefone) };
    const lista = Array.isArray(c.participantes) ? c.participantes : [];
    if (!lista.length) recusar("Adicione pelo menos um participante.");
    if (v.tipo === "individual" && lista.length !== 1) recusar("Inscrição individual é para uma pessoa.");
    if (lista.length > MAX_PARTICIPANTES) recusar(`Uma caravana pode ter até ${MAX_PARTICIPANTES} participantes por inscrição.`);
    v.participantes = lista.map((p, i) => ({
      nome: texto(p?.nome, { min: 3, nome: `o nome do participante ${i + 1}` }),
      idade: inteiro(p?.idade, 1, 120, `a idade do participante ${i + 1}`)
    }));
    return v;
  });
}

export function validarPedido(c, modelosValidos) {
  return tentar(() => {
    const v = base(c);
    const r = c.comprador || {};
    v.comprador = { nome: texto(r.nome, { min: 3, nome: "o nome" }), telefone: telefone(r.telefone) };
    v.observacao = texto(c.observacao, { max: 500, nome: "a observação" });
    const lista = Array.isArray(c.itens) ? c.itens : [];
    if (!lista.length) recusar("Escolha pelo menos uma camisa.");
    if (lista.length > 50) recusar("Pedido com itens demais.");

    // junta itens repetidos (mesmo modelo + modelagem + tamanho)
    const mapa = new Map();
    for (const it of lista) {
      const modelo = texto(it?.modelo, { min: 1, max: 40, nome: "o modelo" });
      if (modelosValidos && !modelosValidos.includes(modelo)) recusar("Modelo de camisa inválido.");
      const genero = GENEROS.includes(it?.genero) ? it.genero : recusar("Escolha masculina ou feminina.");
      const tamanho = TAMANHOS.includes(it?.tamanho) ? it.tamanho : recusar("Tamanho inválido.");
      const quantidade = inteiro(it?.quantidade, 1, MAX_POR_ITEM, "a quantidade");
      const k = `${modelo}|${genero}|${tamanho}`;
      const atual = mapa.get(k);
      if (atual) atual.quantidade += quantidade;
      else mapa.set(k, { modelo, genero, tamanho, quantidade });
    }
    v.itens = [...mapa.values()];
    v.total_pecas = v.itens.reduce((s, i) => s + i.quantidade, 0);
    if (v.total_pecas > MAX_PECAS) recusar(`Para mais de ${MAX_PECAS} peças, fale com a equipe.`);
    if (v.itens.some((i) => i.quantidade > MAX_POR_ITEM)) recusar("Quantidade alta demais em um tamanho.");
    return v;
  });
}

// Filtros comuns a todo envio. Retorna uma Response se o pedido deve parar aqui.
export async function lerCorpo(req) {
  if (req.method !== "POST") return { parar: [405, { mensagem: "Use POST." }] };

  // só aceita envios do próprio site
  const origem = req.headers.get("origin");
  if (origem) {
    try { if (new URL(origem).host !== new URL(req.url).host) return { parar: [403, { mensagem: "Origem não permitida." }] }; }
    catch { return { parar: [403, { mensagem: "Origem não permitida." }] }; }
  }

  const tamanho = Number(req.headers.get("content-length") || 0);
  if (tamanho > 64_000) return { parar: [413, { mensagem: "Envio grande demais." }] };

  let corpo;
  try { corpo = JSON.parse(await req.text()); }
  catch { return { parar: [400, { mensagem: "Dados inválidos." }] }; }

  // armadilha: o campo "site" é invisível para pessoas; robô que preenche recebe um "ok" falso
  if (corpo && typeof corpo.site === "string" && corpo.site.trim() !== "") return { robo: true };
  if (Number(corpo?.t) > 0 && Number(corpo.t) < 1500) return { parar: [422, { mensagem: "Envio rápido demais. Aguarde um instante e envie de novo." }] };

  const chave = req.headers.get("idempotency-key");
  return { corpo, chave: chave && UUID.test(chave) ? chave.toLowerCase() : null };
}

export function codigoFalso(prefixo) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `${prefixo}-${s}`;
}
