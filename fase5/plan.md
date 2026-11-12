# GeoPass — plano aprovado: Scientific Atlas

**Estado:** o usuário forneceu a referência visual escura e solicitou reconstrução fiel. Ela substitui integralmente a direção clara “Atlas de Passagens”. Escopo: redesenho da interface existente, sem modificar a lógica orbital, API de negócio, Web Serial, firmware ou deploy de produção.

## Auditoria técnica e limites conhecidos

O projeto está na cópia independente `/home/ubuntu/geopasspv`, derivada da Fase 5. A aplicação é Flask em `server.py`, com HTML/CSS/JavaScript em `web/`, Leaflet 1.9.4, arquivos JSON em `data/` e dependências Python. `scripts/vercel_build.py` gera `public/` copiando os arquivos de interface; `web/manus-routes.json` declara a única rota de página `/`. A configuração existente para Python/Vercel, runtime, entrypoint e estratégia de build não será alterada.

A interface atual já executa busca por texto via Nominatim, seleção de resultados, localidades predefinidas, escolha de fuso, seleção de até 12 satélites, recálculo para clique no mapa, passagens, mapa de trilhas, simulação temporal do subponto, Web Serial no navegador e ACK. Os IDs e handlers em `web/assets/app.js` são contratos a preservar.

Duas diferenças entre a imagem e o sistema atual serão tratadas sem inventar comportamento: a busca textual existente aceita cidade/local; coordenadas arbitrárias são selecionadas clicando no mapa, e não há parser de latitude/longitude no campo de busca. Também não existe filtro de intervalo de previsão: a janela real do dataset pode ser mostrada como leitura, sem fingir que é um filtro. O ícone de configurações da imagem não terá ação falsa. A aplicação não guarda histórico de comunicação ESP32; será mostrado apenas o estado real.

## Design aprovado

**Design Movement:** “GeoPass — Scientific Atlas”: console de inteligência orbital com cartografia de observação, estrutura editorial científica e acabamento institucional, reproduzindo a composição fornecida sem copiar sistemas externos.

**Princípios centrais:** o mapa terrestre real é o foco; valores operacionais vêm somente dos dados carregados; laranja, verde e cinza têm semântica única; os cinco módulos compartilham uma linguagem visual consistente.

**Color Philosophy:** carvão `#101716`, cabeçalho `#111817`, painéis `#1A211F`, painéis elevados `#222A27`, superfícies secundárias `#2B322F`, bordas `#39413D`, texto principal marfim `#E9E2D5`, secundário `#AAA99F`, técnico `#C4C0B6`, orbital laranja `#E47E51`, terracota `#B9684C`, verde geográfico `#738B72` e estado operacional `#59AC68`. O mapa não receberá uma falsa coloração: seus tons serão os da camada real, com tratamento escuro leve apenas para legibilidade.

**Layout Paradigm:** shell alto de quatro regiões no desktop: masthead de aproximadamente 100 px; busca marfim de aproximadamente 74 px com margens de 20 px; área principal de três colunas (painéis laterais de aproximadamente 297 px, mapa central de aproximadamente 1015 px e vãos de 10 px); rodapé de aproximadamente 86 px. Usar `1648 × 928` como alvo CSS e verificar também a referência anexada de `1672 × 941`. No mapa, não converter os painéis em uma pilha de cartões.

**Signature Elements:** símbolo orbital de linha clara com detalhe terracota; trajetória selecionada contínua em `#E47E51` e demais trilhas cinza tracejadas; controles cartográficos compactos sobrepostos, com coordenadas/zoom, escala dinâmica e localizador regional.

**Interaction Philosophy:** navegação por cinco áreas — Mapa, Passagens, Rastreador, ESP32 e Metodologia. Reorganizar controles existentes e adicionar apenas controles de apresentação pedidos pela referência, como visibilidade de camadas e escolha da base cartográfica. Não mudar cálculo, consulta de negócio, payload, firmware ou protocolo. Indicadores refletem estados reais; nenhum horário, posição ou ACK fictício.

**Animation:** transições curtas de seleção e troca de área; sem partículas, brilhos, halos neon ou movimento contínuo decorativo. Preservar simulação temporal existente e respeitar `prefers-reduced-motion`.

**Typography System:** serifada editorial em títulos e logotipo (`Instrument Serif`, `Source Serif 4`, `DM Serif Display`, com Georgia/serifada de sistema como fallback); sans-serif para interface (`IBM Plex Sans`, `Inter`, `Manrope`, com system sans como fallback); monoespaçada apenas em NORAD, coordenadas, datas e dados (`IBM Plex Mono`, `JetBrains Mono`, `ui-monospace`). Não introduzir um CDN de fontes.

**Brand Essence:** GeoPass organiza elementos orbitais em informação cartográfica útil a estudantes, observadores e análises de passagens; personalidade: precisa, institucional, legível. Voz: “Selecione o ponto de observação.” e “Projeção terrestre calculada — não é posição ao vivo.”

**Wordmark & Logo:** “GeoPass” serifado, acompanhando o símbolo de planeta/ponto observado atravessado por uma órbita elíptica; subtítulo “ORBITAL INTELLIGENCE”. Usar o símbolo SVG já criado no workspace quando apropriado.

