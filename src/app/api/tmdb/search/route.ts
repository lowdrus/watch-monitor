import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY não configurada." }, { status: 503 });
  }
  if (!query) {
    return NextResponse.json({ error: "Informe um termo para buscar." }, { status: 400 });
  }

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("query", query);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao consultar o TMDB." }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
