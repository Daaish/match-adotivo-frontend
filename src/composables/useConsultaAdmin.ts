import { onScopeDispose, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

type ResultadoConsulta<Dados> =
  | { tipo: 'sucesso'; dados: Dados }
  | { tipo: 'sessao-invalida' | 'descartado' }
  | { tipo: 'falha' | 'conflito' | 'ambiguo'; mensagem: string }

export type ConsultaAdmin<Dados> = (sinal: AbortSignal) => Promise<ResultadoConsulta<Dados>>

// Carrega uma consulta administrativa e protege a tela contra respostas antigas — 18/11/2026.
export function useConsultaAdmin<Dados>(consultar: ConsultaAdmin<Dados>) {
  const rota = useRoute()
  const roteador = useRouter()
  const nomeRota = rota.name
  const sessao = consultarSessao()
  const controle = new AbortController()
  const dados = shallowRef<Dados>()
  const carregando = ref(false)
  const erro = ref('')

  // Cancela a consulta pendente ao fechar a página — 18/11/2026.
  onScopeDispose(function cancelar() { controle.abort() })

  // Verifica se a mesma sessão e página ainda podem receber a resposta — 18/11/2026.
  function ativo() {
    return !controle.signal.aborted && rota.name === nomeRota && consultarSessao() === sessao
  }

  // Repete a leitura, mantendo o estado associado à sessão que a iniciou — 18/11/2026.
  async function carregar() {
    if (carregando.value || !ativo()) return
    carregando.value = true
    erro.value = ''
    const resposta = await consultar(controle.signal)
    if (!ativo() || resposta.tipo === 'descartado') return
    carregando.value = false

    if (resposta.tipo === 'sessao-invalida') {
      controle.abort()
      encerrarSessao()
      await roteador.replace({ name: 'login' })
    } else if (resposta.tipo === 'sucesso') {
      dados.value = resposta.dados
    } else if ('mensagem' in resposta) {
      erro.value = resposta.mensagem
    }
  }

  void carregar()
  return { dados, carregando, erro, carregar }
}
