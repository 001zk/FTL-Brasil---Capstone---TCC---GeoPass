# GeoPass ESP32 — projeto PlatformIO (Fase 04)

Esta pasta contém um projeto PlatformIO independente:

- `platformio.ini`: plataforma Espressif 32, framework Arduino, velocidade serial de 115200.
- `src/main.cpp`: receptor do comando `NEXT|1|<NORAD>|<início UTC>|<pico UTC>|<fim UTC>|<elevação>`; imprime `PASSAGEM|...` e responde `ACK|1|<NORAD>|OK`.

## Alvo selecionado

O ambiente inicial é `board = esp32dev`, apropriado como **padrão provisório para o ESP32 clássico**, por exemplo algumas placas ESP32 Dev Module/WROOM-32. O rótulo “ESP32-D puro” não identifica com certeza o módulo nem a placa de desenvolvimento. Se o hardware for ESP32-S2, S3, C3 ou outra variante, será necessário alterar o `board` antes de compilar/gravar.

## Abrir no VS Code

Abra **esta pasta `esp32`**, que contém `platformio.ini`, no VS Code com a extensão PlatformIO instalada. O arquivo `.code-workspace` na pasta pai pode continuar como está; ele apenas aponta para `.` e não substitui a configuração do PlatformIO.

Na barra inferior do PlatformIO:

1. Clique em **Build** (ícone de check) para compilar.
2. Só depois de confirmar placa, interface USB-UART e alimentação, escolha a porta e clique em **Upload** (seta).
3. Para observar saída, use **Monitor** e velocidade **115200**.

Também é possível executar no terminal do PlatformIO Core: `pio run`, `pio run -t upload` e `pio device monitor -b 115200`.

## Segurança de hardware

O firmware não usa pinos de entrada/saída. Portanto, o primeiro teste de hardware é apenas comunicação serial. Um **módulo ESP32 nu não é necessariamente uma placa USB**: pode exigir conversor USB-UART, circuito de boot/reset e alimentação regulada de 3,3 V. Não conecte 5 V aos pinos RX/TX ou 3V3 do módulo. Confirme o código impresso dos dois lados e o adaptador antes de fazer ligações; não use `Upload` até selecionar o alvo e a porta corretos.

O GeoPass envia o aviso ao abrir a porta; algumas placas reiniciam nessa abertura. Feche o Monitor Serial antes de clicar **Enviar resumo ao ESP32** no navegador, pois a porta serial normalmente não pode ser usada por dois programas ao mesmo tempo.
