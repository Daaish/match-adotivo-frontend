import { ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ResultadoAnimais } from '@/services/animais'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

// Coordena carregamento, nova tentativa, cancelamento e expiração da sessão — 18/11/2026.
export function useConsultaAnimais<Chave, Dados>(
  obterChave: () => Chave,
  consultar: (chave: Chave, sinal: AbortSignal) => Promise<ResultadoAnimais<Dados>>,
) {
  const roteador = useRouter()
  const tentativa = ref(0)
  const resultado = shallowRef<ResultadoAnimais<Dados> | null>(null)

  // Invalida a consulta anterior quando a chave muda, há nova tentativa ou a tela é desmontada — 18/11/2026.
  watch([obterChave, tentativa], async function carregar([chave], _anterior, aoLimpar) {
    const controle = new AbortController()
    const sessao = consultarSessao()
    // Cancela a requisição vinculada a esta execução — 18/11/2026.
    aoLimpar(function cancelar() { controle.abort() })
    resultado.value = null

    const resposta = await consultar(chave, controle.signal)
    if (controle.signal.aborted || consultarSessao() !== sessao || resposta.tipo === 'descartado') return

    if (resposta.tipo === 'sessao-invalida') {
      encerrarSessao()
      await roteador.replace({ name: 'login' })
      return
    }

    resultado.value = resposta
  }, { immediate: true, flush: 'sync' })

  // Solicita novamente os dados da tela atual — 18/11/2026.
  function tentarNovamente() {
    tentativa.value++
  }

  return { resultado, tentarNovamente }
}
