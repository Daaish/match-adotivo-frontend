import { computed, ref, watch, type ShallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { buscarAnimal, type DetalhesAnimal, type ResultadoAnimais } from '@/services/animais'
import { listarSolicitacoes, solicitarAdocao, temSolicitacaoAtiva } from '@/services/matches'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

type Contexto = {
  id: string
  sessao: ReturnType<typeof consultarSessao>
  controle: AbortController
  atualizarAnimal: boolean
}

// Coordena a verificação e o envio sem reaproveitar respostas de outro animal ou sessão — 18/11/2026.
export function useSolicitacaoAdocao(
  obterId: () => string,
  detalhes: ShallowRef<ResultadoAnimais<DetalhesAnimal> | null>,
) {
  const roteador = useRouter()
  const estado = ref<'verificando' | 'pronto' | 'enviando' | 'ativo' | 'confirmado' | 'falha-consulta' | 'bloqueado'>('verificando')
  const mensagem = ref('')
  let contexto: Contexto | undefined

  // Confere se a operação ainda pertence à tela e à sessão que a iniciaram — 18/11/2026.
  function contextoAtivo(origem: Contexto) {
    return contexto === origem && !origem.controle.signal.aborted &&
      origem.sessao === consultarSessao() && origem.id === obterId()
  }

  // Encerra somente a sessão que recebeu a resposta de autenticação inválida — 18/11/2026.
  async function voltarAoLogin(origem: Contexto) {
    if (!contextoAtivo(origem)) return
    encerrarSessao()
    await roteador.replace({ name: 'login' })
  }

  // Reconfirma a lista e, após conflito, também a disponibilidade do animal — 18/11/2026.
  async function verificar(origem: Contexto, aviso = '') {
    estado.value = 'verificando'
    mensagem.value = aviso
    if (origem.atualizarAnimal) detalhes.value = null
    const sinal = origem.controle.signal
    const [solicitacoes, animal] = await Promise.all([
      listarSolicitacoes(sinal),
      origem.atualizarAnimal ? buscarAnimal(origem.id, sinal) : null,
    ])
    if (!contextoAtivo(origem)) return

    if (solicitacoes.tipo === 'sessao-invalida' || animal?.tipo === 'sessao-invalida') {
      await voltarAoLogin(origem)
      return
    }
    if (animal?.tipo === 'sucesso' || animal?.tipo === 'falha') detalhes.value = animal

    if (solicitacoes.tipo !== 'sucesso' || (animal && animal.tipo !== 'sucesso')) {
      estado.value = 'falha-consulta'
      mensagem.value = solicitacoes.tipo === 'falha' || solicitacoes.tipo === 'conflito' || solicitacoes.tipo === 'ambiguo'
        ? solicitacoes.mensagem
        : 'Não foi possível verificar a disponibilidade e as solicitações. Verifique novamente antes de enviar.'
      return
    }

    origem.atualizarAnimal = false
    if (temSolicitacaoAtiva(solicitacoes.dados, Number(origem.id))) {
      estado.value = 'ativo'
      mensagem.value = 'Você já tem uma solicitação ativa para este animal.'
      return
    }

    estado.value = 'pronto'
    mensagem.value = animal?.tipo === 'sucesso' && !animal.dados.disponivel
      ? 'Este animal não está mais disponível para adoção.'
      : aviso
  }

  // Reinicia o fluxo e invalida a consulta anterior quando o ID muda ou a tela fecha — 18/11/2026.
  watch(obterId, function iniciar(id, _anterior, aoLimpar) {
    const origem: Contexto = { id, sessao: consultarSessao(), controle: new AbortController(), atualizarAnimal: false }
    contexto = origem
    // Aborta as operações associadas ao ID anterior — 18/11/2026.
    aoLimpar(function cancelar() { origem.controle.abort() })
    void verificar(origem)
  }, { immediate: true, flush: 'sync' })

  // Libera a ação quando os detalhes e a lista autorizam um novo envio — 18/11/2026.
  const podeSolicitar = computed(function verificarAcao() {
    return estado.value === 'pronto' && detalhes.value?.tipo === 'sucesso' && detalhes.value.dados.disponivel
  })

  // Envia uma única solicitação e reconcilia resultados inconclusivos antes de reabilitar o botão — 18/11/2026.
  async function enviarSolicitacao() {
    const origem = contexto
    const animal = detalhes.value
    if (!origem || !contextoAtivo(origem) || !podeSolicitar.value ||
      animal?.tipo !== 'sucesso' || animal.dados.id_animal !== Number(origem.id)) return

    estado.value = 'enviando'
    mensagem.value = ''
    const resposta = await solicitarAdocao(animal.dados.id_animal, origem.controle.signal)
    if (!contextoAtivo(origem) || resposta.tipo === 'descartado') return

    switch (resposta.tipo) {
      case 'sucesso':
        estado.value = 'confirmado'
        mensagem.value = 'Solicitação de adoção enviada com sucesso.'
        return
      case 'sessao-invalida':
        await voltarAoLogin(origem)
        return
      case 'conflito':
      case 'ambiguo':
        origem.atualizarAnimal = resposta.tipo === 'conflito'
        await verificar(origem, resposta.mensagem)
        return
      case 'falha':
        estado.value = 'bloqueado'
        mensagem.value = resposta.mensagem
    }
  }

  // Repete apenas a verificação, sem reenviar o POST — 18/11/2026.
  async function tentarVerificarNovamente() {
    if (!contexto || !contextoAtivo(contexto) || estado.value !== 'falha-consulta') return
    await verificar(contexto)
  }

  return { estado, mensagem, podeSolicitar, enviarSolicitacao, tentarVerificarNovamente }
}
