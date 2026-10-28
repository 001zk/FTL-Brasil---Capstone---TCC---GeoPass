# GeoPass — MVP 1: núcleo de previsão de passagens

## Sobre o Space Tech Bootcamp

Este projeto foi desenvolvido no contexto do **Future Tech Leaders (FTL) Brasil 2026 — Space Tech Bootcamp**, iniciativa de formação em tecnologias emergentes voltada especialmente a jovens e estudantes universitários. O programa brasileiro é executado pelo PNUD e pelo SDG AI Lab em parceria com a Agência Espacial Brasileira (AEB) e as Nações Unidas. O currículo do bootcamp inclui fundamentos de GIS e sensoriamento remoto, além de módulos de Machine Learning, Deep Learning e aplicações atuais dessas tecnologias. [E-book oficial do FTL Brasil 2026](https://github.com/ftl-brazil-2026/ebook) · [Visão geral do currículo](https://github.com/ftl-brazil-2026/ebook/blob/main/course-info/general-info.md).

O **GeoPass** é o projeto de capstone apresentado neste repositório. Ele se conecta ao eixo geoespacial do bootcamp ao usar dados orbitais de satélites, cálculo temporal e cartografia para tornar passagens sobre uma localização mais fáceis de explorar.

> **Registro da primeira etapa de desenvolvimento do GeoPass.** Este MVP documenta o início do projeto: transformar elementos orbitais públicos em previsões de passagens para um local de observação. A interface cartográfica completa, o rastreamento visual e a integração com ESP32 pertencem a etapas posteriores e não fazem parte do escopo deste repositório/fase.

## Sobre o projeto

O GeoPass é um projeto de geotecnologia que busca facilitar a compreensão de quando satélites passam sobre uma localização escolhida. O MVP1 concentra-se no **núcleo de cálculo orbital**: obter elementos orbitais recentes, propagar a posição do satélite ao longo do tempo e identificar intervalos em que ele supera um limite mínimo de elevação para o observador.

A pergunta que orienta esta primeira versão é:

> **Em que horários um satélite selecionado passa acima do horizonte de um local de observação?**

O resultado é uma previsão geométrica e temporal. Uma passagem calculada **não significa necessariamente que o satélite será visível**: a visibilidade também depende, entre outros fatores, da iluminação do satélite, da escuridão do céu, das condições atmosféricas e de obstáculos no horizonte.

## O que esta fase contempla

- Uso de elementos orbitais públicos no formato disponível para a implementação (TLE/OMM).
- Propagação orbital com **Skyfield/SGP4**.
- Cálculo dos horários de entrada, ponto de maior elevação e saída de uma passagem, conforme o limite geométrico configurado.
- Testes automatizados do agrupamento e da identificação de passagens.

O MVP1 é uma etapa inicial, não um sistema operacional de monitoramento em tempo real. As previsões dependem da época e da qualidade dos elementos orbitais utilizados.

## Tecnologias

- Python
- [Skyfield](https://rhodesmill.org/skyfield/) e SGP4
- Dados orbitais públicos do [CelesTrak](https://celestrak.org/)
- `unittest` para testes automatizados

## Como executar

Os comandos abaixo são para Windows PowerShell. Abra o terminal na pasta do repositório.

### 1. Criar e ativar um ambiente virtual

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Se o PowerShell bloquear a ativação, permita scripts apenas nesta janela e tente novamente:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### 2. Instalar as dependências

```powershell
py -m pip install -r requirements.txt
```

### 3. Rodar os testes

```powershell
py -m unittest discover -s tests -v
```

Os testes cobrem a lógica central de agrupamento dos eventos de passagem, inclusive passagens completas e casos que não devem ser publicados como resultados válidos.

### 4. Atualizar os dados e executar o MVP

Se o repositório desta fase incluir o script de preparação do conjunto de dados, execute:

```powershell
py scripts\build_dataset.py
```

A interface/forma de consulta depende dos arquivos efetivamente presentes nesta versão do MVP1. Esta fase deve ser entendida como o primeiro protótipo do motor de previsão; as funcionalidades de consulta dinâmica e mapa foram evoluídas nas etapas seguintes.

## Como interpretar uma previsão

- **Início e fim:** intervalo durante o qual o satélite ultrapassa o limite mínimo de elevação configurado.
- **Maior elevação:** ponto de maior altitude angular do satélite em relação ao horizonte do observador.
- **Azimute:** direção horizontal do satélite, expressa em graus a partir do norte.
- **Época dos elementos:** instante ao qual os elementos orbitais se referem. Elementos mais antigos tendem a produzir previsões menos confiáveis.

Os horários devem ser interpretados no fuso indicado pela implementação; internamente, cálculos orbitais são normalmente conduzidos em UTC.

## Limitações do MVP1

- Escopo voltado ao cálculo, ainda sem a experiência cartográfica completa das versões posteriores.
- Precisão limitada pela qualidade e idade dos elementos orbitais e pelas escolhas de amostragem e limite de elevação.
- Não calcula, nesta fase, garantia de visibilidade visual, magnitude aparente ou condições meteorológicas.
- Não inclui integração com ESP32 nem tela OLED; o hardware foi incorporado em etapas posteriores do projeto.

## Evolução do GeoPass

O MVP1 registra a base de cálculo. Nas fases seguintes, o projeto evoluiu para uma interface WebGIS com seleção de local e visualização de trilhas, simulação do movimento, comunicação serial com ESP32 e preparação para implantação web. Este repositório/fase preserva o estágio inicial para permitir acompanhar essa evolução.

## Fontes

- [CelesTrak — Satellite Catalogs](https://celestrak.org/)
- [Skyfield documentation](https://rhodesmill.org/skyfield/)
- Vallado, D. A. et al. *Revisiting Space-Track Report #3*. AIAA/AAS Astrodynamics Specialist Conference, 2006. [DOI: 10.2514/6.2006-6753](https://doi.org/10.2514/6.2006-6753).

## Autor

**Luiz Gustavo de Barros e Silva Santos**  
Projeto desenvolvido no contexto do **Future Tech Leaders Brasil — Space Tech Bootcamp**.
