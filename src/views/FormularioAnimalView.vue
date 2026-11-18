<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import FotoAnimal from '@/components/FotoAnimal.vue'
import { useGerenciamentoAnimais } from '@/composables/useGerenciamentoAnimais'
import {
  buscarAnimal, criarAnimal, editarAnimal, listarAnimaisProprios,
  type Animal, type DadosAnimal, type ResultadoAnimais,
} from '@/services/animais'

const propriedades = defineProps<{ id?: string }>()
const roteador = useRouter()
const formulario = reactive({ tipo: '', raca: '', data_nascimento: '', detalhes: '', foto: '' })
const erroFormulario = ref('')
const concluido = ref(false)
const hoje = new Date().toISOString().slice(0, 10)

// Mantém a operação ligada ao ID exibido na rota — 18/11/2026.
function obterId() { return propriedades.id }

// Prepara o cadastro ou confirma a propriedade do animal antes de abrir a edição — 18/11/2026.
async function consultarFormulario(
  idInstituicao: number, id: string | undefined, sinal: AbortSignal,
): Promise<ResultadoAnimais<Animal | null>> {
  if (id === undefined) {
    const lista = await listarAnimaisProprios(idInstituicao, sinal)
    return lista.tipo === 'sucesso' ? { tipo: 'sucesso', dados: null } : lista
  }
  const resposta = await buscarAnimal(id, sinal)
  if (resposta.tipo === 'sucesso' && resposta.dados.id_instituicao !== idInstituicao) {
    return { tipo: 'falha', mensagem: 'Este animal não pertence à sua instituição.', permiteTentar: false }
  }
  return resposta
}

const { resultado, enviando, bloqueado, mensagem, tentarNovamente, executar } =
  useGerenciamentoAnimais(obterId, consultarFormulario)

// Inicializa campos com os valores confirmados e prepara a data para o campo HTML — 18/11/2026.
watch(resultado, function preencher(resposta) {
  if (resposta?.tipo !== 'sucesso' || (resposta.dados === null && bloqueado.value)) return
  const animal = resposta.dados
  formulario.tipo = animal?.tipo ?? ''
  formulario.raca = animal?.raca ?? ''
  formulario.data_nascimento = animal?.data_nascimento?.slice(0, 10) ?? ''
  formulario.detalhes = animal?.detalhes ?? ''
  formulario.foto = animal?.foto ?? ''
  erroFormulario.value = ''
  concluido.value = false
})

// Normaliza os campos do formulário e envia POST ou PUT conforme a rota — 18/11/2026.
async function salvar() {
  if (resultado.value?.tipo !== 'sucesso' || enviando.value || bloqueado.value || concluido.value) return
  erroFormulario.value = ''
  const animal = resultado.value.dados
  const dados: DadosAnimal = {
    tipo: formulario.tipo.trim(),
    raca: formulario.raca.trim() || null,
    data_nascimento: formulario.data_nascimento || null,
    detalhes: formulario.detalhes.trim() || null,
    foto: formulario.foto.trim() || null,
  }

  if (!dados.tipo || dados.tipo.length > 50 || (dados.raca && dados.raca.length > 100)) {
    erroFormulario.value = 'Informe o tipo e respeite os limites de tipo e raça.'
    return
  }
  if (dados.data_nascimento) {
    const data = new Date(dados.data_nascimento)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data_nascimento) || !Number.isFinite(data.getTime()) ||
      data.toISOString().slice(0, 10) !== dados.data_nascimento ||
      dados.data_nascimento > new Date().toISOString().slice(0, 10)) {
      erroFormulario.value = 'Informe uma data de nascimento válida e que não seja futura.'
      return
    }
  }
  if (dados.foto && (dados.foto.length > 500 || !URL.canParse(dados.foto))) {
    erroFormulario.value = 'Informe uma URL de foto válida com até 500 caracteres.'
    return
  }

  // Usa o vínculo da sessão somente no POST — 18/11/2026.
  const salvo = await executar(function enviar(idInstituicao, sinal) {
    return animal ? editarAnimal(animal, dados, sinal) : criarAnimal(idInstituicao, dados, sinal)
  }, !animal)
  if (salvo) {
    concluido.value = true
    await roteador.replace({ name: 'meus-animais' })
  }
}
</script>

<template>
  <main>
    <p><RouterLink :to="{ name: 'meus-animais' }">Voltar para Meus animais</RouterLink></p>
    <h1>{{ id ? 'Editar animal' : 'Cadastrar animal' }}</h1>
    <p v-if="!resultado" role="status">Carregando dados…</p>
    <div v-else-if="resultado.tipo === 'falha'">
      <p role="alert">{{ resultado.mensagem }}</p>
      <button v-if="resultado.permiteTentar" type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>
    <form v-else-if="resultado.tipo === 'sucesso'" :aria-busy="enviando" @submit.prevent="salvar">
      <fieldset :disabled="enviando || bloqueado || concluido">
        <label for="tipo-animal">Tipo</label>
        <input id="tipo-animal" v-model="formulario.tipo" required maxlength="50" />
        <label for="raca-animal">Raça</label>
        <input id="raca-animal" v-model="formulario.raca" maxlength="100" />
        <label for="nascimento-animal">Data de nascimento</label>
        <input id="nascimento-animal" v-model="formulario.data_nascimento" type="date" :max="hoje" />
        <label for="detalhes-animal">Detalhes</label>
        <textarea id="detalhes-animal" v-model="formulario.detalhes" rows="4"></textarea>
        <label for="foto-animal">URL da foto</label>
        <input id="foto-animal" v-model="formulario.foto" type="url" maxlength="500" />
        <div v-if="formulario.foto" class="foto"><FotoAnimal :foto="formulario.foto.trim()" /></div>
        <button type="submit">{{ enviando ? 'Salvando…' : 'Salvar animal' }}</button>
      </fieldset>
    </form>
    <p v-if="concluido" role="status">Animal salvo com sucesso.</p>
    <p v-if="erroFormulario || mensagem" role="alert">{{ erroFormulario || mensagem }}</p>
  </main>
</template>

<style scoped>
fieldset {
  display: grid;
  gap: 0.5rem;
  max-width: 32rem;
  padding: 1rem;
}

.foto {
  width: min(100%, 12rem);
}

button {
  justify-self: start;
}
</style>
