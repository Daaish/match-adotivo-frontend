import { consultarSessao } from './sessao'

const statusAtivos = ['PENDENTE', 'EM ANDAMENTO', 'APROVADO'] as const
export type StatusMatch = (typeof statusAtivos)[number] | 'CANCELADO'

export interface Match {
  id_match: number
  id_adotante: number
  id_animal: number
  data_pedido: string
  status: StatusMatch
}

type ResultadoMatches<Dados> =
  | { tipo: 'sucesso'; dados: Dados }
  | { tipo: 'sessao-invalida' | 'descartado' }
  | { tipo: 'falha' | 'conflito' | 'ambiguo'; mensagem: string; reconciliar?: boolean }

// Reconhece identificadores positivos representáveis pelo banco — 18/11/2026.
function idValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 && valor <= 2_147_483_647
}

// Confere a estrutura e os valores retornados no contrato de matches — 18/11/2026.
function matchValido(valor: unknown): valor is Match {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false
  const match = valor as Record<string, unknown>
  return idValido(match.id_match) && idValido(match.id_adotante) && idValido(match.id_animal) &&
    typeof match.data_pedido === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(match.data_pedido) &&
    Number.isFinite(Date.parse(match.data_pedido)) &&
    (match.status === 'CANCELADO' || (statusAtivos as readonly unknown[]).includes(match.status))
}

// Valida a listagem antes de usá-la para liberar uma solicitação — 18/11/2026.
function listaValida(valor: unknown): valor is Match[] {
  return Array.isArray(valor) && valor.every(matchValido)
}

// Detecta uma solicitação própria que impede novo envio para o animal — 18/11/2026.
export function temSolicitacaoAtiva(matches: Match[], idAnimal: number): boolean {
  // Compara o animal e considera apenas os status ativos — 18/11/2026.
  return matches.some(function estaAtivo(match) {
    return match.id_animal === idAnimal && match.status !== 'CANCELADO'
  })
}

// Consulta a API usando a sessão em memória e classifica falhas de envio inconclusivas — 18/11/2026.
async function consultarMatches<Dados>(
  sinal: AbortSignal,
  validar: (valor: unknown) => valor is Dados,
  caminho = '/matches',
  metodo: 'GET' | 'POST' | 'PATCH' = 'GET',
  corpo?: { id_animal: number } | { status: StatusMatch },
): Promise<ResultadoMatches<Dados>> {
  const sessao = consultarSessao()
  if (sinal.aborted) return { tipo: 'descartado' }
  if (!sessao) return { tipo: 'sessao-invalida' }

  const cabecalhos = { Authorization: `Bearer ${sessao.token}` }
  const opcoes: RequestInit = metodo === 'GET'
    ? { method: 'GET', headers: cabecalhos }
    : {
        method: metodo,
        headers: { ...cabecalhos, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      }
  const enviando = metodo !== 'GET'
  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      ...opcoes,
      cache: 'no-store',
      signal: sinal,
    })
  } catch {
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
    return { tipo: enviando ? 'ambiguo' : 'falha', mensagem: 'Não foi possível conectar ao servidor.' }
  }

  if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
  if (resposta.status === 401) return { tipo: 'sessao-invalida' }
  if (resposta.status === 400) return { tipo: 'falha', mensagem: 'O servidor rejeitou os dados da solicitação.' }
  if (resposta.status === 403) {
    return { tipo: 'falha', mensagem: 'Sua conta não tem permissão para esta operação.', reconciliar: metodo === 'PATCH' }
  }
  if (metodo === 'PATCH' && (resposta.status === 404 || resposta.status === 409)) {
    return { tipo: 'conflito', mensagem: 'A solicitação foi removida ou a alteração entrou em conflito com o estado atual.' }
  }
  if (resposta.status === 404) return { tipo: 'falha', mensagem: 'O recurso solicitado não foi encontrado.' }
  if (enviando && resposta.status === 409) {
    return { tipo: 'conflito', mensagem: 'O servidor encontrou um conflito ao registrar a solicitação.' }
  }
  if (resposta.status >= 500) {
    return { tipo: enviando ? 'ambiguo' : 'falha', mensagem: 'O servidor não conseguiu confirmar a operação.' }
  }

  if (resposta.status === (metodo === 'POST' ? 201 : 200)) {
    let dados: unknown
    try {
      dados = await resposta.json()
    } catch {
      dados = null
    }
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
    if (validar(dados)) return { tipo: 'sucesso', dados }
  }

  return { tipo: enviando ? 'ambiguo' : 'falha', mensagem: 'O servidor retornou uma resposta inesperada.' }
}

// Lista as solicitações no escopo da conta autenticada — 18/11/2026.
export function listarSolicitacoes(sinal: AbortSignal) {
  return consultarMatches(sinal, listaValida)
}

// Envia apenas o ID do animal e confirma o vínculo da resposta com o pedido — 18/11/2026.
export async function solicitarAdocao(idAnimal: number, sinal: AbortSignal): Promise<ResultadoMatches<Match>> {
  if (!idValido(idAnimal)) return { tipo: 'falha', mensagem: 'Identificador de animal inválido.' }

  // Aceita a criação somente para o animal solicitado e no status inicial — 18/11/2026.
  function criacaoValida(valor: unknown): valor is Match {
    return matchValido(valor) && valor.id_animal === idAnimal && valor.status === 'PENDENTE'
  }

  return consultarMatches(sinal, criacaoValida, '/matches/me', 'POST', { id_animal: idAnimal })
}

// Consulta um match pelo ID e confere se o registro retornado é o solicitado — 18/11/2026.
export function buscarSolicitacao(id: number, sinal: AbortSignal): Promise<ResultadoMatches<Match>> {
  if (!idValido(id)) {
    return Promise.resolve({ tipo: 'falha', mensagem: 'Identificador de solicitação inválido.' })
  }
  // Valida a resposta da consulta individual — 18/11/2026.
  function registroValido(valor: unknown): valor is Match {
    return matchValido(valor) && valor.id_match === id
  }
  return consultarMatches(sinal, registroValido, `/matches/${id}`)
}

// Envia somente o status e valida a identidade do match atualizado — 18/11/2026.
export function atualizarStatusSolicitacao(
  match: Match, status: StatusMatch, sinal: AbortSignal,
): Promise<ResultadoMatches<Match>> {
  if (!idValido(match.id_match)) {
    return Promise.resolve({ tipo: 'falha', mensagem: 'Identificador de solicitação inválido.' })
  }

  // Confirma que a resposta corresponde à solicitação enviada e ao status esperado — 18/11/2026.
  function atualizacaoValida(valor: unknown): valor is Match {
    return matchValido(valor) && valor.id_match === match.id_match && valor.id_adotante === match.id_adotante &&
      valor.id_animal === match.id_animal && valor.status === status
  }

  return consultarMatches(sinal, atualizacaoValida, `/matches/${match.id_match}/status`, 'PATCH', { status })
}

// Preserva a operação de cancelamento utilizada pelo adotante — 18/11/2026.
export function cancelarSolicitacao(match: Match, sinal: AbortSignal) {
  return atualizarStatusSolicitacao(match, 'CANCELADO', sinal)
}
