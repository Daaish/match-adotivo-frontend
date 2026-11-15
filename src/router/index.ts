import { createRouter, createWebHistory } from 'vue-router'
import { consultarSessao } from '@/services/sessao'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      // Carrega a tela provisória de início — 15/11/2026.
      component: () => import('../views/InicioView.vue'),
    },
  ],
})

// Organiza o acesso às telas pela sessão local; a autorização cabe ao backend — 15/11/2026.
router.beforeEach(function verificarSessao(destino) {
  if (destino.meta.exigeAutenticacao && !consultarSessao()) {
    return '/login'
  }
})

export default router
