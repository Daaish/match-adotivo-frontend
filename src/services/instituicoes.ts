import { consultarListaAdmin } from './consultaListaAdmin'

interface Instituicao {
  id_instituicao: number
  cnpj: string
  razao_social: string
  endereco: string
  foto: string | null
}

// Valida o registro de instituição retornado pela API — 18/11/2026.
function instituicaoValida(valor: unknown): valor is Instituicao {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false
  const instituicao = valor as Record<string, unknown>
  return typeof instituicao.id_instituicao === 'number' && Number.isSafeInteger(instituicao.id_instituicao) &&
    instituicao.id_instituicao > 0 && typeof instituicao.cnpj === 'string' &&
    typeof instituicao.razao_social === 'string' && typeof instituicao.endereco === 'string' &&
    (instituicao.foto === null || typeof instituicao.foto === 'string')
}

// Consulta as instituições cadastradas — 18/11/2026.
export function listarInstituicoes(sinal: AbortSignal) {
  return consultarListaAdmin('/instituicoes', sinal, instituicaoValida)
}
