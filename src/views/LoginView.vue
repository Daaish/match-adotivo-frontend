<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { autenticar } from '@/services/autenticacao'
import { iniciarSessao } from '@/services/sessao'

const roteador = useRouter()

const email = ref('')
const senha = ref('')
const enviando = ref(false)
const mensagem = ref('')

// Autentica, inicia a sessão e abre a tela inicial no sucesso — 15/11/2026.
async function enviarLogin() {
  if (enviando.value) return

  enviando.value = true
  mensagem.value = ''

  try {
    const resultado = await autenticar(email.value, senha.value)
    if (resultado.tipo === 'sucesso') {
      iniciarSessao(resultado.token)
      await roteador.replace('/inicio')
      return
    }

    const mensagens = {
      'credenciais-invalidas': 'E-mail ou senha inválidos.',
      'falha-conexao': 'Não foi possível conectar ao servidor. Tente novamente.',
      'resposta-invalida': 'O servidor retornou uma resposta inesperada. Tente novamente.',
    }
    mensagem.value = mensagens[resultado.tipo]
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="pagina-publica pagina-login">
    <div class="cartao-publico cartao-login">
      <h1>Entrar no Match Adotivo</h1>
      <p class="introducao-publica">Use seu e-mail e senha para acessar sua conta.</p>

      <form class="formulario-publico" :aria-busy="enviando" @submit.prevent="enviarLogin">
        <div class="campo-publico">
          <label for="email">E-mail</label>
          <input id="email" v-model="email" name="email" type="email" autocomplete="username" required />
        </div>

        <div class="campo-publico">
          <label for="senha">Senha</label>
          <input id="senha" v-model="senha" name="senha" type="password" autocomplete="current-password" required />
        </div>

        <button type="submit" :disabled="enviando">{{ enviando ? 'Entrando...' : 'Entrar' }}</button>
        <p class="mensagem-publica" role="status" aria-live="polite">{{ mensagem }}</p>
      </form>
      <div class="links-publicos">
        <RouterLink to="/cadastro-adotante">Cadastrar como adotante</RouterLink>
        <p><RouterLink to="/cadastro-instituicao">Cadastrar como instituição</RouterLink></p>
      </div>
    </div>
  </main>
</template>
