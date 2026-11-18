import { consultarSessao } from './sessao'

type Escrita = { metodo: 'POST' | 'PUT'; corpo: object } | { metodo: 'DELETE' }

// Executa uma operação autenticada e valida o retorno conforme o método — 18/11/2026.
export async function consultarRecursoAdmin<Dados>(
  caminho: string,
  sinal: AbortSignal,
  validar: (valor: unknown) => valor is Dados,
  escrita?: Escrita,
) {
  const sessao = consultarSessao()
  if (sinal.aborted) return { tipo: 'descartado' } as const
  if (!sessao) return { tipo: 'sessao-invalida' } as const

  let resposta: Response
  const autorizacao = { Authorization: `Bearer ${sessao.token}` }
  const opcoes: RequestInit = escrita && 'corpo' in escrita
    ? {
        method: escrita.metodo, body: JSON.stringify(escrita.corpo),
        headers: { ...autorizacao, 'Content-Type': 'application/json' },
      }
    : { method: escrita?.metodo ?? 'GET', headers: autorizacao }
  try {
    resposta = await fetch(caminho, {
      ...opcoes,
      cache: 'no-store',
      signal: sinal,
    })
  } catch {
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
    return { tipo: 'falha', mensagem: 'Não foi possível conectar ao servidor.', reconciliar: !!escrita } as const
  }

  if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
  if (resposta.status === 401) return { tipo: 'sessao-invalida' } as const
  if (resposta.status === 400) return { tipo: 'falha', mensagem: 'Dados inválidos. Confira os campos informados.' } as const
  if (resposta.status === 403) return {
    tipo: 'falha', mensagem: 'Sua conta não tem permissão para esta operação.', bloqueado: true,
  } as const
  if (resposta.status === 404) return {
    tipo: 'falha', mensagem: 'O registro ou a lista solicitada não foi encontrado.', reconciliar: !!escrita,
  } as const
  if (resposta.status === 409 && escrita?.metodo === 'DELETE') {
    return { tipo: 'falha', mensagem: 'O registro possui vínculos que impedem a exclusão.' } as const
  }
  if (resposta.status === 409 && escrita) {
    const corpo: unknown = await lerJson(resposta)
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
    const mensagem = corpo && typeof corpo === 'object' && 'error' in corpo &&
      typeof corpo.error === 'string' && corpo.error.trim()
      ? corpo.error : 'O servidor encontrou um conflito nos dados informados.'
    return { tipo: 'falha', mensagem } as const
  }
  if (resposta.status >= 500) return {
    tipo: 'falha', mensagem: escrita ? 'O servidor não confirmou a operação.' : 'O servidor não conseguiu carregar a lista.',
    reconciliar: !!escrita,
  } as const

  const esperado = escrita?.metodo === 'POST' ? 201 : escrita?.metodo === 'DELETE' ? 204 : 200
  if (resposta.status === esperado) {
    const corpo = esperado === 204 ? null : await lerJson(resposta)
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
    if (validar(corpo)) return { tipo: 'sucesso', dados: corpo } as const
  }
  return { tipo: 'falha', mensagem: 'O servidor retornou uma resposta inválida.', reconciliar: !!escrita } as const
}

// Converte uma falha de leitura de JSON em corpo inválido — 18/11/2026.
async function lerJson(resposta: Response): Promise<unknown> {
  try { return await resposta.json() } catch { return undefined }
}

// Obtém uma lista e valida cada registro antes de disponibilizá-la — 18/11/2026.
export function consultarListaAdmin<Dados>(caminho: string, sinal: AbortSignal, validar: (valor: unknown) => valor is Dados) {
  // Verifica o array e os registros retornados — 18/11/2026.
  function listaValida(valor: unknown): valor is Dados[] {
    return Array.isArray(valor) && valor.every(validar)
  }
  return consultarRecursoAdmin(caminho, sinal, listaValida)
}

// Cria as operações por recurso e confere o ID nas respostas de leitura e atualização — 18/11/2026.
export function operacoesAdmin<Registro, Campos extends object>(
  caminho: string,
  validar: (valor: unknown) => valor is Registro,
  chaveId: keyof Registro,
) {
  // Valida o caminho e a identidade do registro devolvido — 18/11/2026.
  function porId(id: number, sinal: AbortSignal, escrita?: Escrita) {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) {
      return Promise.resolve({ tipo: 'falha', mensagem: 'Identificador inválido.' } as const)
    }
    return consultarRecursoAdmin(`${caminho}/${id}`, sinal, function validarId(valor): valor is Registro {
      // Confere o ID do registro solicitado — 18/11/2026.
      return validar(valor) && valor[chaveId] === id
    }, escrita)
  }

  return {
    // Busca os dados para preencher o formulário de edição — 18/11/2026.
    buscar: (id: number, sinal: AbortSignal) => porId(id, sinal),
    // Cadastra um registro sem criar conta de login — 18/11/2026.
    criar: (corpo: Campos, sinal: AbortSignal) => consultarRecursoAdmin(caminho, sinal, validar, { metodo: 'POST', corpo }),
    // Envia somente os campos alterados e rejeita uma edição vazia — 18/11/2026.
    editar(id: number, corpo: Partial<Campos>, sinal: AbortSignal) {
      if (!Object.values(corpo).some(function definido(valor) { return valor !== undefined })) {
        return Promise.resolve({ tipo: 'falha', mensagem: 'Nenhum campo foi alterado.' } as const)
      }
      return porId(id, sinal, { metodo: 'PUT', corpo })
    },
    // Exclui o registro e espera uma resposta 204 sem corpo — 18/11/2026.
    excluir(id: number, sinal: AbortSignal) {
      if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) {
        return Promise.resolve({ tipo: 'falha', mensagem: 'Identificador inválido.' } as const)
      }
      // Valida a representação interna de uma resposta sem corpo — 18/11/2026.
      return consultarRecursoAdmin(`${caminho}/${id}`, sinal, function vazio(valor): valor is null {
        return valor === null
      }, { metodo: 'DELETE' })
    },
  }
}
