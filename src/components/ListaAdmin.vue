<script setup lang="ts" generic="Registro">
import { useConsultaAdmin, type ConsultaAdmin } from '@/composables/useConsultaAdmin'

const propriedades = defineProps<{
  titulo: string
  vazio: string
  consultar: ConsultaAdmin<Registro[]>
}>()

defineSlots<{
  acoes?(): unknown
  default(props: { registros: Registro[]; recarregar: () => Promise<void> }): unknown
}>()

const { dados, carregando, erro, carregar } = useConsultaAdmin(propriedades.consultar)
</script>

<template>
  <main>
    <h1>{{ titulo }}</h1>
    <slot name="acoes" />
    <p v-if="carregando" role="status">Carregando registros…</p>
    <div v-else-if="erro">
      <p role="alert">{{ erro }}</p>
      <button type="button" @click="carregar">Tentar novamente</button>
    </div>
    <p v-else-if="dados?.length === 0" role="status">{{ vazio }}</p>
    <div v-else-if="dados" class="registros">
      <slot :registros="dados" :recarregar="carregar" />
    </div>
  </main>
</template>

<style scoped>
.registros {
  overflow-x: auto;
}

.registros :slotted(table) {
  width: 100%;
  border-collapse: collapse;
}

.registros :deep(th),
.registros :deep(td) {
  padding: 0.65rem;
  border-bottom: 1px solid #d9ded9;
  text-align: start;
  vertical-align: top;
}
</style>
