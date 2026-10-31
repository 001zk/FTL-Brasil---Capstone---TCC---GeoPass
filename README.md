# GeoPass

Projeto de capstone desenvolvido no contexto do **Future Tech Leaders Brasil 2026 — Space Tech Bootcamp**. O GeoPass relaciona dados orbitais públicos a localizações na Terra para calcular e visualizar passagens de satélites em um mapa web.

## Organização do repositório

- [`fase1/`](fase1/) — primeiro MVP: geração local de previsões orbitais e visualização cartográfica estática.
- [`fase2/`](fase2/) — evolução do MVP: busca manual de localidades, escolha de ponto no mapa e recálculo dinâmico no servidor Flask.
- [`fase1.txt`](fase1.txt) — marcador solicitado para identificar a primeira fase.

Cada pasta de fase é uma versão completa e independente do projeto, com seu próprio `README.md`, dependências, testes e código. Para executar uma versão, entre na pasta correspondente e siga as instruções do README daquela fase.

## Evolução do projeto

### Fase 1 — mapa e previsões iniciais

- Obtém dados orbitais GP em formato OMM da CelesTrak e os interpreta com Skyfield/SGP4.
- Calcula passagens para localidades configuradas e grava um conjunto JSON para o mapa.
- Apresenta localidades, trilhas terrestres, filtros de satélite e cartões com os horários e parâmetros da passagem.
- Inclui testes unitários para agrupar corretamente eventos de subida, culminação e descida.

### Fase 2 — consulta por local escolhido

- Acrescenta um servidor local Flask e rotas para geocodificação e cálculo de passagens.
- Permite buscar uma cidade manualmente com Nominatim e escolher entre os resultados; não usa autocomplete.
- Permite clicar no mapa para selecionar coordenadas e recalcular as passagens para esse ponto.
- Acrescenta seletor de fuso horário, sugestões regionais para o Brasil, cache de consultas e intervalo entre solicitações ao serviço de geocodificação.
- Valida coordenadas, fusos e seleção de satélites, com limite de até 12 satélites por consulta nesta versão.
- Mantém as trilhas do mapa como projeções terrestres pré-calculadas; elas não indicam posição ao vivo nem visibilidade garantida.

## Testes

Os comandos e dependências são próprios de cada fase. Na Fase 1, o pacote inclui quatro testes de núcleo. Na Fase 2, inclui onze testes de núcleo e API. Os READMEs de cada pasta trazem os comandos PowerShell para instalar dependências, testar e executar.

## Limites do conteúdo

Este repositório reúne os arquivos disponíveis das **Fases 1 e 2**. Não inclui as etapas posteriores do GeoPass, como integração USB/serial com ESP32, implantação em Vercel ou recursos adicionados em versões seguintes. Passagem geométrica acima de um limiar de elevação não equivale, por si só, a visibilidade a olho nu.

## Dados e atribuições

Os dados orbitais são obtidos da CelesTrak. O mapa usa Leaflet e cartografia do OpenStreetMap; a busca de localidades da Fase 2 utiliza Nominatim. Consulte os READMEs das fases para fontes, limitações e atribuições de uso.

**Autor:** Luiz Gustavo de Barros e Silva Santos.
