export interface DadosCadastroInstituicao {
  usuario: { nome: string; email: string; senha: string }
  instituicao: {
    cnpj: string
    razao_social: string
    endereco: string
    foto?: string | null
  }
}

type ResultadoCadastroInstituicao =
  | { tipo: 'sucesso' }
  | {
      tipo: 'dados-invalidos' | 'conflito' | 'erro-servidor' | 'resposta-inesperada' | 'falha-conexao'
      mensagem: string
    }

// Identifica objetos JSON para conferir a estrutura das respostas — 18/11/2026.
function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// Envia os campos do cadastro e confirma a criação pelo retorno da API — 18/11/2026.
export async function cadastrarInstituicao(
  dados: DadosCadastroInstituicao,
): Promise<ResultadoCadastroInstituicao> {
  const { usuario, instituicao } = dados
  const foto = instituicao.foto?.trim()
  let resposta: Response
  try {
    resposta = await fetch('/usuarios/cadastro-instituicao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: { nome: usuario.nome, email: usuario.email, senha: usuario.senha },
        instituicao: {
          cnpj: instituicao.cnpj,
          razao_social: instituicao.razao_social,
          endereco: instituicao.endereco,
          ...(foto ? { foto } : {}),
        },
      }),
    })
  } catch {
    return { tipo: 'falha-conexao', mensagem: 'Não foi possível conectar ao servidor. Tente novamente.' }
  }

  let corpo: unknown
  try {
    corpo = await resposta.json()
  } catch {
    corpo = null
  }

  if (resposta.status === 400) {
    return { tipo: 'dados-invalidos', mensagem: 'Dados inválidos. Confira os campos e tente novamente.' }
  }
  if (resposta.status === 409) {
    const mensagem = objeto(corpo) && typeof corpo.error === 'string' && corpo.error.trim()
      ? corpo.error
      : 'Não foi possível concluir o cadastro devido a um conflito nos dados.'
    return { tipo: 'conflito', mensagem }
  }
  if (resposta.status >= 500) {
    return {
      tipo: 'erro-servidor',
      mensagem: 'O servidor não conseguiu concluir o cadastro. Tente novamente mais tarde.',
    }
  }
  if (
    resposta.status === 201 && objeto(corpo) && objeto(corpo.usuario) && objeto(corpo.instituicao) &&
    Number.isInteger(corpo.usuario.id) && typeof corpo.usuario.nome === 'string' &&
    typeof corpo.usuario.email === 'string' && corpo.usuario.perfil === 'INSTITUICAO' &&
    Number.isInteger(corpo.instituicao.id_instituicao)
  ) {
    return { tipo: 'sucesso' }
  }
  return {
    tipo: 'resposta-inesperada',
    mensagem: 'Não foi possível confirmar o cadastro: resposta inesperada do servidor.',
  }
}
