# GeoPass — Fase 3: rastreador orbital simulado

## Sobre o Space Tech Bootcamp

O GeoPass foi desenvolvido como projeto de capstone do **Future Tech Leaders Brasil 2026 — Space Tech Bootcamp**, capacitação online e gratuita em tecnologias espaciais realizada no Brasil pela Agência Espacial Brasileira (AEB), pelo PNUD, pelo UNDP ICPSD e pelo SDG AI Lab. O currículo inclui fundamentos de GIS e sensoriamento remoto, Machine Learning, Deep Learning e aplicações geoespaciais. Consulte o [e-book oficial do programa](https://github.com/ftl-brazil-2026/ebook) e a [apresentação da AEB](https://www.gov.br/aeb/pt-br/assuntos/noticias/inscricoes-abertas-para-o-bootcamp-de-tecnologias-espaciais-do-future-tech-leaders-programme).

## O que esta fase acrescenta

A Fase 3 mantém a busca manual de localidades e o recálculo de passagens introduzidos na Fase 2. A principal novidade é uma simulação cartográfica da rota terrestre de um satélite selecionado. O mapa apresenta a linha da trilha, um marcador cuja posição pode ser percorrida no tempo e controles para reproduzir, pausar, mostrar a rota completa ou voltar ao local do observador.

O painel também informa o instante simulado no fuso escolhido e em UTC, além do subponto terrestre — latitude e longitude da superfície diretamente abaixo do satélite naquele instante.

## O rastreador não é ao vivo

A trilha é calculada previamente pelo script `scripts/build_dataset.py` a partir dos elementos orbitais OMM obtidos da CelesTrak. O instante inicial corresponde à geração do dataset, e a trilha é amostrada a cada dois minutos por padrão. O controle de tempo apenas percorre esses pontos já calculados. Portanto, o marcador **não mostra a posição atual em tempo real**, e a linha é uma projeção da órbita sobre a superfície terrestre — não a trajetória aparente no céu.

As previsões de passagem são geométricas: superar o limiar de elevação não garante visibilidade a olho nu. A fase não calcula iluminação solar do satélite, condições meteorológicas ou obstáculos locais.

## Executar no Windows PowerShell

Extraia o repositório e entre na pasta `fase3`. Troque o caminho de exemplo pelo local onde você extraiu o projeto:

```powershell
Set-Location -LiteralPath "C:\caminho\para\GeoPass\fase3"
py --version
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Rode os testes automatizados:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Gere ou atualize as previsões e a trilha orbital:

```powershell
.\.venv\Scripts\python.exe scripts\build_dataset.py
```

Para baixar novamente os elementos orbitais da CelesTrak, ignorando o cache local:

```powershell
.\.venv\Scripts\python.exe scripts\build_dataset.py --refresh
```

Inicie o servidor da aplicação:

```powershell
.\.venv\Scripts\python.exe server.py
```

Mantenha o terminal aberto e acesse <http://127.0.0.1:8000/>. Encerre o servidor com `Ctrl+C`. A aplicação precisa de internet para consultar localidades no Nominatim e carregar o mapa.

## Teste manual do rastreador

1. Selecione poucos satélites para agilizar o cálculo inicial e escolha ou pesquise um local.
2. No bloco **Posição e rota terrestre**, escolha um satélite no seletor.
3. Arraste o controle de tempo para mover o marcador pela trilha.
4. Use **Reproduzir/Pausar** para percorrer os pontos automaticamente.
5. Use **Ver rota completa** para enquadrar a trilha e **Voltar ao local** para retornar ao observador.
6. Confira a indicação de instante simulado, fuso local, UTC e subponto terrestre.

## Dados, dependências e limites

A aplicação usa Python, Skyfield/SGP4, Flask, `tzdata`, CelesTrak, Nominatim, Leaflet e cartografia do OpenStreetMap. A Fase 3 aceita até 12 satélites em cada consulta dinâmica; a janela padrão é 24 horas, limitada pelo servidor a 48 horas. O limiar geométrico padrão é 10° e a amostragem padrão do rastreador é de dois minutos. Os parâmetros ajustáveis ficam em `config.json`.

As consultas de geocodificação são feitas somente quando a pessoa clica em **Buscar**. A aplicação usa cache e intervalo entre solicitações. Consulte a [política de uso do Nominatim](https://operations.osmfoundation.org/policies/nominatim/). Os dados orbitais têm uma época e precisão limitadas; execute o gerador novamente para atualizar as previsões e trilhas.

Esta versão não inclui integração com ESP32, display OLED nem implantação pública.

## Estrutura da Fase 3

```text
config.json                 localidades e parâmetros
requirements.txt            dependências Python
server.py                   servidor local, busca e API de cálculo
scripts/build_dataset.py    obtenção de OMM, passagens e trilhas
scripts/geopass_core.py     agrupamento de eventos orbitais
web/index.html              mapa, busca e controles do rastreador
tests/test_api.py           testes de API e cálculo dinâmico
tests/test_core.py          testes do agrupamento de eventos
data/README.txt             descrição dos arquivos gerados
```

A suíte incluída contém 11 testes de núcleo e API herdados da etapa anterior. A interação visual do rastreador deve também ser conferida manualmente pelos passos acima.

## Referências técnicas

- [Skyfield — Earth satellites](https://rhodesmill.org/skyfield/earth-satellites.html)
- [CelesTrak — GP data formats](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- [Nominatim Search API](https://nominatim.org/release-docs/latest/api/Search/) e [política de uso](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap — copyright and attribution](https://www.openstreetmap.org/copyright)

## Autor

**Luiz Gustavo de Barros e Silva Santos**  
Future Tech Leaders Brasil — Space Tech Bootcamp 2026.
