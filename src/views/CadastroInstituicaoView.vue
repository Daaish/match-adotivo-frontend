<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { cadastrarInstituicao, type DadosCadastroInstituicao } from '@/services/cadastroInstituicao'

const dados = reactive<DadosCadastroInstituicao>({
  usuario: { nome: '', email: '', senha: '' },
  instituicao: { cnpj: '', razao_social: '', endereco: '', foto: '' },
})
const enviando = ref(false)
const cadastrado = ref(false)
const mensagem = ref('')

// Valida os dados e a senha antes de enviar uma vez por tentativa — 18/11/2026.
async function enviarCadastro() {
  if (enviando.value || cadastrado.value) return

  if (dados.usuario.nome.length < 3 || !dados.instituicao.razao_social || !dados.instituicao.endereco) {
    mensagem.value = 'Informe o nome da conta com pelo menos 3 caracteres, a razão social e o endereço.'
    return
  }

  const senha = dados.usuario.senha
  if (senha.length < 8 || new TextEncoder().encode(senha).byteLength > 72) {
    mensagem.value = 'A senha deve ter pelo menos 8 caracteres e até 72 bytes em UTF-8.'
    return
  }

  enviando.value = true
  mensagem.value = ''
  try {
    const resultado = await cadastrarInstituicao(dados)
    cadastrado.value = resultado.tipo === 'sucesso'
    mensagem.value = resultado.tipo === 'sucesso' ? 'Cadastro realizado com sucesso.' : resultado.mensagem
    if (cadastrado.value) dados.usuario.senha = ''
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="pagina-publica">
    <div class="cartao-publico">
      <h1>Cadastrar como instituição</h1>
      <form class="formulario-publico formulario-cadastro" v-if="!cadastrado" :aria-busy="enviando" @submit.prevent="enviarCadastro">
        <fieldset class="grupo-publico" :disabled="enviando">
          <legend>Dados da conta</legend>
          <label for="nome-conta">Nome da conta</label>
          <input id="nome-conta" v-model.trim="dados.usuario.nome" required minlength="3" maxlength="200" autocomplete="name" />
          <label for="email-cadastro">E-mail</label>
          <input id="email-cadastro" v-model="dados.usuario.email" type="email" required maxlength="255" autocomplete="username" />
          <label for="senha-cadastro">Senha (mínimo de 8 caracteres, máximo de 72 bytes em UTF-8)</label>
          <input id="senha-cadastro" v-model="dados.usuario.senha" type="password" required minlength="8" autocomplete="new-password" />
        </fieldset>
        <fieldset class="grupo-publico" :disabled="enviando">
          <legend>Dados da instituição</legend>
          <label for="cnpj">CNPJ (14 dígitos, sem pontuação)</label>
          <input id="cnpj" v-model="dados.instituicao.cnpj" required inputmode="numeric" pattern="[0-9]{14}" minlength="14" maxlength="14" />
          <label for="razao-social">Razão social</label>
          <input id="razao-social" v-model.trim="dados.instituicao.razao_social" required maxlength="200" autocomplete="organization" />
          <label for="endereco">Endereço</label>
          <input id="endereco" v-model.trim="dados.instituicao.endereco" required maxlength="255" autocomplete="street-address" />
          <label for="foto">URL da foto (opcional)</label>
          <input id="foto" v-model.trim="dados.instituicao.foto" type="url" maxlength="500" />
        </fieldset>
        <button type="submit" :disabled="enviando">{{ enviando ? 'Cadastrando...' : 'Cadastrar' }}</button>
      </form>
      <p class="mensagem-publica" :class="{ 'mensagem-publica--sucesso': cadastrado }" role="status" aria-live="polite">{{ mensagem }}</p>
      <RouterLink v-if="cadastrado" to="/login">Ir para o login</RouterLink>
    </div>
  </main>
</template>
