# Biblioteca do campus

Turma B. Atividade individual de 08/10/2026, valendo 0,30 ponto no segundo bimestre. Entrega pelo formulário da turma até o fim do encontro.

## Situação

Você recebeu o projeto "Biblioteca do campus" de outra equipe. Ele tem dois serviços. O `portal` usa Nginx para servir a página e encaminhar para a API os pedidos que começam com `/api/`. A `api` usa Node.js, lê o catálogo de livros em `dados/` e grava as reservas feitas pela página.

A equipe anterior entregou o projeto dizendo que "sobe sem erro". Os containers sobem. O sistema não atende aos critérios abaixo. Sua tarefa é descobrir por que e deixar o projeto funcionando.

## Critérios de aceite

1. `http://localhost:8081` mostra a página com o estado da API igual a `ok` e a tabela com os três livros.
2. Uma reserva feita pela página, com o nome no formato `RA-CODIGO`, aparece em "Reservas registradas" e reduz os exemplares restantes do livro.
3. A reserva continua registrada depois de `docker compose down` seguido de `docker compose up -d`.
4. A API só fica acessível pelo portal. Não publique a porta da API no computador.

## Regras

Altere somente o `compose.yaml`. Os arquivos da API, do portal e dos dados ficam como foram recebidos.

O enunciado não informa quantas falhas existem, onde estão nem quais comandos usar para encontrá-las. Faça a primeira execução antes de editar qualquer arquivo e registre o que observou. Corrigir uma falha pode revelar outra.

Você pode consultar a documentação, os materiais da disciplina e ferramentas de IA. O formulário pede, para cada falha, a evidência que você observou na sua execução. Uma explicação sem saída de comando ou log correspondente pontua pela metade no diagnóstico.

## Entrega

Monte uma pasta no Drive, ou um repositório, com o `compose.yaml` final, uma captura da primeira execução e as capturas finais que comprovam os critérios 1, 2 e 3. Coloque o código da aula no nome dos arquivos ou em um `identificacao.txt`. Compartilhe para leitura com `pedro.satin@unicesumar.edu.br` e confira o acesso antes de colar o link no formulário.

Se não concluir, entregue as tentativas e o que conseguiu verificar. O diagnóstico registrado também pontua.

Ao terminar, encerre somente este projeto com `docker compose down`.

## Material de consulta

- [Referência do arquivo Compose](https://docs.docker.com/reference/compose-file/).
- [Referência da CLI `docker compose`](https://docs.docker.com/reference/cli/docker/compose/).
- [Material de Docker Compose da disciplina](https://github.com/TI-UNICESUMAR/2024-topicos-especiais-ads5s/tree/main/2024-06-19-docker-compose).
- O laboratório de Compose da aula de 07/10.
