# Relatório de Auditoria — Fase 6

**Projeto:** GeoPass  
**Escopo:** auditoria final da implementação integrada da Fase 6  
**Data da auditoria:** 19/11/2026  
**Classificação:** **Aprovada com ressalvas**

## Resumo executivo

A Fase 6 foi auditada como uma evolução integrada do GeoPass existente, não como uma aplicação separada. A implementação mantém Mapa, Passagens, Rastreador, Ao Vivo, ESP32 e Metodologia, acrescentando propagação orbital local da ISS, atualização OMM, distinção entre posição passada e previsão futura, lógica compartilhada de trajetórias e uma reconstrução cartográfica compatível com Leaflet e implantação serverless.

Os testes funcionais, cartográficos, orbitais, de frontend, de backend, de build e de inspeção visual foram executados. A auditoria encontrou e corrigiu ausência de limite explícito para payloads, falta de cabeçalhos básicos de segurança e exposição desnecessária de detalhes internos em respostas genéricas de erro. A análise estática encontrou somente alertas previamente justificados: chamadas `urlopen` para URLs HTTPS fixas e descarte controlado de registros orbitais inválidos.

A classificação é **Aprovada com ressalvas** porque tiles, CelesTrak e Nominatim são serviços externos sujeitos a indisponibilidade e limites próprios; a publicação efetiva no repositório remoto e em uma conta de implantação não foi executada nesta sessão.

A estrutura de implantação foi reforçada com `vercel.json` e `api/index.py`: o primeiro declara build, saída `public/`, runtime Python 3.12 e rewrite de `/api/*`; o segundo exporta `server.app`. Esse contrato foi validado em extração limpa do ZIP, com instalação das dependências, importação do entrypoint e smoke test de `/` e `/api/live/omm`.

## Segurança

### Ferramentas utilizadas

- `pip-audit` sobre `requirements.txt`.
- `bandit` sobre `server.py` e `scripts/`.
- `python -m compileall`.
- inspeção estática de padrões de credenciais, arquivos de ambiente, rotas, CORS, sinks HTML e dependências.
- smoke tests HTTP no servidor local.

### Resultados e correções

| Item | Resultado | Gravidade | Ação |
|---|---|---:|---|
| Credenciais, tokens e arquivos de ambiente | Não encontrados | — | Nenhuma credencial foi incluída no pacote. |
| Dependências Python | `pip-audit`: nenhum problema conhecido | — | Dependências mantidas com faixas declaradas. |
| Entrada JSON sem limite explícito | Encontrado | Média | `MAX_CONTENT_LENGTH` limitado a 1 MiB; resposta 413 para API. |
| Cabeçalhos de segurança | Ausentes | Baixa | Adicionados `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`. |
| Detalhes internos em erros | Parcialmente expostos | Média | Mensagens genéricas retornadas ao cliente; detalhes permanecem no log do servidor. |
| XSS no frontend | Não identificado | — | Valores dinâmicos interpolados passam por `safe()` antes de `innerHTML`; respostas de API são validadas. |
| CORS | Não habilitado | — | O servidor não adiciona CORS aberto. |
| Requisições externas | URLs fixas HTTPS | Baixa | CelesTrak e Nominatim usam `Request`, User-Agent e timeouts; alertas B310 foram justificados no código. |
| Descarte de OMM inválido | Controlado | Baixa | Registro inválido é ignorado, com aviso no build, sem interromper o conjunto inteiro. |

Não foram encontradas chaves, senhas, tokens, arquivos `.env`, permissões de escrita excessivas ou manifesto de rotas específico de plataforma.

### Riscos residuais

Os provedores externos podem retornar dados malformados, indisponibilidade, rate limit ou alteração de contrato. O cliente não deve tratar respostas externas como telemetria sem passar pelas validações existentes. O servidor local não deve ser exposto diretamente à internet sem proxy TLS e política operacional apropriada.

## Usabilidade

Foram percorridos Mapa, Passagens, Rastreador, Ao Vivo, ESP32, Metodologia, troca de base cartográfica, busca de localidade, seleção de satélites, atualização manual OMM, centralização da ISS, pausa e retomada, carregamento e fallback.

Correções confirmadas:

- o botão de atualização manual força consulta OMM;
- o estado diferencia dados live, snapshot de build e snapshot de contingência;
- posição, marcador e trilha são removidos quando os elementos ultrapassam 72 horas;
- mensagens de erro não apresentam telemetria inexistente;
- o painel de passagens começa recolhido para não bloquear o mapa;
- a camada inicial é OSM em Mapa e Ao Vivo;
- o mapa permanece utilizável quando a API externa de OMM falha, usando o snapshot disponível;
- a comunicação serial remota é recusada com orientação para Web Serial no navegador.

## UI/UX

A revisão visual anterior identificou mapa pequeno, painéis sobrepostos, linguagem cartográfica divergente e áreas vazias nas bordas. A composição foi reconstruída para priorizar a superfície cartográfica: sidebar reduzida, painel de passagens recolhido, legenda compacta, mapa principal dominante e Ao Vivo com a mesma base cartográfica.

Foram capturadas e inspecionadas telas em 1366×768, 1440×900, 390×844 e Ao Vivo em 1366×768. As telas confirmaram mapa contínuo nos viewports testados, ausência de blocos cinza, painel secundário recolhido, legenda legível e centralização da ISS inclusive próxima ao antimeridiano.

