// Vercel: reaproveita a mesma função usada na Netlify.
import handler from "../netlify/functions/inscricoes.mjs";
export const POST = (req) => handler(req);
export const GET = (req) => handler(req);
export const OPTIONS = (req) => handler(req);
