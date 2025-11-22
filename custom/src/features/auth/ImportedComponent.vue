<script lang="ts" setup>
defineProps<{
  message: string;
}>();
</script>

<template>
  Message: {{ message ?? "Default message" }}
</template>
