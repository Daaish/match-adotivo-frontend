<script setup lang="ts">
import ListaAdmin from '@/components/ListaAdmin.vue'
import { listarInstituicoes } from '@/services/instituicoes'
</script>

<template>
  <ListaAdmin titulo="Instituições" vazio="Nenhuma instituição cadastrada." :consultar="listarInstituicoes" v-slot="{ registros }">
    <table aria-label="Instituições cadastradas">
      <thead><tr><th scope="col">ID</th><th scope="col">Razão social</th><th scope="col">CNPJ</th><th scope="col">Endereço</th></tr></thead>
      <tbody>
        <tr v-for="instituicao in registros" :key="instituicao.id_instituicao">
          <td>{{ instituicao.id_instituicao }}</td>
          <td>{{ instituicao.razao_social }}</td>
          <td>{{ instituicao.cnpj }}</td>
          <td>{{ instituicao.endereco }}</td>
        </tr>
      </tbody>
    </table>
  </ListaAdmin>
</template>
