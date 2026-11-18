import { createRouter, createWebHistory, type RouteLocation } from 'vue-router'
import { consultarSessao, encerrarSessao } from '@/services/sessao'
import { consultarUsuarioAtual, type ResultadoUsuarioAtual } from '@/services/usuarioAtual'

const inicioPorPerfil = {
  ADMIN: 'inicio-admin',
  INSTITUICAO: 'inicio-instituicao',
  ADOTANTE: 'inicio-adotante',
  SEM_PERFIL: 'inicio',
} as const

const consultasParaRedirecionamento = new WeakMap<RouteLocation, {
  sessao: NonNullable<ReturnType<typeof consultarSessao>>
  resultado: ResultadoUsuarioAtual
}>()

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/cadastro-adotante',
      name: 'cadastro-adotante',
      // Carrega o cadastro público de adotante — 15/11/2026.
      component: () => import('../views/CadastroAdotanteView.vue'),
    },
    {
      path: '/cadastro-instituicao',
      name: 'cadastro-instituicao',
      // Carrega o cadastro público de instituição — 18/11/2026.
      component: () => import('../views/CadastroInstituicaoView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      // Carrega a tela ao acessar a rota de login — 15/11/2026.
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/inicio',
      name: 'inicio',
      meta: { exigeAutenticacao: true },
      // Carrega a tela de aviso para contas sem painel disponível — 18/11/2026.
      component: () => import('../views/InicioView.vue'),
    },
    {
      path: '/inicio/admin',
      name: 'inicio-admin',
      meta: { exigeAutenticacao: true },
      // Carrega a página inicial de administração — 18/11/2026.
      component: () => import('../views/InicioAdminView.vue'),
    },
    {
      path: '/inicio/instituicao',
      name: 'inicio-instituicao',
      meta: { exigeAutenticacao: true },
      // Carrega a página inicial de instituição — 18/11/2026.
      component: () => import('../views/InicioInstituicaoView.vue'),
    },
    {
      path: '/inicio/adotante',
      name: 'inicio-adotante',
      meta: { exigeAutenticacao: true },
      // Carrega a página inicial de adotante — 18/11/2026.
      component: () => import('../views/InicioAdotanteView.vue'),
    },
  ],
})

// Confere o perfil atual antes de abrir um painel e descarta respostas de outra sessão — 18/11/2026.
router.beforeEach(async function verificarSessao(destino) {
  if (!destino.meta.exigeAutenticacao) return

  const sessao = consultarSessao()
  if (!sessao) return { name: 'login' }

  // Reaproveita a consulta somente no redirecionamento desta navegação.
  const origem = destino.redirectedFrom
  const consulta = origem && consultasParaRedirecionamento.get(origem)
  if (origem) consultasParaRedirecionamento.delete(origem)
  if (consulta && consulta.sessao !== sessao) return false
  const resultado = consulta?.resultado ?? await consultarUsuarioAtual(sessao.token)

  const sessaoAtual = consultarSessao()
  if (sessaoAtual !== sessao) return sessaoAtual ? false : { name: 'login' }

  if (resultado.tipo === 'sessao-invalida') {
    encerrarSessao()
    return { name: 'login' }
  }

  const pagina = resultado.tipo === 'sucesso' ? inicioPorPerfil[resultado.usuario.perfil] : 'inicio'
  if (destino.name !== pagina) {
    consultasParaRedirecionamento.set(origem ?? destino, { sessao, resultado })
    return { name: pagina }
  }
  if (resultado.tipo === 'falha') destino.meta.erroPerfil = resultado.mensagem
})

export default router
