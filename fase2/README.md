# GeoPass — Fase 2: consulta geográfica e cálculo dinâmico

## Sobre o Space Tech Bootcamp

Este projeto foi desenvolvido no contexto do **Future Tech Leaders (FTL) Brasil 2026 — Space Tech Bootcamp**, iniciativa de formação em tecnologias emergentes voltada especialmente a jovens e estudantes universitários. O programa brasileiro é executado pelo PNUD e pelo SDG AI Lab em parceria com a Agência Espacial Brasileira (AEB) e as Nações Unidas. O currículo inclui fundamentos de GIS e sensoriamento remoto, além de módulos de Machine Learning, Deep Learning e aplicações atuais dessas tecnologias. [E-book oficial do FTL Brasil 2026](https://github.com/ftl-brazil-2026/ebook) · [Visão geral do currículo](https://github.com/ftl-brazil-2026/ebook/blob/main/course-info/general-info.md).

O **GeoPass** é o projeto de capstone desenvolvido nesse contexto. Ele relaciona dados orbitais públicos a lugares na Terra e apresenta previsões temporais em um mapa web.

## O que esta fase acrescenta

A Fase 2 evolui o mapa e o motor de cálculo do MVP1: além das localidades de demonstração, o usuário pode buscar manualmente uma cidade, escolher um resultado e calcular novas passagens para as coordenadas encontradas. Também pode clicar diretamente no mapa para consultar outro ponto. O servidor Flask recebe as coordenadas e os satélites selecionados, calcula os eventos e devolve os resultados à interface.

Os cartões apresentam horários previstos de início, ponto de maior elevação e fim, elevação máxima, azimute e época dos elementos orbitais. O horário pode ser exibido em um fuso escolhido pelo usuário. Para locais brasileiros, a aplicação sugere um fuso a partir da região, mas a sugestão deve ser conferida, sobretudo em áreas de fronteira.

O cálculo dinâmico aceita até **12 satélites por consulta**. A janela é definida em `config.json` e, nesta versão, é limitada pelo servidor a no máximo 48 horas; o padrão configurado é 24 horas. O limite geométrico padrão é 10°. As linhas do mapa são projeções terrestres pré-calculadas para o conjunto inicial — não são posições ao vivo nem a trajetória aparente no céu.

> Uma passagem geométrica acima do limiar não garante visibilidade a olho nu. Esta fase não calcula iluminação solar do satélite, condições meteorológicas ou obstáculos no horizonte.

## Tecnologias

- Python, [Skyfield](https://rhodesmill.org/skyfield/) e SGP4 para elementos orbitais OMM.
- [CelesTrak](https://celestrak.org/) para dados orbitais públicos.
- [Flask](https://flask.palletsprojects.com/) para o servidor local e as rotas da aplicação.
- [Nominatim](https://nominatim.org/) para busca manual de localidades.
- JavaScript e [Leaflet](https://leafletjs.com/) para interface e mapa.
- [OpenStreetMap](https://www.openstreetmap.org/) como cartografia-base.
- `unittest` para testes automatizados.

## Como executar no Windows PowerShell

Extraia o ZIP e abra o PowerShell na pasta do projeto. Substitua o caminho de exemplo pelo local em que extraiu a pasta:

```powershell
Set-Location -LiteralPath "C:\caminho\para\GeoPass\fase2"
py --version
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Rode os testes automatizados:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Gere ou atualize o conjunto inicial de previsões e o cache de elementos OMM:

```powershell
.\.venv\Scripts\python.exe scripts\build_dataset.py
```

Para solicitar novamente os elementos à CelesTrak, ignorando o cache existente:

```powershell
.\.venv\Scripts\python.exe scripts\build_dataset.py --refresh
```

Inicie o servidor da Fase 2:

```powershell
.\.venv\Scripts\python.exe server.py
```

Mantenha o terminal aberto e acesse <http://127.0.0.1:8000/> no navegador. Encerre o servidor com `Ctrl+C`. Não use `py -m http.server` nesta fase: a busca de cidades e o cálculo dinâmico dependem do servidor Flask.

## Como testar a Fase 2

1. Marque apenas a ISS para uma resposta mais rápida.
2. Digite uma cidade, como `Campinas, SP, Brasil`, e clique em **Buscar**. A busca é manual; não há autocomplete.
3. Selecione o resultado correto e clique em **Calcular neste local**.
4. Confira os cartões de passagem e o fuso horário; ajuste o seletor se necessário.
5. Como alternativa, clique diretamente no mapa para calcular em um ponto escolhido.
6. Selecione uma localidade de demonstração para voltar às previsões pré-calculadas do MVP1.

## Busca de localidades

A consulta de geocodificação só é enviada quando a pessoa clica em **Buscar**. A aplicação não faz autocomplete, inclui um cabeçalho identificador, observa um intervalo entre solicitações e mantém cache local em `data/geocode_cache.json`. A busca requer internet e deve respeitar a [política de uso do Nominatim](https://operations.osmfoundation.org/policies/nominatim/), que pode ser atualizada. Os resultados e o mapa devem manter a atribuição ao OpenStreetMap.

## Estrutura do projeto

```text
config.json                 localidades de demonstração e parâmetros
requirements.txt            Skyfield, Flask e tzdata
server.py                   servidor local, busca e cálculo por coordenadas
scripts/build_dataset.py    obtenção/cache de OMM e previsões iniciais
scripts/geopass_core.py     agrupamento dos eventos orbitais
tests/test_core.py          testes do agrupamento rise/culminate/set
tests/test_api.py           validação da API e cálculo por local escolhido
web/index.html              mapa, busca manual, fuso e cartões de passagem
data/README.txt             descrição dos arquivos gerados
```

Os caches e arquivos de saída em `data/` são gerados localmente e ignorados pelo Git. Depois de extrair ou clonar o repositório, execute o gerador antes de iniciar o servidor. As dependências estão listadas em `requirements.txt`; não é necessária uma chave de API.

## Limites desta fase

- O servidor é local e precisa permanecer aberto durante o uso; esta fase ainda não inclui publicação web.
- A busca depende do Nominatim e de conexão com a internet.
- O fuso sugerido é aproximado e deve ser conferido pelo usuário.
- O limite de satélites por consulta e a janela de previsão restringem o cálculo desta versão.
- As trilhas são amostras pré-calculadas da projeção sobre a Terra, não uma posição ao vivo.
- Não há integração USB/serial com ESP32 nem tela OLED nesta etapa.

## Referências técnicas

- [Skyfield — Earth satellites](https://rhodesmill.org/skyfield/earth-satellites.html)
- [CelesTrak — GP data formats](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- [Nominatim Search API](https://nominatim.org/release-docs/latest/api/Search/) e [política de uso](https://operations.osmfoundation.org/policies/nominatim/)
- [tzdata no PyPI](https://pypi.org/project/tzdata/)
- Vallado, D. A. et al. *Revisiting Space-Track Report #3*. AIAA/AAS Astrodynamics Specialist Conference, 2006. [DOI 10.2514/6.2006-6753](https://doi.org/10.2514/6.2006-6753).

## Autor

**Luiz Gustavo de Barros e Silva Santos**  
Projeto de capstone do **Future Tech Leaders Brasil — Space Tech Bootcamp 2026**.
