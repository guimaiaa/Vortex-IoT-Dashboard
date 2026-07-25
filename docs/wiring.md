# Pinout / Ligacoes (Wemos D1 R32)

Todos os pinos estao definidos em um unico lugar: `Firmware/include/config.h`. Se sua fiacao for diferente, ajuste as `#define` la — nao e necessario tocar em `main.cpp`.

| Componente | Pino | Observacao |
|---|---|---|
| DHT11 (dados) | GPIO 4 | resistor de pull-up de 10k entre VCC e DATA se o modulo nao tiver um embutido |
| LDR (saida analogica) | GPIO 34 | pino somente-entrada, ideal para ADC; usar divisor de tensao LDR + resistor |
| LED onboard | GPIO 2 | LED ja embutido na placa Wemos D1 R32 — nao ha LED externo neste projeto, entao nao ha fiacao aqui |
| Buzzer | GPIO 26 | buzzer passivo (usa `tone()`); se for ativo, funciona igual mas sem controle de frequencia |
| Joystick (5 botoes) | GPIO 36 (VP) | um unico pino analogico (ADC1); modulo tipo "resistor ladder" — cada botao gera um valor diferente de `analogRead()` nesse mesmo pino. CENTER e o "botao" exigido pelo desafio |

## Notas

- **Sem LED externo**: este projeto usa apenas o LED onboard da Wemos D1 R32 (GPIO 2, cor unica) para indicar o estado do sistema por padrao de piscada, nao por cor — veja `docs/architecture.md`.
- **LDR**: a leitura e um valor bruto de 0–4095 (ADC de 12 bits do ESP32), nao um valor calibrado em lux. Isso e suficiente para o desafio (comparacao relativa de luminosidade).
- **Joystick analogico (resistor ladder)**: os 5 botoes compartilham um unico pino ADC (`JOY_PIN`, GPIO 35). Os valores brutos de cada botao variam por modulo — use `JOY_CALIBRATE 1` em `config.h` para imprimir o valor lido no Serial Monitor, pressione cada botao e anote o numero, depois preencha `JOY_UP_VALUE`/`JOY_DOWN_VALUE`/`JOY_LEFT_VALUE`/`JOY_RIGHT_VALUE`/`JOY_CENTER_VALUE`/`JOY_IDLE_VALUE` com os valores reais e volte `JOY_CALIBRATE` para `0`.
- **GPIOs evitados de proposito**: 0, 2 (reservado para o LED onboard), 12, 15 (pinos de bootstrap), 1/3 (UART do Serial Monitor) e 6–11 (flash SPI interna).
- **Credenciais Wi-Fi**: ficam em `Firmware/include/secrets.h` (gitignored), nao em `config.h`. Copie `secrets.h.example` para `secrets.h` e preencha com sua rede real antes de compilar.
