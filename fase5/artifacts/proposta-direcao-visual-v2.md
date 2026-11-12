# Proposta de nova direção visual — GeoPass

**Status: proposta para aprovação.** Esta rodada não altera a aplicação. O redesign atual permanece como está enquanto a nova direção não for aprovada.

## Direção: Atlas de Passagens

Proponho tratar o GeoPass como um **atlas científico de observação orbital**: uma folha cartográfica de trabalho, não um painel administrativo nem um console sci-fi. A referência é a linguagem editorial de mapas de campo e publicações científicas — margens, índices, escalas tipográficas e anotação precisa — traduzida para uma ferramenta WebGIS interativa.

A proposta é intencionalmente oposta à versão atual: sai o fundo azul-escuro, o ciano luminoso, a grade de cartões arredondados e os indicadores decorativos. Entram uma superfície clara de papel mineral, tinta escura, separadores finos, tipografia editorial e uma cor de sinal usada com parcimônia.

## O que as referências informam

O NASA Worldview mantém a exploração geográfica e temporal no centro: seu produto permite navegar, comparar e animar camadas de dados de satélite. Para o GeoPass, isso inspira a relação direta entre mapa e tempo, sem copiar a aparência nem adicionar camadas de dados.[1]

A documentação do Copernicus Browser descreve uma composição que separa controles de busca, mapa e ferramentas laterais. Isso oferece uma referência útil para organizar local, parâmetros e leitura cartográfica sem transformar cada informação em um cartão.[2]

O QGIS documenta o canvas do mapa, painéis de trabalho e uma barra de estado com coordenadas e escala. A proposta aproveita essa lógica de informação técnica alinhada e contextual ao mapa, mas numa interface mais enxuta e editorial.[3]

O NASA Eyes demonstra como apresentar exploração orbital com contexto temporal. O GeoPass continuará sendo 2D e baseado nos dados e simulações que já possui; não será apresentado como rastreamento ao vivo nem receberá um globo 3D.[4]

## Composição proposta

**Masthead de atlas.** Uma faixa superior baixa, em papel claro, com o nome GeoPass como wordmark editorial, a identificação do capstone e navegação por seções em forma de índice — `01 Mapa`, `02 Passagens`, `03 Rastreador`, `04 ESP32`, `05 Método`. Sem selo luminoso de status nem hero de landing page.

**Linha de localização.** A busca já existente ganha tratamento de instrumento cartográfico: campo amplo, rótulo curto, botão em cor de sinal e resultado alinhado à coordenada/localidade. A seleção de local e o cálculo continuam sendo as mesmas ações, nos mesmos controles.

**Mesa cartográfica assimétrica.** O mapa Leaflet permanece como a maior área da tela. À esquerda fica uma coluna estreita e tipográfica para localidade, fuso e seleção dos satélites. À direita, as passagens aparecem como um livro-razão vertical: horários alinhados em colunas, máximo de elevação e azimute destacados por hierarquia tipográfica, sem cartões individuais. O mapa não será substituído nem ganhará outra fonte de tiles.

**Régua temporal.** Abaixo do mapa, os controles existentes do rastreador ficam numa faixa contínua de tempo. O seletor, slider, reproduzir, rota completa e retorno ao observador conservam os mesmos IDs, eventos e funções.

**Notas de campo.** O status de conexão ESP32 e as notas de método aparecem como blocos editoriais menores, com regras finas e texto legível, preservando todos os avisos e estados já existentes. Nenhum novo estado será simulado.

Esboço de desktop:

```text
┌ GeoPass / índice de seções / identificação do projeto ────────────────┐
├ Buscar local / selecionar resultado / calcular ───────────────────────┤
│ parâmetros e satélites │             MAPA             │ livro de passagens │
│ coluna de observação   │     área principal ampla     │ horários / dados   │
│                        ├───────────────────────────────┤                   │
│                        │ régua e controles temporais   │ ESP32 / notas      │
└────────────────────────┴───────────────────────────────┴───────────────────┘
```

Em celular, a ordem será: masthead e busca, mapa, passagens, parâmetros e rastreador, depois ESP32 e método. A disposição vira uma sequência editorial de seções, não uma miniatura apertada do desktop. Os controles continuam acessíveis sem acrescentar novos fluxos.

## Linguagem visual

- **Superfície:** papel marfim mineral `#F1EEE5`, com áreas secundárias em cinza-pedra `#E4E0D5`.
- **Tinta:** grafite esverdeado `#202A28` para texto e linhas principais; cinza ardósia `#69736D` para informação secundária.
- **Cor de sinal GeoPass:** vermelhão mineral `#B84F37`, reservado à trilha selecionada, ao ponto de observação e à ação primária.
- **Apoios:** verde cartográfico profundo `#35584D` e ocre de arquivo `#A88447`, usados só quando houver significado visual.
- **Tipografia:** serif de sistema como Georgia para títulos editoriais; sans-serif de sistema para controles; monoespaçada de sistema para horários, coordenadas e identificadores. Sem fontes remotas ou novas dependências.
- **Motivos:** numeração de fólio, marcas de coordenadas nas margens, linhas de régua e um símbolo orbital reinterpretado como traço de mapa e ponto sub-satélite.
- **Forma:** cantos predominantemente retos, sem brilho, sem gradientes decorativos e sem cartões repetidos. Hierarquia construída por escala, alinhamento, espaços em branco e regras.
- **Movimento:** nenhuma pulsação decorativa. Só transições discretas de foco/seleção; a animação existente de reprodução da simulação permanece igual e respeita a preferência por movimento reduzido.

## Limites técnicos e funcionais

Esta proposta usa somente a camada visual já aceita: HTML, CSS e os ajustes estritamente necessários de apresentação no JavaScript da interface. Mantém o suporte já aceito para `/assets/`, manifesto e cópia dos arquivos de apresentação para `public/`. Não propõe mudanças adicionais em Flask, build, endpoints, datasets, contratos de API, CelesTrak, Nominatim, Skyfield/SGP4, cálculos, filtros, simulação, Web Serial, ACK ou firmware ESP32. Não adiciona fonte de mapa, biblioteca, serviço, dependência ou funcionalidade.

## Referências

[1]: https://www.earthdata.nasa.gov/data/tools/worldview "NASA Worldview — visualização de dados de satélite"
[2]: https://documentation.dataspace.copernicus.eu/Applications/Browser.html "Copernicus Browser — documentação da interface"
[3]: https://docs.qgis.org/latest/en/docs/user_manual/introduction/qgis_gui.html "QGIS — canvas, painéis e barra de estado"
[4]: https://science.nasa.gov/eyes/ "NASA Eyes — visualizações interativas e temporais"