**Signature Brand Color:** laranja orbital `#E47E51`, reservado à trilha selecionada, navegação ativa e estados de foco/ação.

## Implementação

1. Refazer `web/index.html` para expressar as cinco áreas e a composição do screenshot: masthead, navegação, indicadores reais, faixa de busca, mapa e painéis, além de páginas internas próprias. Preservar os IDs/campos atuais, os alvos de eventos, os rótulos funcionais, o conteúdo de status e a acessibilidade necessária ao JavaScript.
2. Refazer `web/assets/app.css` com os tokens e geometrias aprovados, incluindo desktop, tablet e celular; estilizar popups/controles Leaflet, tabelas, indicadores, estados de foco e movimento reduzido.
3. Fazer somente ajustes JavaScript de apresentação isolados em `web/assets/app.js`: navegação entre as cinco vistas; instalação/seleção da camada cartográfica no cliente Leaflet; marcadores e estilos sem alterar coordenadas; camadas visíveis; escala e leitura de mapa; localizador regional; renderização tabular dos mesmos eventos existentes. Preservar as amostras completas da simulação, o algoritmo temporal, o controle deslizante e a reprodução do Rastreador. A janela de 90 minutos e o marcador de pico na vista Mapa podem selecionar pontos já existentes para dar contexto à próxima passagem, mas não podem gerar/mutar pontos nem ser apresentados como posição ao vivo. A seleção de evento serve somente à apresentação dos mesmos objetos de passagem e ao envio já existente. Não alterar cálculo/agrupamento de eventos, APIs, protocolo, serialização, conexão ou ACK.
4. Cartografia: usar Esri World Imagery como base de imagem e manter OSM como alternativa de ruas, ambas via Leaflet no navegador e com atribuições visíveis. A avaliação de licença/disponibilidade está em `artifacts/research-map-layer.md`. É um recurso cartográfico do cliente, sem endpoint Flask, chave, cobrança ou serviço pago; revalidar a atribuição exata exibida pelo serviço. Tiles não serão pré-baixados nem raspados.
5. Não implementar parser de coordenadas no campo, filtro temporal novo, página de configurações ou histórico de telemetria, pois não existem no código atual e não pertencem à camada visual aprovada. Exibir instrução clara para escolher coordenadas pelo clique no mapa e janela temporal real do dataset como leitura.
6. Manter inalterados `server.py`, `scripts/build_dataset.py`, `scripts/geopass_core.py`, `scripts/esp32_serial.py`, `scripts/vercel_build.py`, `config.json`, os datasets versionados, `web/manus-routes.json`, runtime Python, entrypoint Vercel, dependências e firmware. `public/` continua sendo apenas saída de build; artefatos/caches locais ignorados podem ser regenerados pelo build já existente. Não migrar tecnologia, introduzir serviços pagos, banco, armazenamento externo ou processo em background.
7. Atualizar testes de interface apenas onde uma asserção visual ficou obsoleta; manter inalteradas as provas de contrato API, cálculos, fuso, protocolo e serial. Executar o build local e a suíte completa existente; validar a rota `/`, manifesto, CSS/JS/datasets, seletores/IDs preservados e renderização no Preview. Capturar cada uma das cinco áreas a `1648 × 928`, mais tablet e celular.
8. Não gerar ZIP, não publicar em produção, não alterar o GitHub do usuário e não declarar validação remota da Vercel sem deploy real. A Vercel remota permanece separada da prévia Manus.

## Estrutura de arquivos do projeto

```text
geopasspv/
├── server.py                    Flask existente; APIs e serving atuais, sem alterações
├── pyproject.toml               runtime e build Vercel existentes
├── scripts/
│   ├── build_dataset.py         OMM, Skyfield/SGP4 e geração atual dos dados
│   ├── geopass_core.py          agrupamento de eventos existente
│   ├── esp32_serial.py          protocolo serial existente
│   └── vercel_build.py          construção de public/ existente
├── web/
│   ├── index.html               shell, cinco vistas e controles semânticos
│   ├── manus-routes.json        manifesto estático da rota /
│   └── assets/
│       ├── app.css              design system, componentes e breakpoints
│       └── app.js               lógica atual, com somente novos adaptadores de apresentação
├── public/                      saída gerada do build; não editar manualmente
├── data/                        OMM, passagens e trilhas atuais; não alterar
├── tests/                       testes existentes, com ajustes apenas visuais
├── esp32/                       firmware e projeto PlatformIO; não alterar
└── artifacts/                   proposta, pesquisa cartográfica, relatório e capturas
```

## Pesquisa cartográfica usada na decisão

A camada escolhida, atribuições, termos e limitações estão documentados com fontes oficiais em [`artifacts/research-map-layer.md`](artifacts/research-map-layer.md). A decisão é usar Esri World Imagery sem conta/ação de faturamento e manter a camada OpenStreetMap como alternativa, sempre com créditos; NASA GIBS foi avaliado como opção científica aberta de resolução/produto variável, não como equivalente garantido a imagem detalhada de cidade.
