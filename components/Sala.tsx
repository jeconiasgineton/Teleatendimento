"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Credencial = { token: string; url: string };

export default function Sala({ sala }: { sala: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cred, setCred] = useState<Credencial | null>(null);

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
      setCred(dados);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
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
          onDisconnected={() => router.push("/")}
          onError={(e) => setErro(e.message)}
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
