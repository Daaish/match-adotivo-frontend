export interface DadosCadastroAdotante {
  usuario: { nome: string; email: string; senha: string }
  adotante: {
    cpf: string
    nome: string
    endereco: string
    tipo_residencia: 'CASA' | 'APARTAMENTO' | 'CHÁCARA' | 'OUTRO'
    possui_animais: boolean
    quantidade_animais: number
    tipos_animais?: string | null
  }
}

export type ResultadoCadastro =
  | { tipo: 'sucesso' }
  | { tipo: 'dados-invalidos' | 'conflito' | 'erro-servidor' | 'resposta-inesperada' | 'falha-conexao'; mensagem: string }

// Identifica objetos JSON para validar os retornos da API — 15/11/2026.
function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// Envia apenas os campos do cadastro e confirma a estrutura do retorno 201 — 15/11/2026.
export async function cadastrarAdotante(dados: DadosCadastroAdotante): Promise<ResultadoCadastro> {
  let resposta: Response
  try {
    resposta = await fetch('/usuarios/cadastro-adotante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: { nome: dados.usuario.nome, email: dados.usuario.email, senha: dados.usuario.senha },
        adotante: {
          cpf: dados.adotante.cpf,
          nome: dados.adotante.nome,
          endereco: dados.adotante.endereco,
          tipo_residencia: dados.adotante.tipo_residencia,
          possui_animais: dados.adotante.possui_animais,
          quantidade_animais: dados.adotante.quantidade_animais,
          tipos_animais: dados.adotante.tipos_animais,
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
    return { tipo: 'erro-servidor', mensagem: 'O servidor não conseguiu concluir o cadastro. Tente novamente mais tarde.' }
  }
  if (
    resposta.status === 201 && objeto(corpo) && objeto(corpo.usuario) && objeto(corpo.adotante) &&
    Number.isInteger(corpo.usuario.id) && typeof corpo.usuario.nome === 'string' &&
    typeof corpo.usuario.email === 'string' && corpo.usuario.perfil === 'ADOTANTE' &&
    Number.isInteger(corpo.adotante.id_adotante)
  ) {
    return { tipo: 'sucesso' }
  }
  return { tipo: 'resposta-inesperada', mensagem: 'Não foi possível confirmar o cadastro: resposta inesperada do servidor.' }
}
