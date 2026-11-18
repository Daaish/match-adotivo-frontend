<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="area-instituicao">
    <nav class="navegacao-perfil" aria-label="Área da instituição">
      <RouterLink :to="{ name: 'inicio-instituicao' }">Início</RouterLink>
      <RouterLink :to="{ name: 'meus-animais' }">Meus animais</RouterLink>
      <RouterLink :to="{ name: 'solicitacoes-recebidas' }">Solicitações recebidas</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.area-instituicao {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
