<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { cadastrarAdotante, type DadosCadastroAdotante } from '@/services/cadastroAdotante'

const dados = reactive<DadosCadastroAdotante>({
  usuario: { nome: '', email: '', senha: '' },
  adotante: {
    cpf: '', nome: '', endereco: '', tipo_residencia: 'CASA',
    possui_animais: false, quantidade_animais: 0, tipos_animais: '',
  },
})
const enviando = ref(false)
const cadastrado = ref(false)
const mensagem = ref('')

// Mantém quantidade zero ao informar que não possui animais — 15/11/2026.
function ajustarQuantidade() {
  if (!dados.adotante.possui_animais) dados.adotante.quantidade_animais = 0
}

// Valida senha e quantidade, envia o cadastro e confirma o sucesso — 18/11/2026.
async function enviarCadastro() {
  if (enviando.value || cadastrado.value) return

  const senha = dados.usuario.senha
  if (senha.length < 8 || new TextEncoder().encode(senha).byteLength > 72) {
    mensagem.value = 'A senha deve ter pelo menos 8 caracteres e até 72 bytes em UTF-8.'
    return
  }

  const { possui_animais, quantidade_animais } = dados.adotante
  if (!Number.isInteger(quantidade_animais) ||
    (possui_animais ? quantidade_animais < 1 : quantidade_animais !== 0)) {
    mensagem.value = 'Informe pelo menos um animal se possui animais, ou zero se não possui.'
    return
  }

  enviando.value = true
  mensagem.value = ''
  try {
    const resultado = await cadastrarAdotante(dados)
    cadastrado.value = resultado.tipo === 'sucesso'
    mensagem.value = resultado.tipo === 'sucesso' ? 'Cadastro realizado com sucesso.' : resultado.mensagem
    if (cadastrado.value) dados.usuario.senha = ''
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main>
    <h1>Cadastrar como adotante</h1>
    <form v-if="!cadastrado" :aria-busy="enviando" @submit.prevent="enviarCadastro">
      <fieldset :disabled="enviando">
        <legend>Dados da conta</legend>
        <label for="nome-conta">Nome da conta</label>
        <input id="nome-conta" v-model.trim="dados.usuario.nome" required minlength="3" maxlength="200" autocomplete="name" />
        <label for="email-cadastro">E-mail</label>
        <input id="email-cadastro" v-model="dados.usuario.email" type="email" required maxlength="255" autocomplete="username" />
        <label for="senha-cadastro">Senha (mínimo de 8 caracteres, máximo de 72 bytes em UTF-8)</label>
        <input id="senha-cadastro" v-model="dados.usuario.senha" type="password" required minlength="8" autocomplete="new-password" />
      </fieldset>
      <fieldset :disabled="enviando">
        <legend>Perfil do adotante</legend>
        <label for="nome-perfil">Nome do perfil do adotante</label>
        <input id="nome-perfil" v-model.trim="dados.adotante.nome" required minlength="1" maxlength="200" />
        <label for="cpf">CPF (11 dígitos, sem pontuação)</label>
        <input id="cpf" v-model="dados.adotante.cpf" required inputmode="numeric" pattern="[0-9]{11}" minlength="11" maxlength="11" />
        <label for="endereco">Endereço</label>
        <input id="endereco" v-model.trim="dados.adotante.endereco" required minlength="1" maxlength="255" autocomplete="street-address" />
        <label for="residencia">Tipo de residência</label>
        <select id="residencia" v-model="dados.adotante.tipo_residencia" required>
          <option value="CASA">Casa</option>
          <option value="APARTAMENTO">Apartamento</option>
          <option value="CHÁCARA">Chácara</option>
          <option value="OUTRO">Outro</option>
        </select>
        <label for="possui-animais">Possui animais?</label>
        <select id="possui-animais" v-model="dados.adotante.possui_animais" @change="ajustarQuantidade">
          <option :value="false">Não</option>
          <option :value="true">Sim</option>
        </select>
        <label for="quantidade">Quantidade de animais</label>
        <input id="quantidade" v-model.number="dados.adotante.quantidade_animais" type="number" required :min="dados.adotante.possui_animais ? 1 : 0" step="1" :disabled="!dados.adotante.possui_animais" />
        <label for="tipos">Tipos de animais (opcional)</label>
        <input id="tipos" v-model.trim="dados.adotante.tipos_animais" />
      </fieldset>
      <button type="submit" :disabled="enviando">{{ enviando ? 'Cadastrando...' : 'Cadastrar' }}</button>
    </form>
    <p role="status" aria-live="polite">{{ mensagem }}</p>
    <RouterLink v-if="cadastrado" to="/login">Ir para o login</RouterLink>
  </main>
</template>
