import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResultadoAnimais } from '@/services/animais'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

// Coordena consultas e escritas com o vínculo validado pelo router — 18/11/2026.
export function useGerenciamentoAnimais<Chave, Dados>(
  obterChave: () => Chave,
  consultar: (idInstituicao: number, chave: Chave, sinal: AbortSignal) => Promise<ResultadoAnimais<Dados>>,
) {
  const rota = useRoute()
  const roteador = useRouter()
  const resultado = shallowRef<ResultadoAnimais<Dados> | null>(null)
  const enviando = ref(false)
  const bloqueado = ref(false)
  const mensagem = ref('')

  // Lê o vínculo que a guarda recebeu da identidade autenticada — 18/11/2026.
  const idInstituicao = computed(function obterVinculo() {
    return typeof rota.meta.idInstituicao === 'number' ? rota.meta.idInstituicao : null
  })

  type Contexto = { sessao: ReturnType<typeof consultarSessao>; controle: AbortController; chave: Chave; caminho: string }
  let contexto: Contexto | undefined

  // Descarta operações que pertencem a outra sessão ou navegação — 18/11/2026.
  function ativo(origem: Contexto) {
    return contexto === origem && !origem.controle.signal.aborted &&
      rota.fullPath === origem.caminho && consultarSessao() === origem.sessao
  }

  // Encerra apenas a sessão associada à resposta 401 — 18/11/2026.
  async function voltarAoLogin(origem: Contexto) {
    if (!ativo(origem)) return
    origem.controle.abort()
    encerrarSessao()
    await roteador.replace({ name: 'login' })
  }

  // Consulta os dados atuais antes de liberar a tela ou após uma escrita inconclusiva — 18/11/2026.
  async function carregar(origem: Contexto) {
    if (!ativo(origem)) return
    resultado.value = null
    const vinculo = idInstituicao.value
    if (vinculo === null) {
      resultado.value = { tipo: 'falha', mensagem: 'Sua conta não tem vínculo com uma instituição.', permiteTentar: false }
      return
    }

    const resposta = await consultar(vinculo, origem.chave, origem.controle.signal)
    if (!ativo(origem)) return
    if (resposta.tipo === 'sessao-invalida') await voltarAoLogin(origem)
    else if (resposta.tipo !== 'descartado') resultado.value = resposta
  }

  // Reinicia o fluxo quando o animal ou vínculo muda e cancela operações antigas — 18/11/2026.
  // Observa o caminho completo para invalidar chamadas ao navegar — 18/11/2026.
  function obterCaminho() { return rota.fullPath }

  watch([obterChave, idInstituicao, obterCaminho], function iniciar([chave, , caminho], _anterior, aoLimpar) {
    const origem = { sessao: consultarSessao(), controle: new AbortController(), chave, caminho }
    contexto = origem
    // Interrompe as chamadas deste contexto ao sair da tela ou trocar de registro — 18/11/2026.
    aoLimpar(function cancelar() { origem.controle.abort() })
    enviando.value = false
    bloqueado.value = false
    mensagem.value = ''
    void carregar(origem)
  }, { immediate: true })

  // Repete a leitura, sem reenviar uma operação de escrita — 18/11/2026.
  async function tentarNovamente() {
    if (contexto && !enviando.value && resultado.value?.tipo === 'falha') await carregar(contexto)
  }

  // Protege a escrita contra cliques repetidos e reconcilia o resultado quando necessário — 18/11/2026.
  async function executar<Retorno>(
    operacao: (idInstituicao: number, sinal: AbortSignal) => Promise<ResultadoAnimais<Retorno>>,
    criacao = false,
  ): Promise<boolean> {
    const origem = contexto
    const vinculo = idInstituicao.value
    if (!origem || !ativo(origem) || vinculo === null || enviando.value || bloqueado.value ||
      resultado.value?.tipo !== 'sucesso') return false

    enviando.value = true
    mensagem.value = ''
    try {
      const resposta = await operacao(vinculo, origem.controle.signal)
      if (!ativo(origem)) return false
      if (resposta.tipo === 'sucesso') return true
      if (resposta.tipo === 'sessao-invalida') await voltarAoLogin(origem)
      if (resposta.tipo === 'falha') {
        mensagem.value = resposta.mensagem
        if (resposta.reconciliar) {
          bloqueado.value = criacao
          if (criacao) mensagem.value += ' Confira em Meus animais se o cadastro foi concluído antes de tentar novamente.'
          await carregar(origem)
        }
      }
      return false
    } finally {
      if (ativo(origem)) enviando.value = false
    }
  }

  return { resultado, enviando, bloqueado, mensagem, tentarNovamente, executar }
}
