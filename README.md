<p align="center">
<img src="docs/images/GeoPass-Project-Mark.svg" alt="Marca GeoPass" width="120">
</p> <h1 align="center">GeoPass</h1> <p align="center">
  <strong>WebGIS para prever, consultar e visualizar passagens de satélites.</strong>  

  Dados orbitais públicos, propagação SGP4 e cartografia interativa em um único fluxo.
</p> <p align="center">
  <a href="#execução-rápida">Executar</a> ·
  <a href="#funcionalidades">Funcionalidades</a> ·
  <a href="#arquitetura">Arquitetura</a> ·
  <a href="#testes-e-validação">Testes</a> ·
  <a href="#implantação-na-vercel">Vercel</a>
</p>

---

## Visão geral

O GeoPass responde a uma pergunta prática: **quando um satélite passará sobre uma cidade ou sobre um ponto escolhido?** O sistema combina localização, tempo, elementos orbitais OMM publicados pela CelesTrak e propagação SGP4 para calcular eventos de passagem e exibi-los sobre um mapa Leaflet.

A aplicação foi desenvolvida como projeto de capstone do **Future Tech Leaders Brasil — Space Tech Bootcamp 2026**. As previsões são geométricas: uma passagem indica que o satélite ultrapassa o limite de elevação configurado, mas não garante visibilidade a olho nu.

## Capturas da aplicação

### Mapa orbital

O mapa é a superfície principal do produto. Ele mostra o local do observador, as trajetórias selecionadas, outras trilhas, posições amostradas e a janela de próximas passagens.

<p align="center">
<img src="docs/images/GeoPass-Mapa-Desktop.png" alt="Mapa orbital do GeoPass em desktop" width="920">
</p>

### Ao Vivo

A vista Ao Vivo propaga a ISS localmente a partir dos elementos OMM, diferencia o rastro percorrido da previsão futura e informa época, idade, origem, posição, altitude e velocidade estimadas.

<p align="center">
<img src="docs/images/GeoPass-Ao-Vivo.png" alt="Vista Ao Vivo do GeoPass" width="920">
</p>

### Layout responsivo

<p align="center">
<img src="docs/images/GeoPass-Mobile.png" alt="GeoPass em tela mobile" width="320">
</p>

## Sumário

