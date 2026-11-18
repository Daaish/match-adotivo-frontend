<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useConsultaAdmin } from '@/composables/useConsultaAdmin'
import { camposAlterados, useGestaoAdmin } from '@/composables/useGestaoAdmin'
import {
  buscarInstituicao, criarInstituicao, editarInstituicao, listarInstituicoes, type DadosInstituicao,
} from '@/services/instituicoes'

const propriedades = defineProps<{ id?: string }>()
const roteador = useRouter()
const formulario = reactive({ cnpj: '', razao_social: '', endereco: '', foto: '' })
const erroFormulario = ref('')
const { enviando, bloqueado, mensagem, aviso, executar } = useGestaoAdmin()

// Busca o registro da edição ou verifica a lista para o cadastro — 18/11/2026.
async function consultar(sinal: AbortSignal) {
  if (propriedades.id !== undefined) {
    return buscarInstituicao(/^\d+$/.test(propriedades.id) ? Number(propriedades.id) : NaN, sinal)
  }
  const lista = await listarInstituicoes(sinal)
  return lista.tipo === 'sucesso' ? { tipo: 'sucesso', dados: null } as const : lista
}

const { dados, carregando, erro, carregar } = useConsultaAdmin(consultar)

// Preenche o formulário com o estado confirmado pela API — 18/11/2026.
watch(dados, function preencher(registro) {
  if (!registro) return
  formulario.cnpj = registro.cnpj
  formulario.razao_social = registro.razao_social
  formulario.endereco = registro.endereco
  formulario.foto = registro.foto ?? ''
  erroFormulario.value = ''
})

// Valida o documento e os campos e envia apenas as alterações na edição — 18/11/2026.
async function salvar() {
  const registro = dados.value
  if (registro === undefined || carregando.value || erro.value || enviando.value || bloqueado.value) return
  erroFormulario.value = ''
  const campos: DadosInstituicao = {
    cnpj: formulario.cnpj,
    razao_social: formulario.razao_social.trim(),
    endereco: formulario.endereco.trim(),
    foto: formulario.foto.trim() || null,
  }
  if (!/^\d{14}$/.test(campos.cnpj) || !campos.razao_social || campos.razao_social.length > 200 ||
    !campos.endereco || campos.endereco.length > 255) {
    erroFormulario.value = 'Confira o CNPJ, a razão social e o endereço.'
    return
  }
  if (campos.foto && (campos.foto.length > 500 || !URL.canParse(campos.foto))) {
    erroFormulario.value = 'Informe uma URL de foto válida com até 500 caracteres.'
    return
  }

  const alteracoes = registro ? camposAlterados({
    ...registro,
    razao_social: registro.razao_social.trim(),
    endereco: registro.endereco.trim(),
    foto: registro.foto?.trim() || null,
  }, campos) : campos
  if (registro && !Object.keys(alteracoes).length) {
    erroFormulario.value = 'Nenhum campo foi alterado.'
    return
  }

  // Escolhe o método conforme a presença de um registro existente — 18/11/2026.
  const salvo = await executar(registro ? 'editar' : 'criar', function enviar(sinal) {
    return registro
      ? editarInstituicao(registro.id_instituicao, alteracoes, sinal)
      : criarInstituicao(campos, sinal)
  }, carregar)
  if (salvo) await roteador.replace({ name: 'admin-instituicoes' })
}
</script>

<template>
  <main>
    <p><RouterLink :to="{ name: 'admin-instituicoes' }">Voltar para Instituições</RouterLink></p>
    <h1>{{ id ? 'Editar instituição' : 'Nova instituição' }}</h1>
    <p>O cadastro administrativo registra a instituição sem criar uma conta de login.</p>
    <p v-if="carregando" role="status">Carregando dados…</p>
    <div v-else-if="erro">
      <p role="alert">{{ erro }}</p>
      <button type="button" :disabled="enviando" @click="carregar">Tentar novamente</button>
    </div>
    <form v-else-if="dados !== undefined" :aria-busy="enviando" @submit.prevent="salvar">
      <fieldset :disabled="enviando || bloqueado">
        <label for="cnpj-admin">CNPJ (14 dígitos)</label>
        <input id="cnpj-admin" v-model="formulario.cnpj" required inputmode="numeric" pattern="[0-9]{14}" maxlength="14" />
        <label for="razao-social-admin">Razão social</label>
        <input id="razao-social-admin" v-model="formulario.razao_social" required maxlength="200" />
        <label for="endereco-instituicao-admin">Endereço</label>
        <input id="endereco-instituicao-admin" v-model="formulario.endereco" required maxlength="255" />
        <label for="foto-instituicao-admin">URL da foto (opcional)</label>
        <input id="foto-instituicao-admin" v-model="formulario.foto" type="url" maxlength="500" />
        <button type="submit">{{ enviando ? 'Salvando…' : 'Salvar instituição' }}</button>
      </fieldset>
    </form>
    <p v-if="erroFormulario || mensagem" role="alert">{{ erroFormulario || mensagem }}</p>
    <p v-if="aviso" role="status">{{ aviso }}</p>
  </main>
</template>

<style scoped>
fieldset {
  display: grid;
  gap: 0.5rem;
  max-width: 32rem;
  padding: 1rem;
}

button {
  justify-self: start;
}
</style>
