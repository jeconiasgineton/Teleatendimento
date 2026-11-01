"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MOTIVOS: Partial<Record<DisconnectReason, string>> = {
  [DisconnectReason.CLIENT_INITIATED]: "Você saiu da chamada.",
  [DisconnectReason.DUPLICATE_IDENTITY]: "Você entrou em outro lugar com a mesma identidade.",
  [DisconnectReason.SERVER_SHUTDOWN]: "O servidor de vídeo foi reiniciado.",
  [DisconnectReason.PARTICIPANT_REMOVED]: "Você foi removido da sala.",
  [DisconnectReason.ROOM_DELETED]: "A sala foi encerrada.",
  [DisconnectReason.STATE_MISMATCH]: "Falha de sincronização com o servidor.",
  [DisconnectReason.JOIN_FAILURE]:
    "Não foi possível conectar ao servidor de vídeo. Verifique a URL e as chaves do LiveKit na configuração.",
};

type Credencial = { token: string; url: string };

export default function Sala({ sala }: { sala: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cred, setCred] = useState<Credencial | null>(null);
  const [encerrada, setEncerrada] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sala, nome, senha }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErro(dados.erro ?? "Não foi possível entrar.");
        return;
      }
      setEncerrada(false);
      setCred(dados);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function voltar() {
    setCred(null);
    setEncerrada(false);
    setSenha("");
  }

  if (cred && encerrada) {
    return (
      <main className="centro">
        <div className="card">
          <h1>Chamada encerrada</h1>
          <p className="sub">{erro || "A conexão com a sala foi encerrada."}</p>
          <button className="primario" onClick={voltar}>Entrar novamente</button>
          <button className="primario" onClick={() => router.push("/")}>Voltar ao início</button>
        </div>
      </main>
    );
  }

  if (cred) {
    return (
      <div className="sala" data-lk-theme="default">
        <LiveKitRoom
          token={cred.token}
          serverUrl={cred.url}
          connect
          video
          audio
          onDisconnected={(reason) => {
            setErro((m) => m || (reason !== undefined && MOTIVOS[reason]) || "A conexão com a sala foi encerrada.");
            setEncerrada(true);
          }}
          onError={(e) => setErro(`Erro de conexão: ${e.message}`)}
          onMediaDeviceFailure={() =>
            setErro("Não foi possível acessar câmera ou microfone. Verifique as permissões do navegador.")
          }
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <main className="centro">
      <form className="card" onSubmit={entrar}>
        <h1>Entrar na sala</h1>
        <p className="sub">{sala}</p>
        <label htmlFor="nome">Seu nome</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required minLength={2} />
        <label htmlFor="senha">Senha da sala</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off" required />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" type="submit" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
        <p className="dica">O navegador vai pedir permissão para usar câmera e microfone.</p>
      </form>
    </main>
  );
}
