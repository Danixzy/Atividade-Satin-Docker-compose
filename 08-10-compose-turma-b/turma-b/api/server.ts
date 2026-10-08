import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type Livro = { id: number, titulo: string, disponiveis: number }
type Reserva = { livroId: number, nome: string, criadaEm: string }
type ObjetoJson = Record<string, unknown>

const turma: string = 'B'
const porta: number = Number(process.env.PORT ?? '3000')
const catalogo: string = join(process.cwd(), 'dados', 'livros.json')
const registros: string = join(process.cwd(), 'registros', 'reservas.json')

const ehLivro = (valor: unknown): valor is Livro => {
  if (typeof valor !== 'object' || valor === null) return false
  const item: ObjetoJson = valor as ObjetoJson
  return typeof item.id === 'number' && typeof item.titulo === 'string'
    && typeof item.disponiveis === 'number'
}

const responder = (resposta: ServerResponse, codigo: number, corpo: unknown): void => {
  resposta.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' })
  resposta.end(JSON.stringify(corpo, null, 2))
}

const lerLivros = async (): Promise<Livro[]> => {
  const dados: unknown = JSON.parse(await readFile(catalogo, 'utf8'))
  if (!Array.isArray(dados) || !dados.every(ehLivro)) {
    throw new Error('Formato do catalogo invalido')
  }
  return dados
}

const lerReservas = async (): Promise<Reserva[]> => {
  try {
    return JSON.parse(await readFile(registros, 'utf8')) as Reserva[]
  } catch (erro: unknown) {
    if ((erro as { code?: string }).code === 'ENOENT') return []
    throw erro
  }
}

const lerCorpo = async (pedido: IncomingMessage): Promise<ObjetoJson> => {
  const partes: Buffer[] = []
  for await (const parte of pedido) partes.push(parte as Buffer)
  const corpo: unknown = JSON.parse(Buffer.concat(partes).toString('utf8') || '{}')
  return typeof corpo === 'object' && corpo !== null ? corpo as ObjetoJson : {}
}

const listarLivros = async (resposta: ServerResponse): Promise<void> => {
  const livros: Livro[] = await lerLivros()
  const reservas: Reserva[] = await lerReservas()
  const itens = livros.map((livro: Livro) => {
    const reservados: number = reservas.filter((i: Reserva) => i.livroId === livro.id).length
    return { ...livro, reservados, restantes: livro.disponiveis - reservados }
  })
  responder(resposta, 200, { turma, total: itens.length, itens })
}

const reservar = async (pedido: IncomingMessage, resposta: ServerResponse): Promise<void> => {
  const corpo: ObjetoJson = await lerCorpo(pedido)
  const livroId: number = Number(corpo.livroId)
  const nome: string = String(corpo.nome ?? '').trim()
  const livro: Livro | undefined = (await lerLivros()).find((l: Livro) => l.id === livroId)
  if (livro === undefined || nome === '') {
    responder(resposta, 400, { erro: 'Informe livroId existente e nome' })
    return
  }
  const reservas: Reserva[] = await lerReservas()
  if (reservas.filter((i: Reserva) => i.livroId === livroId).length >= livro.disponiveis) {
    responder(resposta, 409, { erro: 'Livro sem exemplares disponiveis' })
    return
  }
  const nova: Reserva = { livroId, nome, criadaEm: new Date().toISOString() }
  await writeFile(registros, JSON.stringify([...reservas, nova], null, 2))
  responder(resposta, 201, nova)
}

const atender = async (pedido: IncomingMessage, resposta: ServerResponse): Promise<void> => {
  const caminho: string = new URL(pedido.url ?? '/', 'http://localhost').pathname
  console.log(JSON.stringify({ evento: 'requisicao', metodo: pedido.method, caminho }))
  try {
    if (pedido.method === 'GET' && caminho === '/saude') {
      responder(resposta, 200, { status: 'ok', turma })
    } else if (pedido.method === 'GET' && caminho === '/livros') {
      await listarLivros(resposta)
    } else if (pedido.method === 'GET' && caminho === '/reservas') {
      responder(resposta, 200, await lerReservas())
    } else if (pedido.method === 'POST' && caminho === '/reservas') {
      await reservar(pedido, resposta)
    } else {
      responder(resposta, 404, { erro: 'Rota inexistente' })
    }
  } catch (erro: unknown) {
    const mensagem: string = erro instanceof Error ? erro.message : String(erro)
    console.error(JSON.stringify({ evento: 'falha', caminho, mensagem }))
    responder(resposta, 500, { erro: 'Falha interna. Consulte os logs da API.' })
  }
}

const servidor = createServer((pedido: IncomingMessage, resposta: ServerResponse): void => {
  void atender(pedido, resposta)
})

servidor.listen(porta, (): void => {
  console.log(JSON.stringify({ evento: 'inicio', porta }))
})
