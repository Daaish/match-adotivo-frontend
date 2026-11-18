<script setup lang="ts">
import { computed, ref } from 'vue'

const propriedades = defineProps<{ foto: string | null }>()
const fotoComFalha = ref<string | null>(null)

// Exibe apenas fotos HTTP ou HTTPS que ainda não falharam — 18/11/2026.
const url = computed(function obterFoto() {
  const foto = propriedades.foto
  if (!foto || fotoComFalha.value === foto || !/^https?:/i.test(foto)) return null
  return foto
})

// Registra a URL da imagem que falhou, mesmo que o animal exibido tenha mudado — 18/11/2026.
function registrarFalha(evento: Event) {
  const imagem = evento.currentTarget
  if (imagem instanceof HTMLImageElement && imagem.getAttribute('src') === url.value) {
    fotoComFalha.value = url.value
  }
}
</script>

<template>
  <img v-if="url" :key="url" :src="url" alt="" loading="lazy" referrerpolicy="no-referrer" @error="registrarFalha" />
  <div v-else class="foto-alternativa">Foto indisponível</div>
</template>

<style scoped>
img,
.foto-alternativa {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0.5rem;
  object-fit: cover;
}

.foto-alternativa {
  display: grid;
  place-items: center;
  background: #f0efeb;
  color: #3f443f;
}
</style>
