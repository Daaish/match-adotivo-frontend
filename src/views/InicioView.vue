<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const rota = useRoute()
const roteador = useRouter()

// Repete a consulta ao perfil pela guarda da rota inicial — 18/11/2026.
async function tentarNovamente() {
  await roteador.replace({ name: 'inicio', force: true })
}
</script>

<template>
  <main>
    <h1>Início do Match Adotivo</h1>
    <template v-if="rota.meta.erroPerfil">
      <p role="alert">{{ rota.meta.erroPerfil }}</p>
      <button type="button" @click="tentarNovamente">Tentar novamente</button>
    </template>
    <p v-else role="status">Sua conta ainda não tem um perfil com área inicial disponível.</p>
  </main>
</template>
