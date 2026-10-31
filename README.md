<p align="center">
<img src="assets/ftl-logo.png" alt="Future Tech Leaders" width="720">
</p> <h1 align="center">GeoPass</h1> <p align="center">
  WebGIS para previsão e visualização de passagens de satélites sobre localidades escolhidas.
</p> <p align="center">
  <a href="#sobre-o-programa">Sobre o programa</a> ·
  <a href="#sobre-o-geopass">Sobre o GeoPass</a> ·
  <a href="#evolução-do-projeto">Evolução</a> ·
  <a href="#estrutura">Estrutura</a>
</p>

## Sobre o programa

Este projeto foi desenvolvido como capstone do **Future Tech Leaders (FTL) Brasil 2026 — Space Tech Bootcamp**, um programa gratuito de capacitação online em tecnologias espaciais. A iniciativa brasileira é realizada pela Agência Espacial Brasileira (AEB), pelo Programa das Nações Unidas para o Desenvolvimento (PNUD), pelo Istanbul International Center for Private Sector in Development (UNDP ICPSD) e pelo SDG AI Lab. Segundo a [AEB](https://www.gov.br/aeb/pt-br/assuntos/noticias/inscricoes-abertas-para-o-bootcamp-de-tecnologias-espaciais-do-future-tech-leaders-programme), o bootcamp aborda Inteligência Artificial, Machine Learning, Sistemas de Informação Geográfica, GeoAI e outras competências aplicadas às tecnologias espaciais. A edição de 2026 foi anunciada como uma capacitação online de três meses, dirigida a estudantes e graduados de áreas STEM, geoespaciais, ambientais, planejamento urbano e áreas relacionadas, com faixa etária de 18 a 35 anos e conhecimento de Python.

O FTL busca contribuir para a formação de jovens e estudantes universitários em tecnologias emergentes e para a redução da desigualdade digital. O [e-book oficial do programa](https://github.com/ftl-brazil-2026/ebook) organiza o material em três grandes módulos: **Fundamentos em GIS e Sensoriamento Remoto**, **Fundamentos em Machine Learning e Deep Learning** e **Estado da Arte**. O currículo trabalha com dados geoespaciais, APIs, plataformas de análise, aprendizado de máquina, aprendizado profundo e aplicações territoriais.

O GeoPass foi desenvolvido principalmente a partir do eixo de GIS e dados geoespaciais. Em vez de apresentar apenas dados orbitais brutos, o projeto os transforma em uma consulta cartográfica compreensível para uma localização na Terra.

## Sobre o GeoPass

O GeoPass é um protótipo de **WebGIS** que calcula e visualiza as próximas passagens de satélites sobre uma cidade ou coordenada escolhida pelo usuário. O sistema utiliza elementos orbitais públicos da CelesTrak e propagação SGP4 por meio do Skyfield para estimar eventos de subida, maior elevação e descida em relação ao observador.

O problema abordado é a dificuldade de transformar informações orbitais técnicas em uma resposta geográfica prática: **quando um satélite passará sobre determinado local?** A aplicação relaciona tempo, posição orbital e localização do observador em uma interface de mapa. Assim, o usuário pode selecionar satélites, pesquisar uma cidade, clicar em um ponto do mapa e consultar horários, elevação máxima e azimute.

A “passagem” apresentada pelo sistema é geométrica: o satélite ultrapassa o limite de elevação configurado em relação ao observador. Isso não equivale automaticamente a uma passagem visível a olho nu, pois iluminação solar, condições do céu, obstáculos e outros fatores também influenciam a observação.

## Evolução do projeto

### Fase 1 — mapa e previsões iniciais

A primeira fase estabelece o núcleo do projeto:

- obtenção de elementos orbitais OMM da CelesTrak;

- cálculo de passagens para localidades configuradas usando Skyfield/SGP4;

- geração de um conjunto de dados JSON para a interface;

- mapa Leaflet com localidades, trilhas terrestres e filtros de satélite;

- cartões com horários, elevação máxima, azimute e época dos elementos;

- testes unitários para o agrupamento correto de subida, culminação e descida.

### Fase 2 — consulta geográfica e cálculo dinâmico

A segunda fase amplia a consulta para locais definidos pelo usuário:

- busca manual de cidades e lugares usando Nominatim;

- escolha de um resultado de geocodificação;

- clique direto no mapa para definir coordenadas;

- recálculo das passagens no servidor Flask;

- seleção de fuso horário e sugestões para regiões do Brasil;

- cache das consultas e validação de coordenadas, fusos e satélites;

- testes de núcleo e de API para as novas funções.

As trilhas exibidas continuam sendo projeções terrestres pré-calculadas. Elas não representam posição ao vivo, trajetória aparente no céu ou garantia de visibilidade.

## Estrutura

```
README.md                         apresentação geral e evolução do projeto
fase1/                            primeiro MVP completo
fase1/README.md                   documentação da Fase 1
fase1/scripts/                    cálculo e geração do dataset inicial
fase1/web/                        mapa web estático
fase1/tests/                      testes do núcleo
fase2/                            evolução completa da Fase 2
fase2/README.md                   documentação da Fase 2
fase2/server.py                   servidor Flask e APIs locais
fase2/scripts/                   cálculo e geração dos dados
fase2/web/                        interface com busca e cálculo dinâmico
fase2/tests/                      testes do núcleo e da API
assets/ftl-logo.png               logo usada neste README
fase1.txt                         marcador da primeira fase
```

Cada pasta de fase é independente e possui seu próprio `README.md`, `requirements.txt`, configuração, código e testes. Para executar uma fase, entre na pasta correspondente e siga as instruções de instalação e execução descritas nela.

## Validação atual

A Fase 1 possui quatro testes automatizados. A Fase 2 possui onze testes automatizados, incluindo validação de coordenadas, fuso horário, seleção de satélites, busca manual e cálculo dinâmico para as coordenadas escolhidas.

Os dados orbitais são obtidos da [CelesTrak](https://celestrak.org/). O mapa utiliza [Leaflet](https://leafletjs.com/) e cartografia do [OpenStreetMap](https://www.openstreetmap.org/). A busca da Fase 2 utiliza [Nominatim](https://nominatim.org/) e deve respeitar sua [política de uso](https://operations.osmfoundation.org/policies/nominatim/).

## Limites e próximos passos

Este repositório reúne as versões disponíveis das Fases 1 e 2. As etapas posteriores — como integração USB/serial com ESP32, possíveis notificações em hardware, recursos adicionais de visibilidade e implantação pública — devem ser tratadas como evoluções do projeto, não como parte deste pacote histórico.

O protótipo não substitui uma previsão observacional completa. A qualidade dos resultados depende da época e da precisão dos elementos orbitais, e uma passagem geométrica acima do limite não garante que o satélite possa ser observado a olho nu.

## Autor

**Luiz Gustavo de Barros e Silva Santos**
Future Tech Leaders Brasil — Space Tech Bootcamp 2026.

## Fontes do programa

- [Future Tech Leaders Brasil — e-book oficial](https://github.com/ftl-brazil-2026/ebook)

- [Informações gerais do currículo](https://github.com/ftl-brazil-2026/ebook/blob/main/course-info/general-info.md)

- [Agência Espacial Brasileira — Bootcamp de Tecnologias Espaciais](https://www.gov.br/aeb/pt-br/assuntos/noticias/inscricoes-abertas-para-o-bootcamp-de-tecnologias-espaciais-do-future-tech-leaders-programme)
