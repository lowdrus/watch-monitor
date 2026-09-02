import { NextResponse } from "next/server";

export const revalidate = 900;

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY não configurada." }, { status: 503 });
  }

  const url = new URL("https://api.themoviedb.org/3/trending/all/week");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pt-BR");

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao consultar o TMDB." }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
