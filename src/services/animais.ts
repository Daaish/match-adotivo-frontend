import { consultarSessao } from './sessao'

export interface Animal {
  id_animal: number
  id_instituicao: number
  tipo: string
  raca: string | null
  data_nascimento: string | null
  detalhes: string | null
  foto: string | null
}

export interface DetalhesAnimal extends Animal {
  disponivel: boolean
}

export type ResultadoAnimais<Dados> =
  | { tipo: 'sucesso'; dados: Dados }
  | { tipo: 'sessao-invalida' | 'descartado' }
  | { tipo: 'falha'; mensagem: string; permiteTentar: boolean }

// Reconhece IDs inteiros positivos do contrato de animais — 18/11/2026.
function idValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0
}

// Valida a data ISO e impede que datas de calendário inválidas sejam normalizadas — 18/11/2026.
function nascimentoValido(valor: unknown): boolean {
  if (valor === null) return true
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(valor)) return false
  const dia = new Date(valor.slice(0, 10))
  return Number.isFinite(Date.parse(valor)) &&
    Number.isFinite(dia.getTime()) && dia.toISOString().slice(0, 10) === valor.slice(0, 10)
}

// Confere se o campo de foto contém uma URL absoluta ou é nulo — 18/11/2026.
function fotoValida(valor: unknown): boolean {
  return valor === null || (typeof valor === 'string' && valor.length <= 500 && URL.canParse(valor))
}

// Verifica os campos obrigatórios e anuláveis de um animal retornado pela API — 18/11/2026.
function animalValido(valor: unknown): valor is Animal {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false
  const animal = valor as Record<string, unknown>
  return idValido(animal.id_animal) && idValido(animal.id_instituicao) &&
    typeof animal.tipo === 'string' && animal.tipo.trim().length > 0 && animal.tipo.length <= 50 &&
    (animal.raca === null || (typeof animal.raca === 'string' && animal.raca.trim().length > 0 && animal.raca.length <= 100)) &&
    (animal.detalhes === null || typeof animal.detalhes === 'string') &&
    nascimentoValido(animal.data_nascimento) && fotoValida(animal.foto)
}

// Confere se a lista contém registros válidos sem IDs repetidos ou disponibilidade contraditória — 18/11/2026.
function listaValida(valor: unknown): valor is Animal[] {
  if (!Array.isArray(valor)) return false
  const ids = new Set<number>()
  for (const animal of valor as unknown[]) {
    if (!animalValido(animal) || ids.has(animal.id_animal)) return false
    if ('disponivel' in animal && animal.disponivel !== true) return false
    ids.add(animal.id_animal)
  }
  return true
}

// Confere se os detalhes incluem o estado de disponibilidade — 18/11/2026.
function detalhesValidos(valor: unknown): valor is DetalhesAnimal {
  return animalValido(valor) && 'disponivel' in valor && typeof valor.disponivel === 'boolean'
}

// Consulta a API e descarta respostas quando a sessão ou a consulta não está mais ativa — 18/11/2026.
async function consultarAnimais<Dados>(
  caminho: string,
  sinal: AbortSignal,
  validar: (dados: unknown) => dados is Dados,
): Promise<ResultadoAnimais<Dados>> {
  const sessao = consultarSessao()
  if (sinal.aborted) return { tipo: 'descartado' }
  if (!sessao) return { tipo: 'sessao-invalida' }

  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: 'GET',
      headers: { Authorization: `Bearer ${sessao.token}` },
      cache: 'no-store',
      signal: sinal,
    })
  } catch {
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
    return { tipo: 'falha', mensagem: 'Não foi possível conectar ao servidor.', permiteTentar: true }
  }

  if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
  if (resposta.status === 401) return { tipo: 'sessao-invalida' }
  if (resposta.status === 403) {
    return { tipo: 'falha', mensagem: 'Sua conta não tem permissão para acessar este conteúdo.', permiteTentar: false }
  }
  if (resposta.status === 404 && caminho.startsWith('/animais/')) {
    return { tipo: 'falha', mensagem: 'Animal não encontrado.', permiteTentar: false }
  }
  if (resposta.status >= 500) {
    return { tipo: 'falha', mensagem: 'O servidor não conseguiu carregar os dados dos animais.', permiteTentar: true }
  }

  if (resposta.status === 200) {
    const dados: unknown = await resposta.json().catch(function ignorarJsonInvalido() {
      // Encaminha falhas de leitura para o tratamento de resposta inválida — 18/11/2026.
      return null
    })
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
    if (validar(dados)) return { tipo: 'sucesso', dados }
  }
  return { tipo: 'falha', mensagem: 'O servidor retornou uma resposta inválida.', permiteTentar: true }
}

// Lista os animais que o backend considera disponíveis para adoção — 18/11/2026.
export function listarAnimaisDisponiveis(sinal: AbortSignal) {
  return consultarAnimais('/animais?disponivel=true', sinal, listaValida)
}

// Valida o ID da rota e consulta o registro correspondente com a disponibilidade atual — 18/11/2026.
export async function buscarAnimal(id: string, sinal: AbortSignal): Promise<ResultadoAnimais<DetalhesAnimal>> {
  const identificador = Number(id)
  if (!/^\d+$/.test(id) || !idValido(identificador)) {
    return { tipo: 'falha', mensagem: 'Identificador de animal inválido.', permiteTentar: false }
  }
  const resultado = await consultarAnimais(`/animais/${identificador}`, sinal, detalhesValidos)
  if (resultado.tipo === 'sucesso' && resultado.dados.id_animal !== identificador) {
    return { tipo: 'falha', mensagem: 'O servidor retornou um animal diferente do solicitado.', permiteTentar: true }
  }
  return resultado
}
