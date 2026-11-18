<script setup lang="ts">
import { computed } from 'vue'
import ListaAdmin from '@/components/ListaAdmin.vue'
import { useConsultaAdmin } from '@/composables/useConsultaAdmin'
import { listarTodosAnimais } from '@/services/animais'
import { listarInstituicoes } from '@/services/instituicoes'

const { dados: instituicoes, erro, carregar } = useConsultaAdmin(listarInstituicoes)

// Indexa os nomes das instituições para complementar a lista de animais — 18/11/2026.
const nomesInstituicoes = computed(function indexarInstituicoes() {
  const nomes = new Map<number, string>()
  for (const instituicao of instituicoes.value ?? []) nomes.set(instituicao.id_instituicao, instituicao.razao_social)
  return nomes
})
</script>

<template>
  <ListaAdmin titulo="Animais" vazio="Nenhum animal cadastrado." :consultar="listarTodosAnimais" v-slot="{ registros }">
    <div v-if="erro">
      <p role="status">Não foi possível complementar os dados das instituições. {{ erro }}</p>
      <button type="button" @click="carregar">Tentar carregar instituições novamente</button>
    </div>
    <table aria-label="Animais cadastrados">
      <thead><tr><th scope="col">ID</th><th scope="col">Tipo</th><th scope="col">Raça</th><th scope="col">Instituição</th></tr></thead>
      <tbody>
        <tr v-for="animal in registros" :key="animal.id_animal">
          <td>{{ animal.id_animal }}</td>
          <td>{{ animal.tipo }}</td>
          <td>{{ animal.raca ?? '—' }}</td>
          <td>{{ nomesInstituicoes.get(animal.id_instituicao) ?? `Instituição #${animal.id_instituicao}` }}</td>
        </tr>
      </tbody>
    </table>
  </ListaAdmin>
</template>
