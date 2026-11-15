export type ResultadoAutenticacao =
  | { tipo: 'sucesso'; token: string }
  | { tipo: 'credenciais-invalidas' }
  | { tipo: 'falha-conexao' }
  | { tipo: 'resposta-invalida' }

// Envia as credenciais e valida o token retornando-o apenas no sucesso, sem armazená-lo — 15/11/2026.
export async function autenticar(email: string, senha: string): Promise<ResultadoAutenticacao> {
  let resposta: Response

  try {
    resposta = await fetch('/usuarios/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
  } catch {
    return { tipo: 'falha-conexao' }
  }

  if (resposta.status === 401) return { tipo: 'credenciais-invalidas' }
  // Inclui falhas do proxy de desenvolvimento quando o backend está indisponível.
  if (resposta.status >= 500) return { tipo: 'falha-conexao' }
  if (!resposta.ok) return { tipo: 'resposta-invalida' }

  try {
    const dados: unknown = await resposta.json()
    if (
      typeof dados === 'object' &&
      dados !== null &&
      'token' in dados &&
      typeof dados.token === 'string' &&
      dados.token.trim().length > 0
    ) {
      return { tipo: 'sucesso', token: dados.token }
    }
  } catch {
    return { tipo: 'resposta-invalida' }
  }

  return { tipo: 'resposta-invalida' }
}
