<script setup lang="ts">
import ListaAdmin from '@/components/ListaAdmin.vue'
import { listarAdotantes } from '@/services/adotantes'
</script>

<template>
  <ListaAdmin titulo="Adotantes" vazio="Nenhum adotante cadastrado." :consultar="listarAdotantes" v-slot="{ registros }">
    <table aria-label="Adotantes cadastrados">
      <thead>
        <tr>
          <th scope="col">ID</th><th scope="col">Nome</th><th scope="col">CPF</th>
          <th scope="col">Endereço</th><th scope="col">Tipo de residência</th><th scope="col">Quantidade de animais</th>
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
        </tr>
      </tbody>
    </table>
  </ListaAdmin>
</template>
