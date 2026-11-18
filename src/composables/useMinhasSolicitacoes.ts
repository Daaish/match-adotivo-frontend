import { onScopeDispose, ref } from 'vue'
import { useRouter } from 'vue-router'
import { buscarAnimal, type DetalhesAnimal } from '@/services/animais'
import { cancelarSolicitacao, listarSolicitacoes, type Match } from '@/services/matches'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

const limiteConsultasAnimais = 4

// Identifica os status em que o adotante pode cancelar um pedido próprio — 18/11/2026.
export function podeCancelar(match: Match): boolean {
  return match.status === 'PENDENTE' || match.status === 'EM ANDAMENTO'
}

// Controla o histórico, o carregamento complementar e as alterações da página — 18/11/2026.
export function useMinhasSolicitacoes() {
  const roteador = useRouter()
  const sessao = consultarSessao()
  const pagina = new AbortController()
  let consultaAnimais: AbortController | undefined
  const solicitacoes = ref<Match[]>([])
  const animais = ref(new Map<number, DetalhesAnimal>())
  const carregando = ref(false)
  const erro = ref('')
  const aviso = ref('')
  const cancelandoId = ref<number | null>(null)

  // Invalida as requisições pendentes quando a página é desmontada — 18/11/2026.
  onScopeDispose(function cancelarConsultas() {
    pagina.abort()
    consultaAnimais?.abort()
  })

  // Confere se a página ainda pertence à sessão que iniciou as chamadas — 18/11/2026.
  function paginaAtiva() {
    return !pagina.signal.aborted && consultarSessao() === sessao
  }

  // Limpa apenas a sessão da página e interrompe as chamadas restantes — 18/11/2026.
  async function voltarAoLogin() {
    if (!paginaAtiva()) return
    pagina.abort()
    consultaAnimais?.abort()
    encerrarSessao()
    await roteador.replace({ name: 'login' })
  }

  // Completa os dados uma vez por animal, com até quatro consultas simultâneas — 18/11/2026.
  async function carregarAnimais(lista: Match[], controle: AbortController) {
    // Reúne os identificadores dos animais referenciados pela lista — 18/11/2026.
    const ids = [...new Set(lista.map(function obterIdAnimal(match) { return match.id_animal }))]
    let proximaConsulta = 0

    // Consome os IDs restantes sem substituir o histórico se um animal falhar — 18/11/2026.
    async function consultarProximos() {
      while (paginaAtiva() && !controle.signal.aborted) {
        const id = ids[proximaConsulta++]
        if (id === undefined) return

        const resposta = await buscarAnimal(String(id), controle.signal)
        if (!paginaAtiva() || controle.signal.aborted) return
        if (resposta.tipo === 'sessao-invalida') {
          await voltarAoLogin()
          return
        }
        if (resposta.tipo === 'sucesso') animais.value.set(id, resposta.dados)
      }
    }

    await Promise.all(Array.from({ length: Math.min(ids.length, limiteConsultasAnimais) }, consultarProximos))
  }

  // Recarrega os matches e só substitui a lista após validar a resposta — 18/11/2026.
  async function carregar() {
    if (!paginaAtiva() || carregando.value) return false
    consultaAnimais?.abort()
    carregando.value = true
    erro.value = ''

    const resposta = await listarSolicitacoes(pagina.signal)
    if (!paginaAtiva()) return false
    carregando.value = false
    switch (resposta.tipo) {
      case 'sessao-invalida':
        await voltarAoLogin()
        return false
      case 'sucesso':
        solicitacoes.value = resposta.dados
        animais.value = new Map()
        consultaAnimais = new AbortController()
        void carregarAnimais(resposta.dados, consultaAnimais)
        return true
      case 'descartado':
        return false
      default:
        erro.value = resposta.mensagem
        return false
    }
  }

  // Cancela um pedido por vez e reconcilia conflitos antes de liberar novas ações — 18/11/2026.
  async function cancelar(id: number) {
    if (!paginaAtiva() || carregando.value || erro.value || cancelandoId.value !== null) return
    // Procura o match na lista atual para evitar ações sobre um item desatualizado — 18/11/2026.
    const match = solicitacoes.value.find(function corresponde(item) { return item.id_match === id })
    if (!match || !podeCancelar(match)) return

    aviso.value = ''
    cancelandoId.value = id
    try {
      const resposta = await cancelarSolicitacao(match, pagina.signal)
      if (!paginaAtiva()) return

      switch (resposta.tipo) {
        case 'sessao-invalida':
          await voltarAoLogin()
          return
        case 'sucesso':
          // Substitui somente o item confirmado pelo servidor — 18/11/2026.
          solicitacoes.value = solicitacoes.value.map(function atualizar(item) {
            return item.id_match === id ? resposta.dados : item
          })
          aviso.value = 'Solicitação cancelada com sucesso.'
          return
        case 'conflito':
        case 'ambiguo':
          if (!(await carregar()) || !paginaAtiva()) return
          // Confere no histórico se o cancelamento já consta após a reconciliação — 18/11/2026.
          aviso.value = solicitacoes.value.some(function estaCancelada(item) {
            return item.id_match === id && item.status === 'CANCELADO'
          }) ? 'A solicitação consta como cancelada.' : resposta.mensagem
          return
        case 'falha':
          aviso.value = resposta.mensagem
      }
    } finally {
      if (paginaAtiva()) cancelandoId.value = null
    }
  }

  void carregar()

  // Repete a leitura manualmente sem concorrer com um cancelamento — 18/11/2026.
  async function tentarNovamente() {
    if (cancelandoId.value === null) await carregar()
  }

  return { solicitacoes, animais, carregando, erro, aviso, cancelandoId, tentarNovamente, cancelar }
}
