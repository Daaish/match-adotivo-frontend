<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ListaAdmin from '@/components/ListaAdmin.vue'
import { useGestaoAdmin } from '@/composables/useGestaoAdmin'
import { excluirInstituicao, listarInstituicoes } from '@/services/instituicoes'

const { enviando, bloqueado, mensagem, aviso, executar } = useGestaoAdmin()
const confirmacao = ref<number | null>(null)

// Exclui o registro confirmado e atualiza a lista pelo servidor — 18/11/2026.
async function confirmar(id: number, recarregar: () => Promise<void>) {
  if (confirmacao.value !== id || enviando.value || bloqueado.value) return
  confirmacao.value = null
  // Envia o DELETE somente para o registro confirmado — 18/11/2026.
  await executar('excluir', function enviar(sinal) { return excluirInstituicao(id, sinal) }, recarregar)
}
</script>

<template>
  <ListaAdmin titulo="Instituições" vazio="Nenhuma instituição cadastrada." :consultar="listarInstituicoes">
    <template #acoes>
      <p v-if="!bloqueado && !enviando"><RouterLink :to="{ name: 'admin-instituicao-nova' }">Nova instituição</RouterLink></p>
      <p v-if="mensagem" role="alert">{{ mensagem }}</p>
      <p v-if="aviso" role="status">{{ aviso }}</p>
    </template>
    <template #default="{ registros, recarregar }">
      <table aria-label="Instituições cadastradas">
        <thead><tr><th scope="col">ID</th><th scope="col">Razão social</th><th scope="col">CNPJ</th><th scope="col">Endereço</th><th scope="col">Ações</th></tr></thead>
        <tbody>
          <tr v-for="instituicao in registros" :key="instituicao.id_instituicao">
            <td>{{ instituicao.id_instituicao }}</td>
            <td>{{ instituicao.razao_social }}</td>
            <td>{{ instituicao.cnpj }}</td>
            <td>{{ instituicao.endereco }}</td>
            <td>
              <template v-if="confirmacao === instituicao.id_instituicao">
                <p>Confirmar a exclusão de {{ instituicao.razao_social }}?</p>
                <button type="button" :disabled="enviando || bloqueado" @click="confirmar(instituicao.id_instituicao, recarregar)">Confirmar exclusão</button>
                <button type="button" @click="confirmacao = null">Voltar</button>
              </template>
              <template v-else>
                <RouterLink v-if="!enviando && !bloqueado" :to="{ name: 'admin-instituicao-editar', params: { id: instituicao.id_instituicao } }">Editar</RouterLink>
                <button type="button" :disabled="enviando || bloqueado" @click="confirmacao = instituicao.id_instituicao">Excluir</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </ListaAdmin>
</template>
