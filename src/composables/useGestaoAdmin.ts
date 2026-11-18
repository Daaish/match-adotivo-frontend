import { onScopeDispose, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { consultarSessao, encerrarSessao } from '@/services/sessao'

type ResultadoEscrita =
  | { tipo: 'sucesso' | 'descartado' | 'sessao-invalida' }
  | { tipo: 'falha'; mensagem: string; reconciliar?: boolean; bloqueado?: boolean }

// Seleciona os campos cujo valor mudou em relação ao último registro lido — 18/11/2026.
export function camposAlterados<Campos extends object>(
  originais: { [Chave in keyof Campos]: unknown },
  atuais: Campos,
): Partial<Campos> {
  const resultado: Partial<Campos> = {}
  for (const chave of Object.keys(atuais) as Array<keyof Campos>) {
    if (atuais[chave] !== originais[chave]) resultado[chave] = atuais[chave]
  }
  return resultado
}

// Coordena escrituras, sessão e releitura após resultados inconclusivos — 18/11/2026.
export function useGestaoAdmin() {
  const rota = useRoute()
  const roteador = useRouter()
  const caminho = rota.path
  const sessao = consultarSessao()
  const controle = new AbortController()
  const enviando = ref(false)
  const bloqueado = ref(false)
  const mensagem = ref('')
  const aviso = ref('')

  // Cancela as chamadas ao desmontar o formulário ou a lista — 18/11/2026.
  onScopeDispose(function cancelar() { controle.abort() })

  // Descarta respostas de outra sessão ou de outro registro — 18/11/2026.
  function ativo() {
    return !controle.signal.aborted && rota.path === caminho && consultarSessao() === sessao
  }

  // Executa uma escrita por vez e repete somente a leitura quando necessário — 18/11/2026.
  async function executar(
    modo: 'criar' | 'editar' | 'excluir',
    enviar: (sinal: AbortSignal) => Promise<ResultadoEscrita>,
    reler: () => Promise<void>,
  ): Promise<boolean> {
    if (!ativo() || enviando.value || bloqueado.value) return false
    enviando.value = true
    mensagem.value = ''
    aviso.value = ''
    try {
      const resposta = await enviar(controle.signal)
      if (!ativo()) return false

      if (resposta.tipo === 'sessao-invalida') {
        controle.abort()
        encerrarSessao()
        await roteador.replace({ name: 'login' })
      } else if (resposta.tipo === 'sucesso') {
        if (modo === 'excluir') {
          aviso.value = 'Registro excluído com sucesso.'
          await reler()
        } else {
          bloqueado.value = true
          aviso.value = 'Registro salvo com sucesso.'
        }
        return ativo()
      } else if (resposta.tipo === 'falha') {
        mensagem.value = resposta.mensagem
        bloqueado.value = !!resposta.bloqueado
        if (resposta.reconciliar) {
          if (modo === 'criar') {
            bloqueado.value = true
            mensagem.value += ' Confira o documento na lista antes de iniciar outro cadastro.'
          }
          await reler()
        }
      }
      return false
    } finally {
      if (ativo()) enviando.value = false
    }
  }

  return { enviando, bloqueado, mensagem, aviso, executar }
}
