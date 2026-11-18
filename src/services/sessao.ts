let sessao: Readonly<{ token: string }> | null = null

// Cria uma identidade de sessão em memória a cada login — 18/11/2026.
export function iniciarSessao(tokenValidado: string): void {
  sessao = tokenValidado.trim().length > 0 ? { token: tokenValidado } : null
}

// Entrega a sessão em memória para consultas autenticadas e comparação após a espera — 18/11/2026.
export function consultarSessao() {
  return sessao
}

// Remove o token da sessão em memória — 15/11/2026.
export function encerrarSessao(): void {
  sessao = null
}
