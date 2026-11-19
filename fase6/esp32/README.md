# Firmware ESP32 — GeoPass Fase 5

Esta pasta contém o firmware serial do receptor GeoPass:

- `platformio.ini` configura o ambiente `esp32dev`, framework Arduino e serial a 115200 baud.
- `src/main.cpp` é o arquivo compilado pelo PlatformIO.
- `geopass_receiver.ino` contém uma cópia do firmware para quem preferir a Arduino IDE; mantenha ambos sincronizados se alterar o protocolo.

## Compilar e carregar

Abra a pasta `fase5/esp32` no VS Code com a extensão PlatformIO. Use **Build** para compilar, **Upload** para gravar e **Monitor** a 115200 baud para observar as mensagens.

O alvo `esp32dev` é uma configuração genérica para ESP32 clássico. A placa testada durante o desenvolvimento foi uma ESP32-WROOM-32D DevKitC. Confirme a placa e a porta antes de gravar; um módulo ESP32 sem placa de desenvolvimento pode precisar de conversor USB-UART, circuito de boot/reset e alimentação regulada de 3,3 V. Não conecte 5 V diretamente aos pinos RX/TX ou 3V3 do módulo.

## Comunicação

O firmware anuncia `READY|GEOPASS1` na inicialização. A aplicação envia `NEXT|1|<NORAD>|<início UTC>|<pico UTC>|<fim UTC>|<elevação máxima>` pela Web Serial e espera `ACK|1|<NORAD>|OK`. Em caso de mensagem inválida, o firmware responde com `ERR|1|<motivo>`.

Feche o Monitor Serial antes de conectar pelo navegador: duas aplicações não podem manter a mesma porta aberta ao mesmo tempo. A abertura da porta pode reiniciar algumas placas; conecte e aguarde a inicialização antes de enviar um resumo.

## Escopo

O firmware valida e imprime no Monitor Serial os campos recebidos e confirma a recepção. Não calcula órbitas e não controla display, LED, buzzer ou outros GPIO nesta versão.
