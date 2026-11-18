import { consultarSessao } from './sessao'

// Obtém uma lista autenticada e valida os registros antes de disponibilizá-los — 18/11/2026.
export async function consultarListaAdmin<Dados>(
  caminho: string,
  sinal: AbortSignal,
  validar: (valor: unknown) => valor is Dados,
) {
  const sessao = consultarSessao()
  if (sinal.aborted) return { tipo: 'descartado' } as const
  if (!sessao) return { tipo: 'sessao-invalida' } as const

  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: 'GET',
      headers: { Authorization: `Bearer ${sessao.token}` },
      cache: 'no-store',
      signal: sinal,
    })
  } catch {
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
    return { tipo: 'falha', mensagem: 'Não foi possível conectar ao servidor.' } as const
  }

  if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
  if (resposta.status === 401) return { tipo: 'sessao-invalida' } as const
  if (resposta.status === 403) return { tipo: 'falha', mensagem: 'Sua conta não tem permissão para consultar estes dados.' } as const
  if (resposta.status === 404) return { tipo: 'falha', mensagem: 'A lista solicitada não foi encontrada.' } as const
  if (resposta.status >= 500) return { tipo: 'falha', mensagem: 'O servidor não conseguiu carregar a lista.' } as const

  if (resposta.status === 200) {
    let corpo: unknown
    try { corpo = await resposta.json() } catch { corpo = null }
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' } as const
    if (Array.isArray(corpo) && corpo.every(validar)) return { tipo: 'sucesso', dados: corpo } as const
  }
  return { tipo: 'falha', mensagem: 'O servidor retornou uma resposta inválida.' } as const
}
