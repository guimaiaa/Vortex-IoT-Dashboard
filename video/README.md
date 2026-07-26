# Vídeo de apresentação (máx. 6 minutos)

Coloque o vídeo final nesta pasta (ou um link, se o arquivo for grande demais para o repositório).

Roteiro sugerido pelo desafio:

| Tempo | Conteúdo |
|---|---|
| 0:00–1:00 | Apresentação e visão geral do projeto |
| 1:00–3:00 | Demonstração prática: ESP32 lendo sensores, dashboard atualizando em tempo real, LED/buzzer/joystick reagindo |
| 3:00–5:00 | Explicação técnica do código (firmware, backend, frontend) |
| 5:00–6:00 | Uso da Inteligência Artificial no desenvolvimento |

Dicas para a demonstração (3.):
- Mostrar o Serial Monitor do ESP32 conectando ao Wi-Fi e enviando os primeiros payloads.
- Abrir o dashboard lado a lado e mostrar os cartões de temperatura/umidade/luminosidade atualizando sozinhos (sem dar refresh).
- Provocar um alerta (aquecer o DHT11 com a mão, por exemplo) e mostrar o LED vermelho + buzzer, depois apertar o centro do joystick para silenciar.
- Desligar o Wi-Fi do roteador por alguns segundos e mostrar o dashboard marcando o dispositivo como offline, depois voltando a online quando a conexão retorna.
