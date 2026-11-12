# GeoPass — avaliação de camadas cartográficas

**Consulta:** 8 e 10 de novembro de 2026. **Finalidade:** selecionar uma base compatível com a referência escura Scientific Atlas sem cobrança não autorizada, credenciais ou backend cartográfico.

## Recomendação

Usar **Esri World Imagery** como camada inicial de imagem terrestre e manter **OpenStreetMap** como alternativa de ruas. Sobre a imagem, usar o overlay transparente **World Boundaries and Places** apenas para limites administrativos e nomes de lugares. A troca é feita pelo cliente Leaflet, sem novo endpoint Flask, chave de API, integração paga ou alteração do deploy Vercel.

O endpoint público de imagem respondeu `HTTP 200` a uma requisição pontual de tile e declarou `image/jpeg`; o tile padrão OSM respondeu `HTTP 200` (`image/png`). A metadata REST do overlay World Boundaries and Places respondeu e anuncia cache tiled PNG32. Essas verificações comprovam disponibilidade no momento da consulta, não garantem uptime futuro ou comportamento idêntico em todos os ambientes.

## Condições e limites

- A ficha oficial do World Imagery descreve cobertura mundial, com imagens de resolução igual ou melhor que 1 m em grande parte das áreas terrestres e imagens de resolução menor em escala mundial. A resolução e a data variam por local/zoom; não se deve prometer detalhe ou atualização uniforme [2].
- A metadata do serviço World Imagery declara os créditos **“Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community”**. A interface mantém a atribuição visível no próprio mapa, junto à base, e linka Esri; a Esri recomenda que créditos não sejam ocultados [3].
- Os termos gerais Esri permitem uso externo não comercial sem cobrança, exigem atribuição e alertam que o conteúdo de terceiros pode ter termos adicionais. Isso não equivale a licença aberta irrestrita. Manter as camadas somente na demonstração acadêmica gratuita e não comercial; verificar restrições antes de uso comercial, redistribuição ou tráfego elevado [1].
- O serviço oficial **World Boundaries and Places** inclui fronteiras de países, limites administrativos de primeiro nível e nomes de lugares. Sua documentação diz que foi desenhado para sobreposição sobre imagens. A metadata REST declara `PNG32`, tiles, e o crédito **“Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community”** [9] [10].
- Limitação material: a documentação oficial marca World Boundaries and Places como **“mature support”** e **“retiring”**, e informa que é sua última atualização. O próprio serviço observa que o alinhamento de fronteiras representa dados de fornecedores e não constitui validação/endorso de autoridade governamental. É adequado como referência cartográfica visual do protótipo, não como fonte oficial para análise de fronteiras ou uso duradouro; essa limitação precisa constar na entrega [9] [11].
- A ficha Esri `World Imagery with Labels` confirma a existência de um híbrido que sobrepõe a imagem com limites políticos, estradas e rótulos. A proposta da prévia usa a camada de referência separada para manter controle transparente do overlay e seus créditos [12].
- NASA GIBS oferece WMTS/WMS/TWMS/TMS públicos para muitos produtos de observação da Terra. Cada produto tem projeção, escala, resolução e data próprias; GIBS não substitui automaticamente uma base de imagem detalhada de ruas/cidades [4] [5].
- MapTiler Free é condicionado a uso não comercial/pesquisa e desenvolvimento, exige chave própria e tem quotas. Os planos pagos têm condições distintas; não é necessário introduzir conta, chave ou cobrança no GeoPass [6] [7].
- OSM fornece uma camada de ruas, não uma base de satélite. A política oficial exige a URL canônica `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, crédito visível, requisições normais apenas para a área visível, respeito ao cache e Referer válido; proíbe pré-download/scraping e avisa que o serviço comunitário é best-effort [8]. A configuração atual usa a URL HTTPS canônica.
- As requisições de tiles ocorrem diretamente do navegador para os fornecedores. Isso é compatível com o serving estático e com Vercel, pois não exige um processo persistente nem filesystem serverless. A disponibilidade, os termos e quaisquer quotas do provedor continuam independentes da Vercel.

## Decisão para a prévia

1. `Imagem de satélite`: Esri World Imagery, com créditos da metadata visíveis.
2. `Limites e rótulos`: World Boundaries and Places como overlay transparente, com crédito separado e a ressalva de suporte em retirada.
3. `Mapa de ruas`: OpenStreetMap, com `© OpenStreetMap contributors` e link de licença.
4. Sem scraping, pré-carga de tiles, proxy de mapa, novo endpoint de negócio, serviço pago ou chave de provedor.
5. Atribuições ficam visíveis em desktop e mobile; não são escondidas sob painéis.
6. O overlay não altera CelesTrak, Nominatim, OMM/SGP4, passagens, tracker, Web Serial ou firmware.

## Referências

[1]: https://www.esri.com/en-us/legal/terms/web-site-service "Esri Web Site and Service Terms of Use"
[2]: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9 "ArcGIS World Imagery"
[3]: https://developers.arcgis.com/documentation/esri-and-data-attribution/interactive-maps/ "Esri and data attribution — Interactive maps"
[4]: https://nasa-gibs.github.io/gibs-api-docs/access-basics/ "NASA Global Imagery Browse Services — Access Basics"
[5]: https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api "NASA GIBS API"
[6]: https://www.maptiler.com/terms/cloud/ "MapTiler Cloud Terms and Conditions"
[7]: https://www.maptiler.com/cloud/pricing/ "MapTiler Cloud pricing"
[8]: https://operations.osmfoundation.org/policies/tiles/ "OpenStreetMap tile usage policy"
[9]: https://doc.arcgis.com/en/data-appliance/2022/maps/world-boundaries-places.htm "World Boundaries and Places — ArcGIS Data Appliance"
[10]: https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer?f=pjson "ArcGIS REST metadata — World Boundaries and Places"
[11]: https://goto.arcgisonline.com/maps/Reference/World_Boundaries_and_Places "World Boundaries and Places — ArcGIS Online"
[12]: https://www.arcgis.com/home/item.html?id=ffd0d1cf28134459af8870ff1f5fe20e "World Imagery with Labels — ArcGIS Online"
