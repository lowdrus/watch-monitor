# Watch Monitor

Painel CINETWITCH para organizar patrocínios de live stream e consultar filmes e séries com dados do TMDB.

## Desenvolvimento local

1. Execute `npm install`.
2. Crie `.env.local` com `TMDB_API_KEY=sua_chave`.
3. Execute `npm run dev`.

A chave é usada somente nas rotas do servidor em `/api/tmdb/*` e nunca é enviada ao navegador.

## CI/CD

- O GitHub Actions executa lint e build em pushes e pull requests.
- A integração Git da Vercel gera preview para pull requests.
- A branch `main` publica automaticamente em produção.
- `TMDB_API_KEY` deve ser configurada na Vercel para Development, Preview e Production.

> Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
