<script setup lang="ts">
import { RouterLink } from 'vue-router'
import FotoAnimal from '@/components/FotoAnimal.vue'
import { useConsultaAnimais } from '@/composables/useConsultaAnimais'
import { listarAnimaisDisponiveis } from '@/services/animais'
import { formatarIdadeAnimal } from '@/utils/idadeAnimal'

// Mantém uma chave única para a listagem, que não depende de parâmetros de rota — 18/11/2026.
function chaveCatalogo() {
  return 'catalogo'
}

// Busca a lista disponível com o sinal de cancelamento da tela — 18/11/2026.
function carregarCatalogo(_chave: string, sinal: AbortSignal) {
  return listarAnimaisDisponiveis(sinal)
}

const { resultado, tentarNovamente } = useConsultaAnimais(chaveCatalogo, carregarCatalogo)
</script>

<template>
  <main>
    <h1>Animais disponíveis para adoção</h1>
    <p v-if="!resultado" role="status">Carregando animais…</p>
    <div v-else-if="resultado.tipo === 'falha'">
      <p role="alert">{{ resultado.mensagem }}</p>
      <button v-if="resultado.permiteTentar" type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>
    <template v-else-if="resultado.tipo === 'sucesso'">
      <p v-if="resultado.dados.length === 0" role="status">Nenhum animal disponível no momento.</p>
      <ul v-else class="cartoes">
        <li v-for="animal in resultado.dados" :key="animal.id_animal">
          <article>
            <FotoAnimal :foto="animal.foto" />
            <h2>{{ animal.tipo }}</h2>
            <p v-if="animal.raca">{{ animal.raca }}</p>
            <p v-if="formatarIdadeAnimal(animal.data_nascimento)">{{ formatarIdadeAnimal(animal.data_nascimento) }}</p>
            <RouterLink :to="{ name: 'detalhes-animal', params: { id: animal.id_animal } }">
              Ver detalhes
            </RouterLink>
          </article>
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.cartoes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: 1rem;
  list-style: none;
  padding: 0;
}

article {
  height: 100%;
  box-sizing: border-box;
  border: 1px solid #d9ded9;
  border-radius: 0.75rem;
  padding: 1rem;
}

h2 {
  margin: 0.75rem 0 0.5rem;
}
</style>
