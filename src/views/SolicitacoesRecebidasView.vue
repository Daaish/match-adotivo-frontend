<script setup lang="ts">
import { ref } from 'vue'
import FotoAnimal from '@/components/FotoAnimal.vue'
import { useSolicitacoesRecebidas } from '@/composables/useSolicitacoesRecebidas'
import type { StatusMatch } from '@/services/matches'

const {
  solicitacoes, animais, carregando, atualizandoId, erro, aviso, temVinculo,
  transicoes, atualizar, tentarNovamente,
} = useSolicitacoesRecebidas()
const confirmacao = ref<{ id: number; status: 'APROVADO' | 'CANCELADO' } | null>(null)
const dataDoPedido = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const rotulos = {
  PENDENTE: 'Voltar para pendente',
  'EM ANDAMENTO': 'Colocar em andamento',
  APROVADO: 'Aprovar',
  CANCELADO: 'Recusar',
}

// Pede confirmação para decisões finais e envia as demais transições — 18/11/2026.
async function selecionar(id: number, status: StatusMatch) {
  if (status === 'APROVADO' || status === 'CANCELADO') confirmacao.value = { id, status }
  else await atualizar(id, status)
}

// Envia a decisão confirmada e fecha a confirmação — 18/11/2026.
async function confirmarDecisao(id: number) {
  const decisao = confirmacao.value
  if (!decisao || decisao.id !== id) return
  confirmacao.value = null
  await atualizar(id, decisao.status)
}
</script>

<template>
  <main>
    <h1>Solicitações recebidas</h1>
    <p v-if="carregando" role="status">Carregando solicitações…</p>
    <p v-if="aviso" role="status">{{ aviso }}</p>
    <div v-if="erro">
      <p role="alert">{{ erro }}</p>
      <button v-if="temVinculo" type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>
    <p v-if="!carregando && !erro && solicitacoes.length === 0" role="status">
      Sua instituição ainda não recebeu solicitações de adoção.
    </p>
    <ul v-if="solicitacoes.length" class="solicitacoes">
      <li v-for="match in solicitacoes" :key="match.id_match" class="solicitacao">
        <div class="foto"><FotoAnimal :foto="animais.get(match.id_animal)?.foto ?? null" /></div>
        <div>
          <h2>{{ animais.get(match.id_animal)?.tipo ?? `Animal #${match.id_animal}` }}</h2>
          <p v-if="animais.get(match.id_animal)?.raca">{{ animais.get(match.id_animal)?.raca }}</p>
          <p>Solicitada em <time :datetime="match.data_pedido">{{ dataDoPedido.format(new Date(match.data_pedido)) }}</time></p>
          <p>Status <strong>{{ match.status }}</strong></p>
          <p v-if="!animais.has(match.id_animal)">O vínculo deste animal com a instituição não foi confirmado.</p>
          <p v-if="atualizandoId === match.id_match" role="status">Atualizando solicitação…</p>
          <div v-if="transicoes(match).length" class="acoes">
            <template v-if="confirmacao?.id === match.id_match && transicoes(match).includes(confirmacao.status)">
              <p>
                {{ confirmacao.status === 'CANCELADO'
                  ? 'Recusar esta solicitação? O sistema registra a recusa como cancelamento.'
                  : 'Aprovar esta solicitação? A aprovação não pode ser revertida.' }}
              </p>
              <button
                type="button"
                :disabled="carregando || !!erro || atualizandoId !== null"
                @click="confirmarDecisao(match.id_match)"
              >{{ confirmacao.status === 'CANCELADO' ? 'Confirmar recusa' : 'Confirmar aprovação' }}</button>
              <button type="button" @click="confirmacao = null">Voltar</button>
            </template>
            <template v-else>
              <button
                v-for="status in transicoes(match)"
                :key="status"
                type="button"
                :disabled="carregando || !!erro || atualizandoId !== null"
                @click="selecionar(match.id_match, status)"
              >{{ rotulos[status] }}</button>
            </template>
          </div>
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

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.acoes p {
  flex-basis: 100%;
  margin-block: 0;
}
</style>
