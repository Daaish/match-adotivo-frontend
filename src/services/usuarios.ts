import { consultarListaAdmin } from './consultaListaAdmin'

interface Usuario {
  id: number
  nome: string
  email: string
  createdAt: string
}

// Confere os quatro campos da projeção administrativa de usuários — 18/11/2026.
function usuarioValido(valor: unknown): valor is Usuario {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false
  const usuario = valor as Record<string, unknown>
  return typeof usuario.id === 'number' && Number.isSafeInteger(usuario.id) && usuario.id > 0 &&
    typeof usuario.nome === 'string' && typeof usuario.email === 'string' &&
    typeof usuario.createdAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(usuario.createdAt) &&
    Number.isFinite(Date.parse(usuario.createdAt))
}

// Consulta a lista de usuários autorizada pelo backend — 18/11/2026.
export function listarUsuarios(sinal: AbortSignal) {
  return consultarListaAdmin('/usuarios', sinal, usuarioValido)
}
