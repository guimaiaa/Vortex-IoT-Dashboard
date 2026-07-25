# Video de apresentacao (max. 6 minutos)

Coloque o video final nesta pasta (ou um link, se o arquivo for grande demais para o repositorio).

Roteiro sugerido pelo desafio:

| Tempo | Conteudo |
|---|---|
| 0:00–1:00 | Apresentacao e visao geral do projeto |
| 1:00–3:00 | Demonstracao pratica: ESP32 lendo sensores, dashboard atualizando em tempo real, LED/buzzer/joystick reagindo |
| 3:00–5:00 | Explicacao tecnica do codigo (firmware, backend, frontend) |
| 5:00–6:00 | Uso da Inteligencia Artificial no desenvolvimento |

Dicas para a demonstracao (3.):
- Mostrar o Serial Monitor do ESP32 conectando ao Wi-Fi e enviando os primeiros payloads.
- Abrir o dashboard lado a lado e mostrar os cartoes de temperatura/umidade/luminosidade atualizando sozinhos (sem dar refresh).
- Provocar um alerta (aquecer o DHT11 com a mao, por exemplo) e mostrar o LED vermelho + buzzer, depois apertar o centro do joystick para silenciar.
- Desligar o Wi-Fi do roteador por alguns segundos e mostrar o dashboard marcando o dispositivo como offline, depois voltando a online quando a conexao retorna.
