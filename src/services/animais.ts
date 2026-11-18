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

export type DadosAnimal = Pick<Animal, 'tipo' | 'raca' | 'data_nascimento' | 'detalhes' | 'foto'>

type EscritaAnimal = { metodo: 'POST' | 'PUT' | 'DELETE'; status: number; corpo?: DadosAnimal & { id_instituicao?: number } }

export type ResultadoAnimais<Dados> =
  | { tipo: 'sucesso'; dados: Dados }
  | { tipo: 'sessao-invalida' | 'descartado' }
  | { tipo: 'falha'; mensagem: string; permiteTentar: boolean; reconciliar?: boolean }

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
  escrita?: EscritaAnimal,
): Promise<ResultadoAnimais<Dados>> {
  const sessao = consultarSessao()
  if (sinal.aborted) return { tipo: 'descartado' }
  if (!sessao) return { tipo: 'sessao-invalida' }

  let resposta: Response
  const autorizacao = { Authorization: `Bearer ${sessao.token}` }
  const opcoes: RequestInit = escrita?.corpo
    ? { method: escrita.metodo, headers: { ...autorizacao, 'Content-Type': 'application/json' }, body: JSON.stringify(escrita.corpo) }
    : { method: escrita?.metodo ?? 'GET', headers: autorizacao }
  try {
    resposta = await fetch(caminho, {
      ...opcoes,
      cache: 'no-store',
      signal: sinal,
    })
  } catch {
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
    return { tipo: 'falha', mensagem: 'Não foi possível conectar ao servidor.', permiteTentar: true, reconciliar: !!escrita }
  }

  if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
  if (resposta.status === 401) return { tipo: 'sessao-invalida' }
  if (resposta.status === 400) {
    return { tipo: 'falha', mensagem: 'Dados inválidos. Confira os campos informados.', permiteTentar: false }
  }
  if (resposta.status === 403) {
    return { tipo: 'falha', mensagem: 'Sua conta não tem permissão para acessar este conteúdo.', permiteTentar: false }
  }
  if (resposta.status === 404 && caminho.startsWith('/animais/') && caminho !== '/animais/me') {
    return { tipo: 'falha', mensagem: 'Animal não encontrado.', permiteTentar: false, reconciliar: !!escrita }
  }
  if (resposta.status === 404 && escrita?.metodo === 'POST') {
    return { tipo: 'falha', mensagem: 'Instituição não encontrada.', permiteTentar: false }
  }
  if (resposta.status === 409 && escrita) {
    const mensagem = escrita.metodo === 'DELETE'
      ? 'Não é possível excluir este animal porque existem vacinas ou solicitações vinculadas.'
      : 'Não foi possível salvar o animal devido a um conflito nos dados.'
    return { tipo: 'falha', mensagem, permiteTentar: false }
  }
  if (resposta.status >= 500) {
    const mensagem = escrita
      ? 'O servidor não confirmou a operação.'
      : 'O servidor não conseguiu carregar os dados dos animais.'
    return { tipo: 'falha', mensagem, permiteTentar: true, reconciliar: !!escrita }
  }

  if (resposta.status === (escrita?.status ?? 200)) {
    const dados: unknown = resposta.status === 204 ? null
      : await resposta.json().catch(function ignorarJsonInvalido() {
        // Encaminha falhas de leitura para o tratamento de resposta inválida — 18/11/2026.
        return null
      })
    if (sinal.aborted || consultarSessao() !== sessao) return { tipo: 'descartado' }
    if (validar(dados)) return { tipo: 'sucesso', dados }
  }
  return { tipo: 'falha', mensagem: 'O servidor retornou uma resposta inválida.', permiteTentar: true, reconciliar: !!escrita }
}

// Consulta a lista própria e rejeita registros que contradizem o vínculo autenticado — 18/11/2026.
export function listarAnimaisProprios(idInstituicao: number, sinal: AbortSignal) {
  // Confere o vínculo em cada registro retornado — 18/11/2026.
  function validarLista(valor: unknown): valor is Animal[] {
    return listaValida(valor) && valor.every(function pertence(animal) {
      return animal.id_instituicao === idInstituicao
    })
  }
  return consultarAnimais('/animais/me', sinal, validarLista)
}

// Seleciona explicitamente os campos permitidos no formulário — 18/11/2026.
function camposDoFormulario(dados: DadosAnimal): DadosAnimal {
  const { tipo, raca, data_nascimento, detalhes, foto } = dados
  return { tipo, raca, data_nascimento, detalhes, foto }
}

// Cadastra o animal com o vínculo obtido da identidade autenticada — 18/11/2026.
export function criarAnimal(idInstituicao: number, dados: DadosAnimal, sinal: AbortSignal) {
  // Confere o vínculo do animal criado — 18/11/2026.
  function validarCriacao(valor: unknown): valor is Animal {
    return animalValido(valor) && valor.id_instituicao === idInstituicao
  }
  return consultarAnimais('/animais', sinal, validarCriacao, {
    metodo: 'POST', status: 201, corpo: { ...camposDoFormulario(dados), id_instituicao: idInstituicao },
  })
}

// Atualiza os dados do animal sem incluir o vínculo no corpo do PUT — 18/11/2026.
export function editarAnimal(animal: Animal, dados: DadosAnimal, sinal: AbortSignal) {
  // Confirma a identidade e o vínculo do registro atualizado — 18/11/2026.
  function validarEdicao(valor: unknown): valor is Animal {
    return animalValido(valor) && valor.id_animal === animal.id_animal && valor.id_instituicao === animal.id_instituicao
  }
  return consultarAnimais(`/animais/${animal.id_animal}`, sinal, validarEdicao, {
    metodo: 'PUT', status: 200, corpo: camposDoFormulario(dados),
  })
}

// Exclui o animal e espera uma resposta sem conteúdo — 18/11/2026.
export function excluirAnimal(id: number, sinal: AbortSignal) {
  // Reconhece o retorno sem corpo do DELETE — 18/11/2026.
  function respostaVazia(valor: unknown): valor is null {
    return valor === null
  }
  return consultarAnimais(`/animais/${id}`, sinal, respostaVazia, { metodo: 'DELETE', status: 204 })
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
