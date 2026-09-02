"use client";

import { FormEvent, useEffect, useState } from "react";

type Title = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

export default function Home() {
  const [items, setItems] = useState<Title[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Carregando destaques...");

  async function load(path: string) {
    setStatus("Carregando...");
    const response = await fetch(path);
    const data = await response.json();
    if (!response.ok) {
      setItems([]);
      setStatus(data.error ?? "Não foi possível consultar o TMDB.");
      return;
    }
    setItems(data.results ?? []);
    setStatus("");
  }

  useEffect(() => {
    void load("/api/tmdb/trending");
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) void load(`/api/tmdb/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <main>
      <header>
        <span className="eyebrow">CINETWITCH</span>
        <h1>Watch Monitor</h1>
        <p>Filmes e séries em destaque, com dados atualizados pelo TMDB.</p>
        <form onSubmit={search}>
          <input
            aria-label="Buscar filmes e séries"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque um filme ou uma série..."
            value={query}
          />
          <button type="submit">Buscar</button>
        </form>
      </header>

      {status && <p className="status">{status}</p>}
      <section aria-live="polite">
        {items.map((item) => (
          <article key={item.id}>
            {item.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={item.title ?? item.name ?? "Pôster"}
                loading="lazy"
                src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              />
            ) : <div className="placeholder">Sem pôster</div>}
            <div className="cardBody">
              <h2>{item.title ?? item.name}</h2>
              <small>★ {item.vote_average?.toFixed(1) ?? "—"}</small>
              <p>{item.overview || "Descrição ainda não disponível."}</p>
            </div>
          </article>
        ))}
      </section>
      <footer>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</footer>
    </main>
  );
}
