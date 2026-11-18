<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import FotoAnimal from '@/components/FotoAnimal.vue'
import { useConsultaAnimais } from '@/composables/useConsultaAnimais'
import { useSolicitacaoAdocao } from '@/composables/useSolicitacaoAdocao'
import { buscarAnimal } from '@/services/animais'
import { formatarIdadeAnimal } from '@/utils/idadeAnimal'

const propriedades = defineProps<{ id: string }>()

// Atualiza a consulta quando o identificador da rota muda — 18/11/2026.
function obterId() {
  return propriedades.id
}

const { resultado, tentarNovamente } = useConsultaAnimais(obterId, buscarAnimal)
const { estado, mensagem, podeSolicitar, enviarSolicitacao, tentarVerificarNovamente } =
  useSolicitacaoAdocao(obterId, resultado)

// Calcula a idade apenas após validar o retorno dos detalhes — 18/11/2026.
const idade = computed(function obterIdade() {
  return resultado.value?.tipo === 'sucesso'
    ? formatarIdadeAnimal(resultado.value.dados.data_nascimento)
    : null
})
</script>

<template>
  <main>
    <p><RouterLink :to="{ name: 'catalogo-animais' }">Voltar ao catálogo</RouterLink></p>
    <h1>{{ resultado?.tipo === 'sucesso' ? resultado.dados.tipo : 'Detalhes do animal' }}</h1>
    <p v-if="!resultado" role="status">Carregando detalhes…</p>
    <div v-else-if="resultado.tipo === 'falha'">
      <p role="alert">{{ resultado.mensagem }}</p>
      <button
        v-if="resultado.permiteTentar && estado !== 'falha-consulta'"
        type="button"
        @click="tentarNovamente"
      >Tentar novamente</button>
    </div>
    <template v-else-if="resultado.tipo === 'sucesso'">
      <p role="status">
        {{ resultado.dados.disponivel ? 'Disponível para adoção' : 'Indisponível para adoção' }}
      </p>
      <div class="foto"><FotoAnimal :foto="resultado.dados.foto" /></div>
      <dl v-if="resultado.dados.raca || idade">
        <template v-if="resultado.dados.raca">
          <dt>Raça</dt>
          <dd>{{ resultado.dados.raca }}</dd>
        </template>
        <template v-if="idade">
          <dt>Idade</dt>
          <dd>{{ idade }}</dd>
        </template>
      </dl>
      <p v-if="resultado.dados.detalhes" class="detalhes">{{ resultado.dados.detalhes }}</p>
      <button
        v-if="resultado.dados.disponivel && (podeSolicitar || estado === 'enviando')"
        type="button"
        :disabled="estado === 'enviando'"
        @click="enviarSolicitacao"
      >
        {{ estado === 'enviando' ? 'Solicitando…' : 'Solicitar adoção' }}
      </button>
      <p v-if="estado === 'verificando' && resultado.dados.disponivel" role="status">
        Verificando solicitações…
      </p>
    </template>
    <p v-if="mensagem" :role="estado === 'bloqueado' || estado === 'falha-consulta' ? 'alert' : 'status'">
      {{ mensagem }}
    </p>
    <button v-if="estado === 'falha-consulta'" type="button" @click="tentarVerificarNovamente">
      Verificar solicitações novamente
    </button>
  </main>
</template>

<style scoped>
.foto {
  max-width: 32rem;
}

.detalhes {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
