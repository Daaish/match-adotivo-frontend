import { consultarListaAdmin } from './consultaListaAdmin'

interface Adotante {
  id_adotante: number
  cpf: string
  nome: string
  endereco: string
  tipo_residencia: string
  possui_animais: boolean
  quantidade_animais: number
  tipos_animais: string | null
}

// Valida os campos do perfil de adotante retornado pela API — 18/11/2026.
function adotanteValido(valor: unknown): valor is Adotante {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false
  const adotante = valor as Record<string, unknown>
  return typeof adotante.id_adotante === 'number' && Number.isSafeInteger(adotante.id_adotante) &&
    adotante.id_adotante > 0 && typeof adotante.cpf === 'string' && typeof adotante.nome === 'string' &&
    typeof adotante.endereco === 'string' && typeof adotante.tipo_residencia === 'string' &&
    typeof adotante.possui_animais === 'boolean' && typeof adotante.quantidade_animais === 'number' &&
    Number.isSafeInteger(adotante.quantidade_animais) && adotante.quantidade_animais >= 0 &&
    (adotante.tipos_animais === null || typeof adotante.tipos_animais === 'string')
}

// Consulta a lista de adotantes autorizada pelo backend — 18/11/2026.
export function listarAdotantes(sinal: AbortSignal) {
  return consultarListaAdmin('/adotantes', sinal, adotanteValido)
}
