<p align="center">
  <img src="FTL%20Brasil%20Logo.png" alt="Future Tech Leaders" width="720">
</p>

<h1 align="center">GeoPass</h1>

<p align="center">
  WebGIS para prever, consultar e visualizar passagens de satélites sobre locais escolhidos.
</p>

## Sobre o Space Tech Bootcamp

O GeoPass é o projeto de capstone do **Future Tech Leaders Brasil 2026 — Space Tech Bootcamp**, iniciativa de capacitação online e gratuita em tecnologias espaciais realizada no Brasil pela Agência Espacial Brasileira (AEB), pelo Programa das Nações Unidas para o Desenvolvimento (PNUD), pelo UNDP Istanbul International Center for Private Sector in Development (UNDP ICPSD) e pelo SDG AI Lab. O [e-book oficial](https://github.com/ftl-brazil-2026/ebook) organiza o material em três módulos: Fundamentos em GIS e Sensoriamento Remoto, Fundamentos em Machine Learning e Deep Learning e Estado da Arte. A [apresentação da AEB](https://www.gov.br/aeb/pt-br/assuntos/noticias/inscricoes-abertas-para-o-bootcamp-de-tecnologias-espaciais-do-future-tech-leaders-programme) descreve a formação e sua aplicação às tecnologias espaciais.

O projeto se relaciona principalmente ao eixo de dados geoespaciais do programa: combina uma localização na Terra com dados orbitais públicos e previsões temporais, apresentando o resultado em um mapa interativo.

## O problema que o GeoPass aborda

Elementos orbitais são publicados em formatos técnicos e nem sempre são simples de relacionar a uma pergunta prática: **quando um satélite passará sobre a minha cidade ou sobre um ponto específico?** O GeoPass busca tornar essa informação mais acessível ao combinar localização, tempo e propagação orbital em uma interface cartográfica.

O sistema usa elementos orbitais OMM da CelesTrak e o modelo SGP4 por meio do Skyfield. Para um observador escolhido, calcula eventos de subida, ponto de maior elevação e descida. A aplicação também apresenta elevação máxima, azimute e época dos elementos utilizados.

Uma passagem indicada pelo GeoPass é geométrica: o satélite ultrapassa o limite de elevação configurado. Isso não garante visibilidade a olho nu, pois iluminação do satélite, condições do céu e obstáculos locais também influenciam.

## Evolução do projeto

### Fase 1 — mapa e previsões iniciais

A primeira versão calcula previsões para localidades configuradas e grava os resultados em um conjunto de dados JSON. A interface Leaflet mostra as localidades, as trilhas terrestres dos satélites, filtros e cartões com os horários previstos. Esta fase contém quatro testes automatizados para o agrupamento dos eventos orbitais.

### Fase 2 — busca geográfica e cálculo dinâmico

A segunda versão acrescenta um servidor Flask, busca manual de cidades com Nominatim e recálculo para coordenadas encontradas ou escolhidas por clique no mapa. Inclui escolha de fuso horário, sugestões regionais para o Brasil, cache de geocodificação e validações de entrada. A suíte contém onze testes de núcleo e API.

### Fase 3 — rastreador orbital simulado

A terceira versão mantém as funções da Fase 2 e acrescenta a visualização de uma trilha terrestre para um satélite selecionado. O usuário pode mover um marcador ao longo da trilha com um controle de tempo, reproduzir ou pausar a simulação, enquadrar a rota completa e retornar ao local do observador. O painel mostra o instante simulado em UTC e no fuso escolhido, além do subponto terrestre em latitude e longitude.

A trilha é calculada previamente a partir dos elementos orbitais disponíveis quando o dataset é gerado, com amostragem de dois minutos por padrão. **O rastreador não é ao vivo**: seu marcador percorre pontos pré-calculados e não indica a posição atual do satélite. A Fase 3 mantém os onze testes de núcleo e API; os controles visuais do rastreador são verificados manualmente.

## Estrutura do repositório

```text
README.md                         visão geral, programa e evolução
FTL Brasil Logo.png               logo do programa exibida neste README
fase1.txt                         marcador solicitado para a primeira fase
fase1/                            primeiro MVP completo
fase2/                            busca geográfica e cálculo dinâmico
fase3/                            mapa com simulação da rota terrestre
```

Cada pasta de fase contém sua própria configuração, dependências, código, testes e README com instruções de execução. Para instalar e executar uma versão, entre na pasta desejada e siga o respectivo `README.md`.

## Tecnologias e fontes de dados

O projeto utiliza Python, Skyfield/SGP4 e Flask no backend, além de JavaScript e Leaflet na interface cartográfica. Os elementos orbitais vêm da [CelesTrak](https://celestrak.org/). A busca por cidades da Fase 2 e da Fase 3 usa o [Nominatim](https://nominatim.org/) e deve respeitar sua [política de uso](https://operations.osmfoundation.org/policies/nominatim/). O mapa usa cartografia do [OpenStreetMap](https://www.openstreetmap.org/).

## Limites deste pacote

Este repositório reúne somente as **Fases 1, 2 e 3**. Não inclui versões posteriores, integração USB/serial com ESP32, display OLED ou implantação pública. As previsões dependem da época e da qualidade dos elementos orbitais. Uma passagem geométrica não equivale a uma previsão completa de visibilidade óptica.

## Autor

**Luiz Gustavo de Barros e Silva Santos**  
Future Tech Leaders Brasil — Space Tech Bootcamp 2026.
