# Biblioteca do campus: diagnóstico (Turma B, 08/10/2026)

Daniel Andrade Mendonça, RA 23000397-2, código da aula `atvd-composer-b`.

Somente o `compose.yaml` foi alterado. O original está em `logs/compose.original.yaml`.

## Primeira execução (sem alterações)

`docker compose up -d --build` subiu os dois containers sem erro, e `GET /` respondeu `200`. Já todas as rotas `/api/*` responderam `502 Bad Gateway`. Na página apareceu "Falha HTTP 502 em http://localhost:8081/api/saude", a tabela ficou em "consultando" e as reservas também deram 502.

Evidências: `atvd-composer-b_01-primeira-execucao_pagina.png`, `atvd-composer-b_01-primeira-execucao_terminal.png` e `logs/01-primeira-execucao.txt`.

## Falha 1: o portal encaminha para 127.0.0.1 (ele mesmo)

- **Sintoma:** `502 Bad Gateway` em `/api/saude`, `/api/livros` e `/api/reservas`.
- **Evidência:**
  - log do portal: `connect() failed (111: Connection refused) while connecting to upstream ... upstream: "http://127.0.0.1:3000/saude"`;
  - o `default.conf` gerado no container contém `set $destino http://127.0.0.1:3000;`.
- **Causa:** `API_URL: "http://127.0.0.1:3000"`. Dentro do container do portal, `127.0.0.1` é o próprio container do Nginx, não a API. Containers do Compose se comunicam pelo nome do serviço, resolvido pelo DNS interno (`resolver 127.0.0.11` já está no template).
- **Correção:** `API_URL: "http://api:3000"`.
- **Resultado:** o erro mudou para `upstream: "http://172.18.0.2:3000/saude"`. O portal passou a achar o container `api`, mas a conexão continuou recusada, o que revelou a falha 2 (`logs/02-correcao-1-host.txt`).

## Falha 2: a API escuta na porta 3001, e o portal procura na 3000

- **Evidência:**
  - log da API: `{"evento":"inicio","porta":3001}`;
  - `netstat` no container da API: `:::3001 LISTEN`;
  - teste de dentro do portal: `wget http://api:3000/saude` respondeu `Connection refused`, e `wget http://api:3001/saude` respondeu `{"status":"ok"}`;
  - o `docker compose ps` mostra `3000/tcp` (o `EXPOSE 3000` do Dockerfile), que não é a porta usada de fato.
- **Causa:** `PORT: "3001"` no ambiente da API sobrescreve o padrão 3000 do `server.ts`.
- **Correção:** `PORT: "3000"`, alinhado ao `EXPOSE 3000` e ao `API_URL`.
- **Resultado:** `/api/saude` respondeu `200 {"status":"ok"}` e `/api/livros` trouxe os 3 livros (`logs/03-correcao-2-porta.txt`).

## Falha 3: as reservas somem após `docker compose down`

- **Evidência** (`logs/04-falha-persistencia.txt`, `atvd-composer-b_terminal_persistencia.png`):
  - a reserva `RA-TESTE` foi criada e aparecia em `/app/registros/reservas.json`;
  - depois de `docker compose down` e `docker compose up -d`, `/api/reservas` retornou `[]` e `/app/registros` estava vazio;
  - `docker inspect` mostrou só o bind de `./dados`, sem nenhum volume em `/app/registros`.
- **Causa:** a API grava em `/app/registros/reservas.json`. Esse arquivo fica na camada gravável do container, que é apagada pelo `down`.
- **Correção:** volume nomeado `registros:/app/registros`, declarado em `volumes:` no nível raiz.
- **Resultado:** a reserva continuou registrada após `down`/`up`. O volume `turma-b_registros` sobreviveu ao `down` (`logs/05-correcao-3-volume.txt`).

## Verificação final (volume zerado antes, com `down -v`)

| Critério | Resultado | Evidência |
|---|---|---|
| 1. Página com API `ok` e 3 livros | ok | `atvd-composer-b_criterio-1_pagina-ok.png`, `logs/07-final-criterio-1.txt` |
| 2. Reserva pela página aparece e reduz os restantes | ok: `23000397-2-atvd-composer-b`, livro 1, restantes de 3 para 2 | `atvd-composer-b_criterio-2_reserva.png`, `logs/08-final-criterio-2.txt` |
| 3. Reserva persiste após `down` + `up -d` | ok | `atvd-composer-b_criterio-3_apos-down-up.png`, `atvd-composer-b_criterio-3_terminal.png`, `logs/09-final-criterio-3.txt` |
| 4. API acessível só pelo portal | ok: a API não tem `ports:`, `localhost:3000/3001` recusa (curl exit 7) e `localhost:8081/api/saude` responde | `atvd-composer-b_criterio-4_terminal.png`, `logs/06-criterio-4.txt` |

A reserva do critério 2 foi feita pelo formulário da página, num Firefox headless controlado via WebDriver (`ferramentas/navegador.py`): ele preenche o campo, clica em "Reservar" e captura a tela. As imagens `*_terminal.png` foram geradas a partir da saída real dos comandos, gravada em `logs/`.

## compose.yaml final

```yaml
services:
  api:
    build: ./api
    environment:
      PORT: "3000"
    volumes:
      - ./dados:/app/dados:ro
      - registros:/app/registros
  portal:
    build: ./portal
    ports:
      - "127.0.0.1:8081:80"
    environment:
      API_URL: "http://api:3000"
    depends_on:
      - api

volumes:
  registros:
```
