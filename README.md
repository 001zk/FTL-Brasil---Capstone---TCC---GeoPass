# GeoPass — MVP 1

## Sobre o Space Tech Bootcamp

Este projeto foi desenvolvido no contexto do **Future Tech Leaders (FTL) Brasil 2026 — Space Tech Bootcamp**, iniciativa de formação em tecnologias emergentes voltada especialmente a jovens e estudantes universitários. O programa brasileiro é executado pelo PNUD e pelo SDG AI Lab em parceria com a Agência Espacial Brasileira (AEB) e as Nações Unidas. O currículo inclui fundamentos de GIS e sensoriamento remoto, além de módulos de Machine Learning, Deep Learning e aplicações atuais dessas tecnologias. [E-book oficial do FTL Brasil 2026](https://github.com/ftl-brazil-2026/ebook) · [Visão geral do currículo](https://github.com/ftl-brazil-2026/ebook/blob/main/course-info/general-info.md).

O **GeoPass** é o projeto de capstone desenvolvido nesse contexto. Ele se conecta ao eixo geoespacial do bootcamp ao transformar dados orbitais públicos em previsões por local e apresentá-las em um mapa web.

## Sobre este MVP

O MVP1 é um protótipo local de consulta cartográfica de passagens de satélites. Um script Python obtém elementos orbitais públicos da CelesTrak no formato OMM, calcula as passagens para as localidades configuradas e grava os resultados em JSON. A página web lê esse conjunto pré-calculado e apresenta as passagens e as projeções terrestres dos satélites em um mapa interativo.

Nesta versão, é possível selecionar uma das localidades de demonstração, filtrar os satélites mostrados, explorar suas trilhas sobre a Terra e consultar os horários previstos de início, ponto de maior elevação e fim, além da elevação e do azimute no ponto máximo.

> Uma passagem geométrica ocorre quando o satélite supera o limite de elevação configurado em relação ao observador. Isso não garante visibilidade a olho nu: iluminação, condições do céu e obstáculos locais também influenciam.

## Tecnologias

- Python e [Skyfield](https://rhodesmill.org/skyfield/), com propagação SGP4.
- OMM em JSON obtido da [CelesTrak](https://celestrak.org/).
- HTML, CSS, JavaScript e [Leaflet](https://leafletjs.com/) para a interface e o mapa.
- Cartografia-base do [OpenStreetMap](https://www.openstreetmap.org/).
- `unittest` para os testes automatizados do núcleo.

## Como executar no Windows PowerShell

Extraia o ZIP e abra o PowerShell na pasta `geopass-mvp`. Se o caminho tiver espaços, use `Set-Location -LiteralPath`:

```powershell
Set-Location -LiteralPath "C:\caminho\para\geopass-mvp"
py --version
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
```

Se o PowerShell bloquear a ativação do ambiente virtual, permita scripts apenas nesta janela e tente novamente:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Rode os testes:

```powershell
py -m unittest discover -s tests -v
```

Gere ou atualize os dados de previsão:

```powershell
py scripts\build_dataset.py
```

O script consulta a CelesTrak e cria `data\passes.json`, que é usado pelo mapa. Para atualizar os elementos orbitais mesmo se houver um cache recente, use:

```powershell
py scripts\build_dataset.py --refresh
```

Mantenha o terminal na raiz do projeto e inicie um servidor local:

```powershell
py -m http.server 8000
```

Abra <http://localhost:8000/web/> no navegador. A página precisa de internet para carregar os tiles do mapa e as bibliotecas Leaflet hospedadas em CDN. Encerre o servidor com `Ctrl+C`.

## Estrutura do projeto

```text
config.json                 localidades e parâmetros de cálculo
requirements.txt            dependência Python
scripts/build_dataset.py    consulta OMM, calcula previsões e gera JSON
scripts/geopass_core.py     agrupamento dos eventos rise/culminate/set
web/index.html              mapa, filtros e cartões de passagem
tests/test_core.py          testes unitários do agrupamento
data/README.txt             explicação dos arquivos gerados
```

Os arquivos `data/source_omm.json` e `data/passes.json` são gerados localmente e ignorados pelo Git. Por isso, após clonar ou baixar o repositório, execute `py scripts\build_dataset.py` antes de abrir o mapa.

## Limites desta etapa

- As previsões são pré-calculadas localmente para a janela e as localidades definidas em `config.json`; o navegador não consulta a CelesTrak diretamente.
- O grupo orbital padrão é `STATIONS`; os filtros do mapa mostram os satélites incluídos no conjunto gerado.
- O limite geométrico padrão é 10°, e os pontos da trilha são amostrados no intervalo configurado. Esses valores influenciam o que aparece no mapa.
- A precisão depende da época e da qualidade dos elementos orbitais. O projeto exibe a época usada para contextualizar cada previsão.
- O mapa mostra a projeção do satélite sobre o solo; não representa a trajetória aparente no céu nem condições completas de visibilidade.
- Este MVP não inclui comunicação com ESP32, OLED, busca dinâmica de cidades ou implantação automatizada. Esses itens pertencem a etapas posteriores do GeoPass.

## Referências técnicas

- [Skyfield — Earth satellites](https://rhodesmill.org/skyfield/earth-satellites.html)
- [CelesTrak — GP element formats](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- Vallado, D. A. et al. *Revisiting Space-Track Report #3*. AIAA/AAS Astrodynamics Specialist Conference, 2006. [DOI 10.2514/6.2006-6753](https://doi.org/10.2514/6.2006-6753).

## Autor

**Luiz Gustavo de Barros e Silva Santos**  
Projeto de capstone do **Future Tech Leaders Brasil — Space Tech Bootcamp 2026**.
