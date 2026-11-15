// UMADBAP — POST /api/inscricoes
// Recebe uma inscrição (individual ou caravana), valida e grava no banco numa única transação.
import { bancoConfigurado, rpc, json, ErroBanco } from "./_lib/db.mjs";
import { validarInscricao, lerCorpo, codigoFalso } from "./_lib/validar.mjs";

export default async (req) => {
  const entrada = await lerCorpo(req);
  if (entrada.parar) return json(...entrada.parar);
  if (entrada.robo) return json(201, { codigo: codigoFalso("INS") });

  const r = validarInscricao(entrada.corpo);
  if (!r.ok) return json(422, { mensagem: r.mensagem });

  // banco ainda não ligado: o site entra em modo demonstração
  if (!bancoConfigurado()) return json(503, { erro: "sem_banco" });

  try {
    const res = await rpc("criar_inscricao", { dados: r.valor, chave: entrada.chave });
    return json(201, { codigo: res.codigo });
  } catch (e) {
    if (e instanceof ErroBanco && e.message === "inscricoes_encerradas") {
      return json(422, { mensagem: "As inscrições estão encerradas." });
    }
    console.error("inscricoes:", e.status, e.message, e.detalhe ?? "");
    return json(502, { mensagem: "Não conseguimos registrar agora. Tente de novo em instantes." });
  }
};

export const config = {
  path: "/api/inscricoes",
  // até 10 envios por minuto por pessoa (IP): segura robôs sem travar caravanas
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] }
};
