// UMADBAP — conexão com o banco (Supabase/Postgres) pela API REST.
// As chaves ficam só nas variáveis de ambiente da Netlify, nunca no site.
//   SUPABASE_URL            → https://xxxx.supabase.co
//   SUPABASE_SECRET_KEY     → chave secreta (sb_secret_...)  — ou —
//   SUPABASE_SERVICE_ROLE_KEY (chave antiga, formato eyJ...)

function env(nome) {
  try { if (globalThis.Netlify?.env) return Netlify.env.get(nome); } catch { /* fora da Netlify */ }
  return process.env[nome];
}

const URL_BANCO = () => (env("SUPABASE_URL") || "").replace(/\/+$/, "");
const CHAVE = () => env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY") || "";

export function bancoConfigurado() {
  return Boolean(URL_BANCO() && CHAVE());
}

export class ErroBanco extends Error {
  constructor(mensagem, status, detalhe) { super(mensagem); this.status = status; this.detalhe = detalhe; }
}

// Chama uma função SQL (RPC). Cada chamada é uma transação: ou grava tudo, ou nada.
export async function rpc(nome, args) {
  const chave = CHAVE();
  const headers = { apikey: chave, "Content-Type": "application/json", Prefer: "return=representation" };
  if (chave.startsWith("eyJ")) headers.Authorization = `Bearer ${chave}`; // chave antiga (JWT)

  const resp = await fetch(`${URL_BANCO()}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(9000)
  });
  const texto = await resp.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
  if (!resp.ok) throw new ErroBanco(corpo?.message || "erro_banco", resp.status, corpo);
  return corpo;
}

export function json(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