- [Funcionalidades](#funcionalidades)

- [Evolução do projeto](#evolu%C3%A7%C3%A3o-do-projeto)

- [Arquitetura](#arquitetura)

- [Estrutura do repositório](#estrutura-do-reposit%C3%B3rio)

- [Execução rápida](#execu%C3%A7%C3%A3o-r%C3%A1pida)

- [Testes e validação](#testes-e-valida%C3%A7%C3%A3o)

- [Implantação na Vercel](#implanta%C3%A7%C3%A3o-na-vercel)

- [Fontes e atribuições](#fontes-e-atribui%C3%A7%C3%B5es)

- [Limitações conhecidas](#limita%C3%A7%C3%B5es-conhecidas)

## Funcionalidades

| Área | O que está disponível |
| --- | --- |
| **Mapa** | Camada inicial OpenStreetMap, alternativa Esri World Imagery, local do observador, seleção de satélites, trilhas e próximas passagens. |
| **Passagens** | Tabela completa de eventos, início, pico, fim, elevação máxima, azimute e época dos elementos. |
| **Rastreador** | Reprodução de uma trajetória pré-calculada, pausa, retomada, seleção do instante e enquadramento da rota. Não é telemetria ao vivo. |
| **Ao Vivo** | Propagação SGP4 local da ISS, posição estimada, altitude, velocidade, rastro passado, previsão futura e atualização manual do OMM. |
| **ESP32** | Comunicação local com Web Serial no navegador, envio de resumo de passagem e validação do `ACK`. |
| **Metodologia** | Explicação das fontes, coordenadas, modelo orbital, limitações e interpretação dos resultados. |
| **Busca** | Consulta de localidades pelo Nominatim, cache local, coordenadas escolhidas no mapa e fuso horário. |

### Dados orbitais e estados do Ao Vivo

A interface diferencia os estados dos elementos orbitais:

- `live`: consulta recente à CelesTrak;

- `build_snapshot`: snapshot produzido no build;

- `build_snapshot_stale`: fallback quando a fonte externa está indisponível;

- elementos com mais de 72 horas desde a época: posição e trilha não são apresentadas como atuais.

A atualização manual usa `/api/live/omm?refresh=1`, ignorando o snapshot recente antes de consultar a fonte orbital.

## Evolução do projeto

### Fase 1 — mapa e previsões iniciais

Cálculo de previsões para localidades configuradas, dataset JSON, mapa Leaflet, filtros, trilhas terrestres e horários previstos.

### Fase 2 — busca geográfica e cálculo dinâmico

Servidor Flask, busca de cidades com Nominatim, recálculo para coordenadas escolhidas, fuso horário, sugestões regionais para o Brasil, cache de geocodificação e validações de entrada.

### Fase 3 — rastreador orbital simulado

Visualização da trilha de um satélite selecionado, marcador temporal, reprodução, pausa, enquadramento e leitura do subponto terrestre. A trilha é pré-calculada e não representa posição atual.

### Fase 4 — integração serial local com ESP32

Ponte pySerial no servidor local e firmware PlatformIO. O computador envia uma mensagem `NEXT`; o firmware valida os campos, imprime o evento e responde com `ACK`.

### Fase 5 — Web Serial e preparação para implantação

Comunicação da placa pelo navegador com Web Serial, configuração de build, saída `public/`, camadas cartográficas, interface responsiva e separação entre execução local e runtime remoto.

### Fase 6 — visualização orbital e evolução cartográfica

A fase final integra o rastreamento orbital ao GeoPass existente:

- Ao Vivo com propagação local SGP4 da ISS;

- atualização OMM e fallback de snapshot;

- validação da idade dos elementos;

- distinção entre rastro percorrido e previsão futura;

- componente compartilhado `trajectory.mjs`;

- normalização de longitude e segmentação do antimeridiano;

- sincronização do marcador com a época do conjunto;

- mapas padrão Leaflet compartilhados entre Mapa e Ao Vivo;

- OSM como camada inicial e Esri como alternativa;

- mapa dominante, sidebar reduzida e painel de passagens recolhido;

- hardening de payloads, cabeçalhos de segurança e respostas de erro;

- entrypoint Python e configuração padrão para Vercel.

A Fase 6 não utiliza uma aba de globo 3D separada. A representação oficial permanece um mapa Leaflet padrão, mantendo consistência cartográfica e compatibilidade de implantação.

## Arquitetura

```
Navegador
├── web/index.html
├── web/assets/app.js              mapa, passagens, rastreador e ESP32
├── web/assets/live-orbit.js       propagação e experiência Ao Vivo
├── web/assets/trajectory.mjs      trajetória compartilhada
├── web/assets/vendor/             módulos locais do satellite.js
└── Leaflet + tiles OSM/Esri

Servidor Flask
├── server.py                      páginas, APIs, geocodificação e passagens
├── scripts/build_dataset.py       OMM, Skyfield, trilhas e passagens
├── scripts/live_orbit.py          snapshot, frescor e fallback OMM
└── scripts/esp32_serial.py        protocolo NEXT/ACK

Implantação
├── api/index.py                   exporta server.app para Vercel
├── vercel.json                    build, public/ e rewrite /api/*
└── scripts/vercel_build.py        gera dataset e saída estática
```

## Estrutura do repositório

```
README.md
RELATORIO_AUDITORIA_FASE6.md
RELATORIO_CARTOGRAFIA.md
RELATORIO_TRAJETORIAS.md
api/index.py                        entrypoint Python para Vercel
config.json                         parâmetros e localidades
requirements.txt                    dependências Python
pyproject.toml                      metadados do projeto
vercel.json                         configuração padrão de build Vercel
server.py                           aplicação Flask
web/                                frontend fonte
data/                              datasets e snapshots locais
scripts/                            build, cálculos e testes
tests/                              testes Python e fixture OMM
public/                             saída gerada pelo build
docs/images/                        imagens usadas nesta documentação
esp32/                              firmware e configuração PlatformIO
```

## Execução rápida

### Requisitos

- Python 3.12;

- Node.js para os testes de módulos e paridade;

- conexão com a internet para CelesTrak, Nominatim e tiles;

- navegador compatível com Web Serial para a integração ESP32.

### Instalação e execução

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/vercel_build.py
python server.py
```

Abra [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

### Atualização dos dados

```bash
python scripts/build_dataset.py --refresh
```

O comando baixa novamente o grupo configurado da CelesTrak, calcula as trilhas e atualiza `data/passes.json`. A aplicação usa snapshot local para manter uma inicialização possível quando a consulta externa falha.

## Testes e validação

### Suíte automatizada

```bash
python -m unittest discover -s tests -p 'test_*.py' -q
node scripts/test_trajectory.mjs
node scripts/test_live_track.mjs
node scripts/test_live_freshness.mjs
python scripts/verify_live_parity.py
python scripts/vercel_build.py
```

A auditoria final executou **40 testes Python**, testes de trajetória, antimeridiano, frescor, paridade satellite.js/Skyfield, build e smoke test do entrypoint Vercel.

### Verificação visual

A interface foi percorrida em Chromium nas resoluções 1366×768, 1440×900 e 390×844. As seis abas foram abertas, as camadas OSM e Esri foram trocadas no Mapa e no Ao Vivo, e o carregamento de tiles foi confirmado.

Os detalhes, riscos residuais e resultados por categoria estão em [RELATORIO_AUDITORIA_FASE6.md](RELATORIO_AUDITORIA_FASE6.md).

## Implantação na Vercel

O pacote contém o contrato padrão de implantação:

- `vercel.json` define `buildCommand`, `outputDirectory`, runtime Python 3.12 e rewrite de `/api/*`;

- `api/index.py` exporta `server.app`;

- `scripts/vercel_build.py` gera `public/`;

- não são necessárias credenciais privadas no build;

- dados externos são consultados em runtime ou preservados em snapshot.

Para validar localmente a mesma estrutura:

```bash
python scripts/vercel_build.py
python -c "import json; json.load(open('vercel.json'))"
python -c "from api.index import app; print(app.name)"
```

A implantação real ainda precisa ser executada na conta Vercel do responsável. O build local e a extração limpa do pacote foram validados; isso não substitui o teste de deploy remoto.

## Fontes e atribuições

- Dados orbitais: [CelesTrak](https://celestrak.org/).

- Busca geográfica: [Nominatim](https://nominatim.org/), seguindo a [política de uso](https://operations.osmfoundation.org/policies/nominatim/).

- Mapa de ruas: [OpenStreetMap](https://www.openstreetmap.org/), com atribuição visível.

- Imagem de satélite e referência: [Esri World Imagery](https://www.arcgis.com/), com atribuição visível.

- Propagação: [Skyfield](https://rhodesmill.org/skyfield/) e [satellite.js](https://github.com/shashwatak/satellite-js).

- Cartografia interativa: [Leaflet](https://leafletjs.com/).

As licenças e atribuições dos componentes vendorizados devem ser mantidas ao redistribuir o pacote.

## Limitações conhecidas

- CelesTrak, Nominatim, OpenStreetMap e Esri são serviços externos e podem sofrer indisponibilidade, rate limit ou alteração de política.

- A posição Ao Vivo é uma estimativa SGP4 baseada na época e na qualidade dos elementos OMM; não é telemetria.

- Passagens são geométricas e não modelam iluminação, nuvens, obstáculos ou magnitude aparente.

- A comunicação física com ESP32 depende de hardware, permissões do navegador e ambiente compatível com Web Serial.

- A publicação remota precisa ser executada e validada na conta de implantação.

## Documentação técnica

- [Auditoria final da Fase 6](RELATORIO_AUDITORIA_FASE6.md)

- [Auditoria cartográfica](RELATORIO_CARTOGRAFIA.md)

- [Reconstrução das trajetórias](RELATORIO_TRAJETORIAS.md)

## Autoria

**Luiz Gustavo de Barros e Silva Santos**
Future Tech Leaders Brasil — Space Tech Bootcamp 2026.
