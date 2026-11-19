# Relatório — reconstrução das trajetórias orbitais

## Problema original

O mapa principal e a vista Ao Vivo desenhavam linhas sobre a cartografia com lógicas diferentes. O mapa principal usava pontos pré-calculados do dataset e a vista Ao Vivo recalculava pontos próprios. A separação de responsabilidades não era o único problema: a linha principal não diferenciava rastro passado de previsão futura e o marcador do mapa podia ser deslocado para o pico da próxima passagem, parecendo uma posição atual.

## Causa técnica

A geração dos pontos do mapa principal usa Skyfield e `wgs84.subpoint`, com amostragem de dois minutos no dataset atual. A vista Ao Vivo usa satellite.js/SGP4 a cada 30 segundos. A renderização era feita com duas funções diferentes de segmentação. Embora a quebra básica do antimeridiano já existisse, não havia um componente comum responsável por sanitizar longitudes, validar latitudes, separar segmentos, particionar passado/futuro e encontrar a amostra sincronizada do marcador.

O cálculo orbital não foi substituído por uma interpolação visual. Os pontos continuam vindo de Skyfield/SGP4 ou satellite.js. A reconstrução atua na amostragem disponível, na projeção geodésica para Leaflet e na renderização; não inventa uma órbita.

## Solução implementada

Foi criado `web/assets/trajectory.mjs`, usado pelo mapa principal e indiretamente pela vista Ao Vivo. Ele normaliza longitude para `[-180, 180]`, rejeita pontos inválidos, separa a linha quando a diferença longitudinal cruza o antimeridiano, particiona a sequência pela época de referência e localiza o ponto mais próximo do instante solicitado.

O mapa principal passou a usar o mesmo algoritmo de segmentação do Ao Vivo. Para o satélite selecionado, a linha contínua laranja representa o rastro até a época do conjunto e a linha laranja tracejada representa a previsão seguinte. Outras trilhas permanecem discretas e tracejadas. O marcador do mapa principal agora usa a amostra mais próxima da época do conjunto, em vez de apontar para o pico futuro da passagem. O Rastreador continua usando o índice do slider, e Ao Vivo continua usando a época corrente calculada por SGP4.

O mapa Ao Vivo mantém sua amostragem de 30 segundos e a separação entre trecho já percorrido e trecho futuro. A diferença entre as telas é somente a fonte temporal: dataset gerado para o mapa/Rastreador e propagação atualizada para Ao Vivo. A segmentação geográfica é compartilhada.

## Arquivos modificados

- `web/assets/trajectory.mjs`: componente compartilhado de trajetória.
- `web/assets/live-orbit-math.mjs`: reexporta a segmentação compartilhada e mantém as regras de frescor.
- `web/assets/app.js`: usa o componente comum, desenha passado/futuro e sincroniza o marcador com a época do dataset.
- `web/assets/live-orbit.js`: permanece com amostragem SGP4 de 30 segundos e usa a segmentação comum.
- `web/index.html`: legenda e nota científica distinguem rastro, previsão, ground track e Ao Vivo.
- `web/assets/app.css`: estilo da linha futura.
- `scripts/test_trajectory.mjs`: testes controlados adicionais.

## Testes executados

Foram executados os testes do antimeridiano, passagem próxima aos polos, mudança de hemisfério, sanitização de longitude, partição temporal, ponto mais próximo para sincronização e continuidade dos segmentos. Também passaram os testes existentes de trilha Ao Vivo, frescor OMM, paridade satellite.js/Skyfield e a suíte Python completa.

O build Vercel continua gerando a saída pública, sem dependência de WebGL ou de GPU. A cartografia permanece Leaflet padrão com OpenStreetMap inicial e Esri como alternativa.

## Resultado visual esperado

A experiência deve apresentar a trajetória como parte do mapa: sem diagonais artificiais no cruzamento do antimeridiano, com rastro e previsão visualmente distinguíveis, marcador coerente com o instante indicado e mesma regra de segmentação no Mapa e no Ao Vivo. A trilha terrestre continua sendo uma projeção geográfica; não é confundida com a órbita tridimensional nem com telemetria direta.
