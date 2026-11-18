<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="area-admin">
    <nav aria-label="Área de administração">
      <RouterLink :to="{ name: 'inicio-admin' }">Início</RouterLink>
      <RouterLink :to="{ name: 'admin-usuarios' }">Usuários</RouterLink>
      <RouterLink :to="{ name: 'admin-instituicoes' }">Instituições</RouterLink>
      <RouterLink :to="{ name: 'admin-adotantes' }">Adotantes</RouterLink>
      <RouterLink :to="{ name: 'admin-animais' }">Animais</RouterLink>
      <RouterLink :to="{ name: 'admin-solicitacoes' }">Solicitações</RouterLink>
    </nav>
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.path" />
    </RouterView>
  </div>
</template>

<style scoped>
.area-admin {
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
