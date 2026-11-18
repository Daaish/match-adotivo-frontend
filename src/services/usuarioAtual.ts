const perfis = ['ADMIN', 'INSTITUICAO', 'ADOTANTE', 'SEM_PERFIL'] as const

type Perfil = (typeof perfis)[number]

export type ResultadoUsuarioAtual =
  | { tipo: 'sucesso'; usuario: { id: number; perfil: Perfil } }
  | { tipo: 'sessao-invalida' }
  | { tipo: 'falha'; mensagem: string }

// Reconhece os perfis previstos no contrato da API — 18/11/2026.
function perfilValido(perfil: unknown): perfil is Perfil {
  return (perfis as readonly unknown[]).includes(perfil)
}

// Consulta a identidade da sessão e valida o retorno antes de liberar a navegação — 18/11/2026.
export async function consultarUsuarioAtual(token: string): Promise<ResultadoUsuarioAtual> {
  let resposta: Response
  try {
    resposta = await fetch('/usuarios/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return { tipo: 'falha', mensagem: 'Não foi possível conectar ao servidor. Tente novamente.' }
  }

  if (resposta.status === 401) return { tipo: 'sessao-invalida' }
  if (resposta.status >= 500) {
    return { tipo: 'falha', mensagem: 'O servidor não conseguiu consultar seu perfil. Tente novamente.' }
  }

  if (resposta.status === 200) {
    let dados: unknown
    try {
      dados = await resposta.json()
    } catch {
      dados = null
    }
    if (
      typeof dados === 'object' && dados !== null &&
      'id' in dados && typeof dados.id === 'number' && Number.isInteger(dados.id) &&
      'perfil' in dados && perfilValido(dados.perfil)
    ) {
      return { tipo: 'sucesso', usuario: { id: dados.id, perfil: dados.perfil } }
    }
  }

  return { tipo: 'falha', mensagem: 'O servidor retornou uma resposta inesperada ao consultar seu perfil.' }
}
