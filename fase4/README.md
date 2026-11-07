# GeoPass — Fase 4: integração serial local com ESP32

## Sobre o Space Tech Bootcamp

O GeoPass é o projeto de capstone do **Future Tech Leaders Brasil 2026 — Space Tech Bootcamp**, iniciativa de capacitação online e gratuita em tecnologias espaciais realizada no Brasil pela Agência Espacial Brasileira (AEB), pelo PNUD, pelo UNDP ICPSD e pelo SDG AI Lab. O [e-book oficial do programa](https://github.com/ftl-brazil-2026/ebook) reúne o currículo de GIS e sensoriamento remoto, Machine Learning, Deep Learning e aplicações espaciais. A [apresentação da AEB](https://www.gov.br/aeb/pt-br/assuntos/noticias/inscricoes-abertas-para-o-bootcamp-de-tecnologias-espaciais-do-future-tech-leaders-programme) traz informações institucionais sobre o bootcamp.

## O que esta fase acrescenta

A Fase 4 mantém o mapa, a busca geográfica, o cálculo de passagens e a simulação da trilha terrestre. A novidade é uma integração experimental com um microcontrolador ESP32 conectado por USB/serial:

1. A pessoa seleciona uma passagem na interface e escolhe uma porta serial.
2. O servidor Flask local formata e envia uma linha com o identificador do satélite, início, pico, fim e elevação máxima.
3. O firmware no ESP32 valida a versão do protocolo e os campos recebidos, imprime os dados no Monitor Serial e responde com uma confirmação `ACK`.

O protocolo é `NEXT|1|<NORAD>|<início UTC>|<pico UTC>|<fim UTC>|<elevação máxima>`; a confirmação esperada é `ACK|1|<NORAD>|OK`. Mensagens inválidas recebem uma resposta `ERR`.

## Validação

O firmware foi compilado e carregado durante o desenvolvimento em uma placa ESP32-WROOM-32D DevKitC. Nos registros de teste compartilhados, a inicialização mostrou `READY|GEOPASS1` e um envio pela porta COM3 recebeu `ACK|1|25544|OK`.

A suíte automatizada inclui **20 testes** para o motor orbital, as rotas de API e a formatação/validação do protocolo. Os testes de serial simulam a porta e não substituem um ensaio físico; a confirmação física acima foi observada no hardware.

## Executar no Windows PowerShell

Extraia o repositório e entre nesta pasta. Substitua o caminho de exemplo pelo local da sua cópia:

```powershell
Set-Location -LiteralPath "C:\caminho\para\GeoPass\fase4"
py --version
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Rode os testes:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Gere ou atualize os dados orbitais e as trilhas:

```powershell
.\.venv\Scripts\python.exe scripts\build_dataset.py
```

Para iniciar a aplicação local:

```powershell
.\.venv\Scripts\python.exe server.py
```

Mantenha o terminal aberto e acesse <http://127.0.0.1:8000/>. A lista de portas usa `pySerial`; conecte a placa antes de atualizar as portas. Feche o Monitor Serial do PlatformIO ou da Arduino IDE antes de enviar pela aplicação, pois a porta serial normalmente só pode ser aberta por um programa de cada vez. A abertura da porta pode reiniciar algumas placas ESP32.

## Compilar e carregar o firmware

Abra a subpasta `esp32/` no VS Code com a extensão PlatformIO. O arquivo `platformio.ini` configura o alvo `esp32dev`, o framework Arduino e a velocidade serial de 115200 baud. Use **Build** para compilar, **Upload** para gravar e **Monitor** a 115200 baud para acompanhar as mensagens.

`esp32dev` é uma configuração genérica para ESP32 clássico. Confirme o modelo da placa e a porta antes de gravar. O projeto foi usado com um ESP32-WROOM-32D DevKitC; um módulo ESP32 sem placa de desenvolvimento pode exigir conversor USB-UART, circuito de boot/reset e alimentação regulada de 3,3 V. Não aplique 5 V diretamente aos pinos RX/TX ou 3V3 do módulo.

## Escopo e limitações

Nesta fase, o ESP32 **não calcula órbitas**: o computador executa o GeoPass e envia um resumo de uma passagem escolhido pela pessoa. O firmware confirma a recepção e imprime os campos no Monitor Serial; ele não aciona LED, buzzer, display OLED ou outros pinos GPIO. O envio não é automático nem em segundo plano.

Esta versão usa **pySerial no servidor Flask local**. Portanto, o computador conectado à placa deve executar o servidor e ter acesso à porta serial. Esta etapa não implementa Web Serial no navegador e não dá a um site hospedado no Vercel acesso à USB do visitante. Essas limitações pertencem ao escopo da etapa local; o suporte Web Serial é uma evolução posterior.

As passagens continuam sendo geométricas, não uma garantia de visibilidade. A trilha orbital permanece uma simulação pré-calculada, não um rastreamento ao vivo.

## Estrutura da Fase 4

```text
server.py                   aplicação local, API de cálculo e endpoints seriais
scripts/esp32_serial.py     formatação da mensagem NEXT e validação do ACK
scripts/build_dataset.py    obtenção de OMM, passagens e trilhas
esp32/platformio.ini        alvo e parâmetros do PlatformIO
esp32/src/main.cpp          receptor serial para ESP32
web/index.html              mapa, busca, rastreador e controles de envio
tests/test_api.py           testes das rotas e chamadas seriais simuladas
tests/test_esp32_serial.py  testes do protocolo NEXT/ACK
tests/test_core.py          testes do agrupamento de eventos orbitais
```

## Referências técnicas

- [Skyfield — Earth satellites](https://rhodesmill.org/skyfield/earth-satellites.html)
- [CelesTrak — GP data formats](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- [PlatformIO — Espressif 32](https://docs.platformio.org/en/latest/platforms/espressif32.html)
- [Nominatim — política de uso](https://operations.osmfoundation.org/policies/nominatim/)

## Autor

**Luiz Gustavo de Barros e Silva Santos**  
Future Tech Leaders Brasil — Space Tech Bootcamp 2026.
