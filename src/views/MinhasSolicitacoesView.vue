<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import FotoAnimal from '@/components/FotoAnimal.vue'
import { podeCancelar, useMinhasSolicitacoes } from '@/composables/useMinhasSolicitacoes'

const { solicitacoes, animais, carregando, erro, aviso, cancelandoId, tentarNovamente, cancelar } =
  useMinhasSolicitacoes()
const confirmacao = ref<number | null>(null)
const dataDoPedido = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Fecha a confirmação e envia o cancelamento do pedido selecionado — 18/11/2026.
async function confirmarCancelamento(id: number) {
  if (confirmacao.value !== id) return
  confirmacao.value = null
  await cancelar(id)
}
</script>

<template>
  <main>
    <h1>Minhas solicitações</h1>
    <p v-if="carregando" role="status">Carregando solicitações…</p>
    <p v-if="aviso" role="status">{{ aviso }}</p>
    <div v-if="erro">
      <p role="alert">{{ erro }}</p>
      <button type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>
    <p v-if="!carregando && !erro && solicitacoes.length === 0" role="status">
      Você ainda não tem solicitações de adoção.
    </p>

    <ul v-if="solicitacoes.length" class="solicitacoes">
      <li v-for="match in solicitacoes" :key="match.id_match" class="solicitacao">
        <div class="foto"><FotoAnimal :foto="animais.get(match.id_animal)?.foto ?? null" /></div>
        <div>
          <h2>
            <RouterLink
              v-if="animais.has(match.id_animal)"
              :to="{ name: 'detalhes-animal', params: { id: match.id_animal } }"
            >{{ animais.get(match.id_animal)?.tipo }}</RouterLink>
            <template v-else>Animal #{{ match.id_animal }}</template>
          </h2>
          <p v-if="animais.get(match.id_animal)?.raca">{{ animais.get(match.id_animal)?.raca }}</p>
          <p>Solicitada em <time :datetime="match.data_pedido">{{ dataDoPedido.format(new Date(match.data_pedido)) }}</time></p>
          <p>Status <strong>{{ match.status }}</strong></p>
          <template v-if="podeCancelar(match)">
            <template v-if="confirmacao === match.id_match">
              <p>Cancelar esta solicitação?</p>
              <button type="button" :disabled="carregando || !!erro || cancelandoId !== null" @click="confirmarCancelamento(match.id_match)">Confirmar cancelamento</button>
              <button type="button" @click="confirmacao = null">Manter solicitação</button>
            </template>
            <button
              v-else
              type="button"
              :disabled="carregando || !!erro || cancelandoId !== null"
              @click="confirmacao = match.id_match"
            >{{ cancelandoId === match.id_match ? 'Cancelando…' : 'Cancelar solicitação' }}</button>
          </template>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.solicitacoes {
  display: grid;
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.solicitacao {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #d9ded9;
  border-radius: 0.75rem;
}

.foto {
  width: min(100%, 9rem);
}

h2 {
  margin-top: 0;
}

button + button {
  margin-inline-start: 0.5rem;
}
</style>
