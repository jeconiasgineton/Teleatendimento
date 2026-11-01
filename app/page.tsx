"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SALA_REGEX, slugify } from "@/lib/sala";

export default function Inicio() {
  const router = useRouter();
  const [sala, setSala] = useState("kickoff");
  const [erro, setErro] = useState("");

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(sala);
    if (!SALA_REGEX.test(slug)) {
      setErro("Use de 3 a 40 letras, números ou hífen.");
      return;
    }
    router.push(`/sala/${slug}`);
  }

  return (
    <main className="centro">
      <form className="card" onSubmit={entrar}>
        <h1>Teleatendimento</h1>
        <p className="sub">Sala de videoconferência</p>
        <label htmlFor="sala">Nome da sala</label>
        <input id="sala" value={sala} onChange={(e) => setSala(e.target.value)} autoComplete="off" />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" type="submit">Continuar</button>
        <p className="dica">Compartilhe o link da sala e a senha por canais separados.</p>
      </form>
    </main>
  );
}
