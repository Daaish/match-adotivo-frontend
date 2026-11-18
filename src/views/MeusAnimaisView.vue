<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import FotoAnimal from '@/components/FotoAnimal.vue'
import { useGerenciamentoAnimais } from '@/composables/useGerenciamentoAnimais'
import { excluirAnimal, listarAnimaisProprios } from '@/services/animais'

// Identifica a consulta fixa da lista institucional — 18/11/2026.
function obterChave() { return 'meus-animais' }

// Carrega apenas os animais do vínculo autenticado — 18/11/2026.
function consultarLista(idInstituicao: number, _chave: string, sinal: AbortSignal) {
  return listarAnimaisProprios(idInstituicao, sinal)
}

const { resultado, enviando, mensagem, tentarNovamente, executar } =
  useGerenciamentoAnimais(obterChave, consultarLista)
const confirmacao = ref<number | null>(null)
const aviso = ref('')

// Exclui o item confirmado e atualiza a lista apenas após receber 204 — 18/11/2026.
async function confirmarExclusao(id: number) {
  if (confirmacao.value !== id || resultado.value?.tipo !== 'sucesso' || enviando.value) return
  if (!resultado.value.dados.some(function corresponde(animal) {
    // Confere se o animal ainda consta na lista própria — 18/11/2026.
    return animal.id_animal === id
  })) return

  confirmacao.value = null
  aviso.value = ''
  // Envia a exclusão usando o contexto ativo — 18/11/2026.
  const excluido = await executar(function enviar(_vinculo, sinal) { return excluirAnimal(id, sinal) })
  if (excluido && resultado.value?.tipo === 'sucesso') {
    // Remove da lista o item excluído com sucesso — 18/11/2026.
    resultado.value = { tipo: 'sucesso', dados: resultado.value.dados.filter(function manter(animal) {
      return animal.id_animal !== id
    }) }
    aviso.value = 'Animal excluído com sucesso.'
  }
}
</script>

<template>
  <main>
    <h1>Meus animais</h1>
    <p v-if="aviso" role="status">{{ aviso }}</p>
    <p v-if="mensagem" role="alert">{{ mensagem }}</p>
    <p v-if="!resultado" role="status">Carregando animais…</p>
    <div v-else-if="resultado.tipo === 'falha'">
      <p role="alert">{{ resultado.mensagem }}</p>
      <button v-if="resultado.permiteTentar" type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>
    <template v-else-if="resultado.tipo === 'sucesso'">
      <p v-if="!enviando"><RouterLink :to="{ name: 'novo-animal' }">Cadastrar animal</RouterLink></p>
      <p v-if="resultado.dados.length === 0" role="status">Sua instituição ainda não tem animais cadastrados.</p>
      <ul v-else class="animais">
        <li v-for="animal in resultado.dados" :key="animal.id_animal">
          <FotoAnimal :foto="animal.foto" />
          <h2>{{ animal.tipo }}</h2>
          <p v-if="animal.raca">{{ animal.raca }}</p>
          <div class="acoes">
            <template v-if="confirmacao === animal.id_animal">
              <p>Excluir este animal?</p>
              <button type="button" :disabled="enviando" @click="confirmarExclusao(animal.id_animal)">Confirmar exclusão</button>
              <button type="button" @click="confirmacao = null">Manter animal</button>
            </template>
            <template v-else>
              <RouterLink v-if="!enviando" :to="{ name: 'editar-animal', params: { id: animal.id_animal } }">Editar</RouterLink>
              <button type="button" :disabled="enviando" @click="confirmacao = animal.id_animal">Excluir</button>
            </template>
          </div>
        </li>
      </ul>
      <p v-if="enviando" role="status">Excluindo animal…</p>
    </template>
  </main>
</template>

<style scoped>
.animais {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: 1rem;
  padding: 0;
  list-style: none;
}

li {
  padding: 1rem;
  border: 1px solid #d9ded9;
  border-radius: 0.75rem;
}

.acoes {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
