<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="area-adotante">
    <nav aria-label="Área do adotante">
      <RouterLink :to="{ name: 'inicio-adotante' }">Início</RouterLink>
      <RouterLink :to="{ name: 'catalogo-animais' }">Catálogo de animais</RouterLink>
      <RouterLink :to="{ name: 'minhas-solicitacoes' }">Minhas solicitações</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.area-adotante {
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
