<script setup lang="ts">
import { computed } from 'vue'
import ListaAdmin from '@/components/ListaAdmin.vue'
import { useConsultaAdmin } from '@/composables/useConsultaAdmin'
import { listarTodosAnimais } from '@/services/animais'
import { listarSolicitacoes } from '@/services/matches'

const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const { dados: animais, erro, carregar } = useConsultaAdmin(listarTodosAnimais)

// Indexa os tipos de animais para complementar as solicitações — 18/11/2026.
const tiposAnimais = computed(function indexarAnimais() {
  const tipos = new Map<number, string>()
  for (const animal of animais.value ?? []) tipos.set(animal.id_animal, animal.tipo)
  return tipos
})
</script>

<template>
  <ListaAdmin titulo="Solicitações" vazio="Nenhuma solicitação registrada." :consultar="listarSolicitacoes" v-slot="{ registros }">
    <div v-if="erro">
      <p role="status">Não foi possível complementar os dados dos animais. {{ erro }}</p>
      <button type="button" @click="carregar">Tentar carregar animais novamente</button>
    </div>
    <table aria-label="Solicitações de adoção">
      <thead>
        <tr>
          <th scope="col">ID</th><th scope="col">Animal</th><th scope="col">ID do adotante</th>
          <th scope="col">Data do pedido</th><th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="match in registros" :key="match.id_match">
          <td>{{ match.id_match }}</td>
          <td>{{ tiposAnimais.get(match.id_animal) ?? `Animal #${match.id_animal}` }}</td>
          <td>{{ match.id_adotante }}</td>
          <td><time :datetime="match.data_pedido">{{ formatoData.format(new Date(match.data_pedido)) }}</time></td>
          <td>{{ match.status }}</td>
        </tr>
      </tbody>
    </table>
  </ListaAdmin>
</template>
