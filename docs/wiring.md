# Pinout / Ligações (Wemos D1 R32)

Todos os pinos estão definidos em um único lugar: `Firmware/include/config.h`. Se sua fiação for diferente, ajuste as `#define` lá — não é necessário tocar em `main.cpp`.

| Componente | Pino | Observação |
|---|---|---|
| DHT11 (dados) | GPIO 4 | resistor de pull-up de 10k entre VCC e DATA se o módulo não tiver um embutido |
| LDR (saída analógica) | GPIO 34 | pino somente-entrada, ideal para ADC; usar divisor de tensão LDR + resistor |
| LED onboard | GPIO 2 | LED já embutido na placa Wemos D1 R32 — não há LED externo neste projeto, então não há fiação aqui |
| Buzzer | GPIO 26 | buzzer passivo (usa `tone()`); se for ativo, funciona igual mas sem controle de frequência |
| Joystick (5 botões) | GPIO 36 (VP) | um único pino analógico (ADC1); módulo tipo "resistor ladder" — cada botão gera um valor diferente de `analogRead()` nesse mesmo pino. CENTER é o "botão" exigido pelo desafio |

## Notas

- **Sensor DHT11 em vez de DHT22/BME280**: o edital pede DHT22 ou BME280; este projeto usa o DHT11 porque foi o sensor disponível fisicamente durante o desafio. A troca é só uma constante em `config.h` (`USE_BME280` / `DHT_TYPE`) - o firmware já suporta os três sem mudar lógica nenhuma, então trocar o sensor físico é só uma questão de ter o componente em mãos.
- **Sem LED externo**: este projeto usa apenas o LED onboard da Wemos D1 R32 (GPIO 2, cor única) para indicar o estado do sistema por padrão de piscada, não por cor — veja `docs/architecture.md`.
- **LDR**: a leitura é um valor bruto de 0–4095 (ADC de 12 bits do ESP32), não um valor calibrado em lux. Isso é suficiente para o desafio (comparação relativa de luminosidade). O valor bruto salvo no banco/API não muda, mas o dashboard exibe como porcentagem invertida (`Frontend/src/luminosity.js`) - nesta fiação especifica, escuro total le perto de 4095 (ADC alto) e luz forte le perto de 0 (ADC baixo), entao a formula inverte pra mostrar "mais luz = porcentagem maior", que e o que faz sentido pra quem olha o dashboard. Se sua fiacao do divisor de tensao for diferente (resistor e LDR trocados de posicao), a leitura pode vir no sentido oposto - ajuste o sinal em `toLuminosityPercent()` se for o seu caso.
- **Joystick analógico (resistor ladder)**: os 5 botões compartilham um único pino ADC (`JOY_PIN`, GPIO 36). Os valores brutos de cada botão variam por módulo — use `JOY_CALIBRATE 1` em `config.h` para imprimir o valor lido no Serial Monitor, pressione cada botão e anote o número, depois preencha `JOY_UP_VALUE`/`JOY_DOWN_VALUE`/`JOY_LEFT_VALUE`/`JOY_RIGHT_VALUE`/`JOY_CENTER_VALUE`/`JOY_IDLE_VALUE` com os valores reais e volte `JOY_CALIBRATE` para `0`.
- **GPIOs evitados de propósito**: 0, 2 (reservado para o LED onboard), 12, 15 (pinos de bootstrap), 1/3 (UART do Serial Monitor) e 6–11 (flash SPI interna).
- **Credenciais Wi-Fi**: ficam em `Firmware/include/secrets.h` (gitignored), não em `config.h`. Copie `secrets.h.example` para `secrets.h` e preencha com sua rede real antes de compilar.
