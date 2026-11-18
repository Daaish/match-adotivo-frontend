<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useConsultaAdmin } from '@/composables/useConsultaAdmin'
import { camposAlterados, useGestaoAdmin } from '@/composables/useGestaoAdmin'
import {
  buscarAdotante, criarAdotante, editarAdotante, listarAdotantes, tiposResidencia, type DadosAdotante,
} from '@/services/adotantes'

const propriedades = defineProps<{ id?: string }>()
const roteador = useRouter()
const formulario = reactive({
  cpf: '', nome: '', endereco: '', tipo_residencia: '',
  possui_animais: false, quantidade_animais: 0 as number | '', tipos_animais: '',
})
const erroFormulario = ref('')
const { enviando, bloqueado, mensagem, aviso, executar } = useGestaoAdmin()

// Busca o registro da edição ou verifica a lista para o cadastro — 18/11/2026.
async function consultar(sinal: AbortSignal) {
  if (propriedades.id !== undefined) {
    return buscarAdotante(/^\d+$/.test(propriedades.id) ? Number(propriedades.id) : NaN, sinal)
  }
  const lista = await listarAdotantes(sinal)
  return lista.tipo === 'sucesso' ? { tipo: 'sucesso', dados: null } as const : lista
}

const { dados, carregando, erro, carregar } = useConsultaAdmin(consultar)

// Preenche os campos com o cadastro confirmado pela API — 18/11/2026.
watch(dados, function preencher(registro) {
  if (!registro) return
  formulario.cpf = registro.cpf
  formulario.nome = registro.nome
  formulario.endereco = registro.endereco
  formulario.tipo_residencia = registro.tipo_residencia
  formulario.possui_animais = registro.possui_animais
  formulario.quantidade_animais = registro.quantidade_animais
  formulario.tipos_animais = registro.tipos_animais ?? ''
  erroFormulario.value = ''
})

// Ajusta a quantidade quando o indicador de posse muda — 18/11/2026.
function ajustarQuantidade() {
  if (!formulario.possui_animais) formulario.quantidade_animais = 0
}

// Valida residência, documento e posse antes de preparar a escrita — 18/11/2026.
async function salvar() {
  const registro = dados.value
  if (registro === undefined || carregando.value || erro.value || enviando.value || bloqueado.value) return
  erroFormulario.value = ''
  // Seleciona o valor de residência aceito pelo backend — 18/11/2026.
  const residencia = tiposResidencia.find(function corresponde(tipo) { return tipo === formulario.tipo_residencia })
  const quantidade = formulario.quantidade_animais
  if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade > 2_147_483_647 ||
    (formulario.possui_animais ? quantidade < 1 : quantidade !== 0)) {
    erroFormulario.value = 'Informe pelo menos um animal se possui animais, ou zero se não possui.'
    return
  }

  const nome = formulario.nome.trim()
  const endereco = formulario.endereco.trim()
  if (!/^\d{11}$/.test(formulario.cpf) || !nome || nome.length > 200 ||
    !endereco || endereco.length > 255 || !residencia) {
    erroFormulario.value = 'Confira o CPF, o nome, o endereço e o tipo de residência.'
    return
  }

  const campos: DadosAdotante = {
    cpf: formulario.cpf, nome, endereco, tipo_residencia: residencia,
    possui_animais: formulario.possui_animais, quantidade_animais: quantidade,
    tipos_animais: formulario.tipos_animais.trim() || null,
  }
  const alteracoes = registro ? camposAlterados({
    ...registro,
    nome: registro.nome.trim(),
    endereco: registro.endereco.trim(),
    tipos_animais: registro.tipos_animais?.trim() || null,
  }, campos) : campos
  if (registro && !Object.keys(alteracoes).length) {
    erroFormulario.value = 'Nenhum campo foi alterado.'
    return
  }

  // Envia a criação ou somente os campos modificados — 18/11/2026.
  const salvo = await executar(registro ? 'editar' : 'criar', function enviar(sinal) {
    return registro ? editarAdotante(registro.id_adotante, alteracoes, sinal)
      : criarAdotante(campos, sinal)
  }, carregar)
  if (salvo) await roteador.replace({ name: 'admin-adotantes' })
}
</script>

<template>
  <main>
    <p><RouterLink :to="{ name: 'admin-adotantes' }">Voltar para Adotantes</RouterLink></p>
    <h1>{{ id ? 'Editar adotante' : 'Novo adotante' }}</h1>
    <p>O cadastro administrativo registra o adotante sem criar uma conta de login.</p>
    <p v-if="carregando" role="status">Carregando dados…</p>
    <div v-else-if="erro">
      <p role="alert">{{ erro }}</p>
      <button type="button" :disabled="enviando" @click="carregar">Tentar novamente</button>
    </div>
    <form v-else-if="dados !== undefined" :aria-busy="enviando" @submit.prevent="salvar">
      <fieldset :disabled="enviando || bloqueado">
        <label for="cpf-admin">CPF (11 dígitos)</label>
        <input id="cpf-admin" v-model="formulario.cpf" required inputmode="numeric" pattern="[0-9]{11}" maxlength="11" />
        <label for="nome-adotante-admin">Nome</label>
        <input id="nome-adotante-admin" v-model="formulario.nome" required maxlength="200" />
        <label for="endereco-adotante-admin">Endereço</label>
        <input id="endereco-adotante-admin" v-model="formulario.endereco" required maxlength="255" />
        <label for="residencia-adotante-admin">Tipo de residência</label>
        <select id="residencia-adotante-admin" v-model="formulario.tipo_residencia" required>
          <option value="" disabled>Selecione</option>
          <option v-for="tipo in tiposResidencia" :key="tipo" :value="tipo">{{ tipo }}</option>
        </select>
        <label><input v-model="formulario.possui_animais" type="checkbox" @change="ajustarQuantidade" /> Possui animais</label>
        <label for="quantidade-adotante-admin">Quantidade de animais</label>
        <input id="quantidade-adotante-admin" v-model.number="formulario.quantidade_animais" type="number"
          :min="formulario.possui_animais ? 1 : 0" max="2147483647" step="1" required :disabled="!formulario.possui_animais" />
        <label for="tipos-adotante-admin">Tipos de animais (opcional)</label>
        <input id="tipos-adotante-admin" v-model="formulario.tipos_animais" />
        <button type="submit">{{ enviando ? 'Salvando…' : 'Salvar adotante' }}</button>
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
