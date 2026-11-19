# Auditoria e reconstrução cartográfica

## Problemas identificados

As capturas mostravam quatro problemas principais: áreas cinzas ou mensagens de indisponibilidade nos extremos do mapa; mapa principal menor do que deveria; painel de próximas passagens e legenda cobrindo a superfície cartográfica; e linguagem diferente entre Mapa e Ao Vivo.

## Causas técnicas

Os testes HTTP dos provedores retornaram tiles válidos: OpenStreetMap respondeu 200 com PNG e Esri World Imagery respondeu 200 com JPEG. Portanto, a causa não era uma URL morta. O problema vinha da combinação entre um viewport que podia ficar maior do que a largura do mundo no nível de zoom disponível, a repetição horizontal do mapa e a composição com painéis grandes sobre a camada cartográfica.

O mapa principal usava sidebar fixa de até 297 px e um painel de passagens absoluto de até 297 px. Ao Vivo usava uma coluna lateral de 340 px, altura mínima própria e configuração diferente de zoom e world wrap. Isso fazia as duas páginas parecerem aplicações distintas e reduzia o protagonismo do mapa.

## Soluções implementadas

A superfície cartográfica passou a usar OSM como camada inicial tanto no Mapa quanto em Ao Vivo. Esri permanece como alternativa explícita. O wrap de tiles é mantido apenas para preencher as bordas em zooms permitidos, sem repetição de mundos inteiros: o zoom mínimo foi elevado para 4, mantendo a largura do viewport menor que a largura de um mundo renderizado nas resoluções-alvo. Isso também permite centralizar corretamente a ISS perto do antimeridiano, sem áreas cinzas.

A grade do Mapa foi reconstruída para uma sidebar mais estreita e uma área cartográfica dominante. O painel de próximas passagens agora fica recolhido inicialmente; quando aberto, permanece compacto. A legenda foi reduzida e mantida na borda inferior, sem ser o elemento dominante. Ao Vivo usa a mesma linguagem de base, escala e dimensões prioritárias do mapa principal.

A reconstrução das trajetórias anterior permanece ativa: `trajectory.mjs` compartilha normalização, antimeridiano, partição passado/futuro e sincronização do marcador entre Mapa e Ao Vivo.

## Arquivos alterados

- `web/assets/app.css`: composição do mapa, dimensões, responsividade, painéis e legenda.
- `web/index.html`: OSM declarado como camada inicial, painel de passagens recolhido e rótulos coerentes.
- `web/assets/app.js`: zoom mínimo do mapa principal.
- `web/assets/live-orbit.js`: zoom mínimo e configuração cartográfica consistente no Ao Vivo.

## Validação

Foram verificados os provedores OSM e Esri por HTTP, a existência das rotas HTML/API/assets, sintaxe JavaScript, suíte Python, testes de trajetória, antimeridiano, frescor e paridade orbital, além do build de produção Vercel.

## Limitações

Tiles são recursos externos e podem sofrer indisponibilidade, rate limit ou bloqueio de rede fora do controle do aplicativo. O sistema mantém atribuições dos provedores e não mascara falhas de dados orbitais como telemetria. Uma inspeção visual automatizada em múltiplas resoluções deve ser repetida em um navegador com viewport real após o servidor ser reiniciado, pois a captura anterior pertencia a uma instância anterior do CSS.
