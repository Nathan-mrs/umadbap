// UMADBAP — POST /api/pedidos
// Recebe um pedido de camisas (individual ou caravana), valida e grava no banco numa única transação.
import { bancoConfigurado, rpc, json, ErroBanco } from "./_lib/db.mjs";
import { validarPedido, lerCorpo, codigoFalso } from "./_lib/validar.mjs";

// mesmos ids de modelo de publico/js/config.js (camisas.modelos)
const MODELOS = ["oficial"];

export default async (req) => {
  const entrada = await lerCorpo(req);
  if (entrada.parar) return json(...entrada.parar);
  if (entrada.robo) return json(201, { codigo: codigoFalso("CAM") });

  const r = validarPedido(entrada.corpo, MODELOS);
  if (!r.ok) return json(422, { mensagem: r.mensagem });

  if (!bancoConfigurado()) return json(503, { erro: "sem_banco" });

  try {
    const res = await rpc("criar_pedido", { dados: r.valor, chave: entrada.chave });
    return json(201, { codigo: res.codigo });
  } catch (e) {
    if (e instanceof ErroBanco && e.message === "vendas_encerradas") {
      return json(422, { mensagem: "As vendas de camisas estão encerradas." });
    }
    console.error("pedidos:", e.status, e.message, e.detalhe ?? "");
    return json(502, { mensagem: "Não conseguimos registrar agora. Tente de novo em instantes." });
  }
};

export const config = {
  path: "/api/pedidos",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] }
};
