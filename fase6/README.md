# Fase 6 — Visualização Orbital e Evolução Cartográfica

Esta pasta contém a implementação final da Fase 6 do GeoPass. Ela foi construída sobre as funcionalidades integradas das fases anteriores e mantém Mapa, Passagens, Rastreador, Ao Vivo, ESP32 e Metodologia.

## O que foi implementado

- **Ao Vivo:** propagação SGP4 local da ISS a partir de OMM publicado.
- **Dados orbitais:** estados `live`, `build_snapshot` e `build_snapshot_stale`, com idade e época visíveis.
- **Segurança científica:** acima de 72 horas desde a época, posição e trilha não são mostradas como atuais.
- **Trajetórias:** componente `web/assets/trajectory.mjs` compartilhado entre Mapa e Ao Vivo, com normalização de longitude, antimeridiano, passado/futuro e sincronização do marcador.
- **Cartografia:** OpenStreetMap como camada inicial, Esri World Imagery como alternativa e atribuições visíveis.
- **Interface:** mapa dominante, painel de passagens recolhido, layout responsivo e linguagem consistente entre Mapa e Ao Vivo.
- **Vercel:** `vercel.json`, `api/index.py`, build para `public/` e rewrite de `/api/*`.
- **Hardening:** limite de payload, cabeçalhos de segurança, validação de entradas e mensagens de erro sem detalhes internos.

## Execução

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/vercel_build.py
python server.py
```

Abra `http://127.0.0.1:8000/`.

Para atualizar os dados orbitais do dataset:

```bash
python scripts/build_dataset.py --refresh
```

A atualização manual da ISS ocorre pelo botão **Atualizar elementos** na aba Ao Vivo.

## Testes

```bash
python -m unittest discover -s tests -p 'test_*.py' -q
node scripts/test_trajectory.mjs
node scripts/test_live_track.mjs
node scripts/test_live_freshness.mjs
python scripts/verify_live_parity.py
python scripts/vercel_build.py
```

A auditoria final executou 40 testes Python, testes de trajetória e antimeridiano, frescor OMM, paridade satellite.js/Skyfield, build e smoke test do entrypoint Vercel. A interface foi percorrida em Chromium nas abas Mapa, Passagens, Rastreador, Ao Vivo, ESP32 e Metodologia; OSM e Esri foram testados no Mapa e no Ao Vivo.

## Arquitetura

```text
server.py                      Flask e APIs
web/index.html                 estrutura das seis vistas
web/assets/app.js              Mapa, Passagens, Rastreador e ESP32
web/assets/live-orbit.js       Ao Vivo e propagação no navegador
web/assets/trajectory.mjs      lógica compartilhada dos rastros
web/assets/vendor/             módulos locais satellite.js
scripts/build_dataset.py       dataset, trilhas e passagens
scripts/live_orbit.py          OMM, snapshot e fallback
scripts/vercel_build.py        saída public/ para implantação
api/index.py                   exporta server.app
vercel.json                    contrato padrão Vercel
tests/                         testes automatizados
```

## Documentação

- [Auditoria final da Fase 6](RELATORIO_AUDITORIA_FASE6.md)
- [Auditoria cartográfica](RELATORIO_CARTOGRAFIA.md)
- [Reconstrução das trajetórias](RELATORIO_TRAJETORIAS.md)
- [README histórico na raiz](../README.md)

## Fontes e limitações

Os elementos orbitais vêm da [CelesTrak](https://celestrak.org/), a busca geográfica usa [Nominatim](https://nominatim.org/), e os tiles usam [OpenStreetMap](https://www.openstreetmap.org/) e [Esri](https://www.arcgis.com/). O cálculo é estimativo e depende da época e da qualidade dos elementos OMM. Tiles, Nominatim e CelesTrak são serviços externos sujeitos a limites e indisponibilidade. Passagens são geométricas e não garantem visibilidade a olho nu.

A integração física com ESP32 requer hardware compatível e navegador com Web Serial. A publicação remota na Vercel precisa ser executada e validada na conta de implantação.
