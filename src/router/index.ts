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
      meta: { exigeAutenticacao: true },
      // Carrega a navegação da instituição — 18/11/2026.
      component: () => import('../views/AreaInstituicaoLayout.vue'),
      children: [
        {
          path: '',
          name: 'inicio-instituicao',
          // Carrega o início existente da instituição — 18/11/2026.
          component: () => import('../views/InicioInstituicaoView.vue'),
        },
        {
          path: 'animais',
          name: 'meus-animais',
          meta: { exigeInstituicao: true },
          // Carrega a listagem de animais próprios — 18/11/2026.
          component: () => import('../views/MeusAnimaisView.vue'),
        },
        {
          path: 'animais/novo',
          name: 'novo-animal',
          meta: { exigeInstituicao: true },
          // Carrega o formulário em modo de cadastro — 18/11/2026.
          component: () => import('../views/FormularioAnimalView.vue'),
        },
        {
          path: 'animais/:id/editar',
          name: 'editar-animal',
          meta: { exigeInstituicao: true },
          props: true,
          // Carrega o formulário para editar um animal próprio — 18/11/2026.
          component: () => import('../views/FormularioAnimalView.vue'),
        },
      ],
    },
    {
      path: '/inicio/adotante',
      meta: { exigeAutenticacao: true },
      // Carrega a navegação da área do adotante — 18/11/2026.
      component: () => import('../views/AreaAdotanteLayout.vue'),
      children: [
        {
          path: '',
          name: 'inicio-adotante',
          // Carrega a página inicial de adotante — 18/11/2026.
          component: () => import('../views/InicioAdotanteView.vue'),
        },
        {
          path: 'animais',
          name: 'catalogo-animais',
          meta: { exigeAdotante: true },
          // Carrega a listagem de animais disponíveis — 18/11/2026.
          component: () => import('../views/CatalogoAnimaisView.vue'),
        },
        {
          path: 'animais/:id',
          name: 'detalhes-animal',
          meta: { exigeAdotante: true },
          props: true,
          // Carrega os detalhes do animal identificado pela rota — 18/11/2026.
          component: () => import('../views/DetalhesAnimalView.vue'),
        },
        {
          path: 'solicitacoes',
          name: 'minhas-solicitacoes',
          meta: { exigeAdotante: true },
          // Carrega o histórico de solicitações do adotante — 18/11/2026.
          component: () => import('../views/MinhasSolicitacoesView.vue'),
        },
      ],
    },
  ],
})

// Confere o perfil para abrir a área solicitada e descarta respostas de outra sessão — 18/11/2026.
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

  if (destino.meta.exigeAdotante && resultado.tipo === 'sucesso' && resultado.usuario.perfil === 'ADOTANTE') return

  if (destino.meta.exigeInstituicao && resultado.tipo === 'sucesso' && resultado.usuario.perfil === 'INSTITUICAO') {
    destino.meta.idInstituicao = resultado.usuario.id_instituicao
    return
  }

  const pagina = resultado.tipo === 'sucesso' ? inicioPorPerfil[resultado.usuario.perfil] : 'inicio'
  if (destino.name !== pagina) {
    consultasParaRedirecionamento.set(origem ?? destino, { sessao, resultado })
    return { name: pagina }
  }
  if (resultado.tipo === 'falha') destino.meta.erroPerfil = resultado.mensagem
})

export default router
