let token: string | null = null

// Inicia uma sessão apenas na memória desta página — 15/11/2026.
export function iniciarSessao(tokenValidado: string): void {
  token = tokenValidado.trim().length > 0 ? tokenValidado : null
}

// Consulta a presença da sessão local, sem comprovar autorização no backend — 15/11/2026.
export function consultarSessao(): boolean {
  return token !== null
}

// Remove o token da sessão em memória — 15/11/2026.
export function encerrarSessao(): void {
  token = null
}
