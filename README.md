# Jobs Finder (Jobicy)

Listagem de vagas remotas usando a API pública da Jobicy.

## Rodando
- Abrir `index.html` no navegador **ou** servir a pasta:
  ```bash
  npx serve .
  # ou
  python -m http.server 8000
  ```
- Requer internet para consumir `https://jobicy.com/api/v2/remote-jobs`.

## Funcionalidades
- Busca por texto (título/empresa), filtros por categoria e tipo.
- Ordenação por data ou faixa salarial.
- Paginação progressiva + scroll infinito.
- Modal de detalhes com link para aplicar.
- Favoritos persistidos em `localStorage` e aba dedicada.
- Skeletons, estados de loading/erro/offline e retry.
- Responsivo e com foco visível/ARIA básico.

## Estrutura
- `index.html`: markup principal.
- `css/style.css`: tema e layout (mobile-first).
- `js/main.js`: fetch da API, filtros, modal, favoritos, scroll infinito.

## Notas
- Commits usam datas simuladas conforme plano acordado.
- Sem build: apenas HTML/CSS/JS + jQuery via CDN.