Na verificação funcional final, Chromium percorreu e tornou visíveis as seis abas — Mapa, Passagens, Rastreador, Ao Vivo, ESP32 e Metodologia. A troca de camada foi executada em Mapa e Ao Vivo para OSM e Esri; cada estado apresentou tiles carregados. Não foram encontrados erros de JavaScript. Cancelamentos de requisições de tiles antigos durante a troca de camada foram identificados como abortos normais do Leaflet, não como respostas HTTP de erro.

## Auditoria cartográfica e orbital

A lógica compartilhada em `web/assets/trajectory.mjs` faz normalização de longitude, segmentação do antimeridiano, separação temporal entre passado e futuro e busca do ponto mais próximo da época do conjunto. Ao Vivo usa satellite.js 7.2.0 para propagar a ISS localmente a cada 30 segundos, com cálculo de posição geodética, altitude e velocidade.

Os testes verificaram antimeridiano, polos, hemisférios, continuidade, partição temporal, sincronização do marcador e paridade com o cálculo Python. Não há globo tridimensional nesta versão: a representação oficial da Fase 6 é o mapa Leaflet padrão, evitando uma camada 3D desconectada da cartografia principal.

## Qualidade do código e independência

Foram revisados `server.py`, `scripts/`, `web/`, `tests/`, `config.json`, `pyproject.toml`, `requirements.txt` e os módulos vendorizados necessários do satellite.js. O pacote não contém cópia completa de fases anteriores como diretórios separados; os módulos necessários permanecem integrados porque a Fase 6 depende do funcionamento conjunto do GeoPass.

A inspeção não encontrou referências a rotas, serviços ou metadados específicos do ambiente de desenvolvimento. Também não encontrou referências desnecessárias a ferramentas de geração de conteúdo. Os créditos de Leaflet, satellite.js, OpenStreetMap, Esri, CelesTrak e Nominatim permanecem documentados e visíveis quando exigido.

## Resultados dos testes

| Categoria | Resultado | Observações |
|---|---|---|
| Segurança | Aprovado | `pip-audit` sem vulnerabilidades conhecidas; hardening aplicado; riscos residuais externos documentados. |
| Backend | Aprovado | 40 testes Python após inclusão dos testes de segurança. |
| Frontend | Aprovado | Sintaxe JavaScript e serving de módulos verificados. |
| Cartografia | Aprovado | OSM/Esri responderam HTTP 200; zoom, continuidade e atribuições verificadas. |
| Cálculos orbitais | Aprovado | SGP4, conversão geodética, frescor e paridade verificados. |
| UI/UX | Aprovado com ressalvas | Inspeção visual em desktop e mobile; provedores externos não são controláveis. |
| Usabilidade | Aprovado | Navegação e estados live/snapshot/fallback percorridos. |
| Responsividade | Aprovado | 1366×768, 1440×900 e 390×844 inspecionados. |
| Integração | Aprovado | Mapa, Rastreador, Ao Vivo, ESP32 e APIs preservados. |
| Build | Aprovado | `scripts/vercel_build.py` executado com sucesso. |
| Produção | Não executado | Não houve publicação remota nesta sessão; o pacote limpo, o entrypoint Vercel, o build e o smoke test foram executados. |

### Comandos executados

```bash
python -m unittest discover -s tests -p 'test_*.py' -q
node scripts/test_trajectory.mjs
node scripts/test_live_track.mjs
node scripts/test_live_freshness.mjs
python scripts/verify_live_parity.py
python scripts/vercel_build.py
python -m compileall -q server.py scripts tests
pip-audit -r requirements.txt
bandit -r server.py scripts
```

Também foram executados em cópia limpa extraída do ZIP: instalação de `requirements.txt`, os 40 testes Python, os testes Node, o build, importação de `api/index.py`, leitura de `vercel.json` e chamadas HTTP de `/` e `/api/live/omm`.

## README e repositório remoto

O `README.md` local foi atualizado integralmente, preservando a evolução das Fases 1 a 5 e acrescentando a documentação real da Fase 6. O acesso autenticado para gravar diretamente no repositório GitHub oficial não estava habilitado nesta sessão; por isso, o README atualizado é entregue localmente no pacote e como arquivo separado.

## Limitações

- CelesTrak, Nominatim, OpenStreetMap e Esri permanecem dependências externas.
- Uma consulta live bem-sucedida pode devolver a mesma época orbital se o provedor ainda não publicou um conjunto mais novo.
- A posição Ao Vivo é estimativa SGP4, não telemetria.
- Passagens são geométricas e não modelam visibilidade óptica.
- Teste físico de hardware ESP32 depende do dispositivo conectado.
- Publicação Vercel/GitHub não foi executada nesta sessão; o build e o serving local foram validados.

## Conclusão

A Fase 6 está **Aprovada com ressalvas**. O código integrado foi auditado, os problemas de hardening encontrados foram corrigidos, a cartografia e a lógica orbital foram verificadas, e o pacote pode ser instalado e executado fora do ambiente original. As ressalvas restantes são dependências externas e a publicação remota, não falhas conhecidas no código auditado.
