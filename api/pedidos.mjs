// Vercel: reaproveita a mesma função usada na Netlify.
import handler from "../netlify/functions/pedidos.mjs";
export const POST = (req) => handler(req);
export const GET = (req) => handler(req);
export const OPTIONS = (req) => handler(req);
