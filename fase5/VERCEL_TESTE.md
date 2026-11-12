# GeoPass — checklist para o preview da Vercel

## Estado desta entrega

Esta cópia contém a prévia redesenhada da Fase 5 e foi validada localmente. Não houve sincronização com o GitHub do autor, conexão com uma conta Vercel nem publicação em produção. Os dados orbitais mudam com as atualizações do CelesTrak; os números deste build são apenas o snapshot gerado em `2026-11-11T23:34:09Z`.

## Preparar um preview quando a versão for aprovada

1. No repositório consolidado de cinco fases, leve a versão aprovada apenas para a pasta `fase5`, preservando as pastas das outras fases. Esta prévia do Manus ainda não foi enviada ao GitHub.
2. Importe o repositório no Vercel e configure `fase5` como **Root Directory**.
3. Mantenha a configuração Flask/Python existente. O `pyproject.toml` declara o entrypoint `server:app`, Python 3.12 e o build command `python scripts/vercel_build.py`.
4. No log de build, confirme a mensagem `Vercel build OK`. Guarde o log completo caso haja falha; o build consulta dados orbitais da CelesTrak.
5. Use a URL de Preview para os testes abaixo. O build local não comprova a execução do runtime remoto; não promova a implantação para produção durante essa validação.

## Rotas para verificar no preview

Substitua `SUA-URL-DE-PREVIEW` pela URL gerada pelo Vercel.

- `GET https://SUA-URL-DE-PREVIEW/` — retorna a interface HTML.
- `GET https://SUA-URL-DE-PREVIEW/data/passes.json` — retorna JSON com `satellites`, `passes`, `locations` e `tracks`.
- `GET https://SUA-URL-DE-PREVIEW/assets/app.css` e `/assets/app.js` — retornam os assets da interface.
- `GET https://SUA-URL-DE-PREVIEW/manus-routes.json` — retorna o manifesto da página `/`.
- `POST https://SUA-URL-DE-PREVIEW/api/geocode` com `{"query":"Rio de Janeiro"}` — retorna resultados ou mensagem clara de indisponibilidade do Nominatim.
- `POST https://SUA-URL-DE-PREVIEW/api/passes` com coordenadas e fuso válidos — retorna a previsão ou mensagem clara de indisponibilidade dos dados orbitais.
- `GET https://SUA-URL-DE-PREVIEW/api/esp32/ports` — no runtime hospedado, deve informar que o servidor não acessa USB/COM do computador.

Exemplo de corpo para cálculo dinâmico:

```json
{
  "name": "Rio de Janeiro",
  "latitude": -22.9068,
  "longitude": -43.1729,
  "timezone": "America/Sao_Paulo",
  "satellite_ids": ["25544"]
}
```

## ESP32 no navegador

O ESP32 permanece conectado ao computador do usuário, não ao servidor Vercel. A comunicação é feita pela Web Serial API no Chrome ou Edge, por HTTPS/localhost, depois de clique e autorização explícita do usuário. O ACK do firmware deve ser exibido na interface. Feche o Monitor Serial antes de testar a conexão pelo navegador.

## Evidência local desta prévia

O snapshot local mais recente gerou 19 satélites, 153 passagens e 3 localidades. Os 25 testes automatizados passaram; confira o [registro detalhado](artifacts/validation-final.txt) e o [relatório da prévia](RELATORIO_PREVIA.md). Não houve ensaio de preview remoto Vercel nem de conexão física do ESP32 nesta revisão.

## Fontes oficiais

- [Flask na Vercel](https://vercel.com/docs/frameworks/backend/flask)
- [Runtime Python da Vercel](https://vercel.com/docs/functions/runtimes/python)
- [Monorepos na Vercel](https://vercel.com/docs/monorepos)
- [Web Serial API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Serial/requestPort)
