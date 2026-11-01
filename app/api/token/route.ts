import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import { SALA_REGEX } from "@/lib/sala";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENTATIVAS_MAX = 10;
const JANELA_MS = 10 * 60 * 1000;
const tentativas = new Map<string, { n: number; inicio: number }>();

function limitado(ip: string): boolean {
  const agora = Date.now();
  const r = tentativas.get(ip);
  if (!r || agora - r.inicio > JANELA_MS) {
    tentativas.set(ip, { n: 1, inicio: agora });
    return false;
  }
  r.n += 1;
  return r.n > TENTATIVAS_MAX;
}

function senhaConfere(informada: string, esperada: string): boolean {
  const a = createHash("sha256").update(informada).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}

function resposta(status: number, erro: string) {
  return Response.json({ erro }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, ROOM_PASSWORD } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !ROOM_PASSWORD) {
    return resposta(500, "Servidor sem configuração. Avise o responsável pela plataforma.");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (limitado(ip)) return resposta(429, "Muitas tentativas. Aguarde alguns minutos.");

  let corpo: { sala?: unknown; nome?: unknown; senha?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, "Requisição inválida.");
  }

  const sala = typeof corpo.sala === "string" ? corpo.sala : "";
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 60) : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";

  if (!SALA_REGEX.test(sala)) return resposta(400, "Nome de sala inválido.");
  if (nome.length < 2) return resposta(400, "Informe seu nome.");
  if (!senhaConfere(senha, ROOM_PASSWORD)) return resposta(401, "Senha incorreta.");

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `${nome}-${randomBytes(3).toString("hex")}`,
    name: nome,
    ttl: "2h",
  });
  token.addGrant({
    room: sala,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return Response.json(
    { token: await token.toJwt(), url: LIVEKIT_URL },
    { headers: { "Cache-Control": "no-store" } },
  );
}
