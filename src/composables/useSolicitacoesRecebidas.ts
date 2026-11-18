import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listarAnimaisProprios, type Animal } from '@/services/animais'
import { atualizarStatusSolicitacao, listarSolicitacoes, type Match, type StatusMatch } from '@/services/matches'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

// Coordena a lista institucional, as transições e a reconciliação com o servidor — 18/11/2026.
export function useSolicitacoesRecebidas() {
  const rota = useRoute()
  const roteador = useRouter()
  const sessao = consultarSessao()
  const nomeRota = rota.name
  const idInstituicao = rota.meta.idInstituicao
  const pagina = new AbortController()
  const solicitacoes = shallowRef<Match[]>([])
  const animais = shallowRef(new Map<number, Animal>())
  const carregando = ref(false)
  const atualizandoId = ref<number | null>(null)
  const erro = ref('')
  const aviso = ref('')

  // Interrompe as operações pendentes ao desmontar a página — 18/11/2026.
  onScopeDispose(function cancelarConsultas() { pagina.abort() })

  // Confere se a página e a sessão que originaram a operação ainda estão ativas — 18/11/2026.
  function paginaAtiva() {
    return !pagina.signal.aborted && consultarSessao() === sessao &&
      rota.name === nomeRota && rota.meta.idInstituicao === idInstituicao
  }

  // Encerra somente a sessão que originou uma resposta 401 — 18/11/2026.
  async function voltarAoLogin() {
    if (!paginaAtiva()) return
    pagina.abort()
    encerrarSessao()
    await roteador.replace({ name: 'login' })
  }

  // Revalida os pedidos e a propriedade dos animais antes de liberar novas ações — 18/11/2026.
  async function carregar() {
    if (!paginaAtiva() || carregando.value) return
    if (typeof idInstituicao !== 'number') {
      erro.value = 'Sua conta não tem vínculo com uma instituição.'
      return
    }

    carregando.value = true
    erro.value = ''
    const sinal = pagina.signal
    const [lista, proprios] = await Promise.all([listarSolicitacoes(sinal), listarAnimaisProprios(idInstituicao, sinal)])
    if (!paginaAtiva()) return
    if (lista.tipo === 'sessao-invalida' || proprios.tipo === 'sessao-invalida') {
      await voltarAoLogin()
      return
    }

    if (lista.tipo === 'sucesso') solicitacoes.value = lista.dados
    const confirmados = new Map<number, Animal>()
    if (proprios.tipo === 'sucesso') {
      for (const animal of proprios.dados) confirmados.set(animal.id_animal, animal)
    }
    animais.value = confirmados

    if ('mensagem' in lista) erro.value = lista.mensagem
    else if ('mensagem' in proprios) erro.value = 'Não foi possível confirmar os animais da instituição. ' + proprios.mensagem
    carregando.value = false
  }

  // Identifica animais que já têm adoção aprovada na lista confirmada — 18/11/2026.
  const animaisAprovados = computed(function obterAprovados() {
    const ids = new Set<number>()
    for (const match of solicitacoes.value) {
      if (match.status === 'APROVADO') ids.add(match.id_animal)
    }
    return ids
  })

  // Oferece somente transições válidas para pedidos de animais próprios — 18/11/2026.
  function transicoes(match: Match): StatusMatch[] {
    if (!animais.value.has(match.id_animal) || match.status === 'APROVADO' || match.status === 'CANCELADO') return []
    const opcoes: StatusMatch[] = [match.status === 'PENDENTE' ? 'EM ANDAMENTO' : 'PENDENTE']
    if (!animaisAprovados.value.has(match.id_animal)) opcoes.push('APROVADO')
    opcoes.push('CANCELADO')
    return opcoes
  }

  // Valida a operação na lista atual e envia um único PATCH por vez — 18/11/2026.
  async function atualizar(id: number, status: StatusMatch) {
    if (!paginaAtiva() || carregando.value || erro.value || atualizandoId.value !== null) return
    // Recupera o pedido da última listagem validada — 18/11/2026.
    const match = solicitacoes.value.find(function corresponde(item) { return item.id_match === id })
    if (!match || !transicoes(match).includes(status)) return

    atualizandoId.value = id
    aviso.value = ''
    try {
      const resposta = await atualizarStatusSolicitacao(match, status, pagina.signal)
      if (!paginaAtiva()) return
      if (resposta.tipo === 'sessao-invalida') {
        await voltarAoLogin()
        return
      }
      if (resposta.tipo === 'sucesso') {
        // Atualiza somente o pedido confirmado na resposta do PATCH — 18/11/2026.
        solicitacoes.value = solicitacoes.value.map(function substituir(item) {
          return item.id_match === id ? resposta.dados : item
        })
        aviso.value = status === 'CANCELADO'
          ? 'Solicitação recusada e registrada como cancelada.'
          : 'Status da solicitação atualizado.'
        if (status === 'APROVADO') await carregar()
      } else if ('mensagem' in resposta) {
        aviso.value = resposta.mensagem
        if (resposta.tipo !== 'falha' || resposta.reconciliar) await carregar()
      }
    } finally {
      if (paginaAtiva()) atualizandoId.value = null
    }
  }

  // Repete apenas as leituras, sem reenviar alterações — 18/11/2026.
  async function tentarNovamente() {
    if (atualizandoId.value === null) await carregar()
  }

  void carregar()

  return { solicitacoes, animais, carregando, atualizandoId, erro, aviso,
    temVinculo: typeof idInstituicao === 'number', transicoes, atualizar, tentarNovamente }
}
