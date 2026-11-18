<script setup lang="ts">
import ListaAdmin from '@/components/ListaAdmin.vue'
import { listarUsuarios } from '@/services/usuarios'

const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <ListaAdmin titulo="Usuários" vazio="Nenhum usuário cadastrado." :consultar="listarUsuarios" v-slot="{ registros }">
    <table aria-label="Usuários cadastrados">
      <thead><tr><th scope="col">ID</th><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Cadastro</th></tr></thead>
      <tbody>
        <tr v-for="usuario in registros" :key="usuario.id">
          <td>{{ usuario.id }}</td>
          <td>{{ usuario.nome }}</td>
          <td>{{ usuario.email }}</td>
          <td><time :datetime="usuario.createdAt">{{ formatoData.format(new Date(usuario.createdAt)) }}</time></td>
        </tr>
      </tbody>
    </table>
  </ListaAdmin>
</template>
