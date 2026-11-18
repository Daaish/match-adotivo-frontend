<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ListaAdmin from '@/components/ListaAdmin.vue'
import { useGestaoAdmin } from '@/composables/useGestaoAdmin'
import { excluirAdotante, listarAdotantes } from '@/services/adotantes'

const { enviando, bloqueado, mensagem, aviso, executar } = useGestaoAdmin()
const confirmacao = ref<number | null>(null)

// Exclui o registro confirmado e atualiza a lista pelo servidor — 18/11/2026.
async function confirmar(id: number, recarregar: () => Promise<void>) {
  if (confirmacao.value !== id || enviando.value || bloqueado.value) return
  confirmacao.value = null
  // Envia o DELETE somente para o registro confirmado — 18/11/2026.
  await executar('excluir', function enviar(sinal) { return excluirAdotante(id, sinal) }, recarregar)
}
</script>

<template>
  <ListaAdmin titulo="Adotantes" vazio="Nenhum adotante cadastrado." :consultar="listarAdotantes">
    <template #acoes>
      <p v-if="!bloqueado && !enviando"><RouterLink :to="{ name: 'admin-adotante-novo' }">Novo adotante</RouterLink></p>
      <p v-if="mensagem" role="alert">{{ mensagem }}</p>
      <p v-if="aviso" role="status">{{ aviso }}</p>
    </template>
    <template #default="{ registros, recarregar }">
      <table aria-label="Adotantes cadastrados">
        <thead>
          <tr>
            <th scope="col">ID</th><th scope="col">Nome</th><th scope="col">CPF</th>
            <th scope="col">Endereço</th><th scope="col">Tipo de residência</th><th scope="col">Quantidade de animais</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="adotante in registros" :key="adotante.id_adotante">
            <td>{{ adotante.id_adotante }}</td>
            <td>{{ adotante.nome }}</td>
            <td>{{ adotante.cpf }}</td>
            <td>{{ adotante.endereco }}</td>
            <td>{{ adotante.tipo_residencia }}</td>
            <td>{{ adotante.quantidade_animais }}</td>
            <td>
              <template v-if="confirmacao === adotante.id_adotante">
                <p>Confirmar a exclusão de {{ adotante.nome }}?</p>
                <button type="button" :disabled="enviando || bloqueado" @click="confirmar(adotante.id_adotante, recarregar)">Confirmar exclusão</button>
                <button type="button" @click="confirmacao = null">Voltar</button>
              </template>
              <template v-else>
                <RouterLink v-if="!enviando && !bloqueado" :to="{ name: 'admin-adotante-editar', params: { id: adotante.id_adotante } }">Editar</RouterLink>
                <button type="button" :disabled="enviando || bloqueado" @click="confirmacao = adotante.id_adotante">Excluir</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </ListaAdmin>
</template>
