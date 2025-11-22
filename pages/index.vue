<script setup lang="ts">
/*
Notice how for the first import, the "Go To Definition" option leads to the original file in /src (meaning the TS plugin doesn't work here),
while for the second import it resolves to the custom file in /custom/src, which is the way the TS plugin is intended to work.
(comment and uncomment the imports below to see the difference)
*/

import MainComponent from '~/src/features/auth/MainComponent.vue';
// import { MainComponent } from '~/src/features/auth';
</script>

<template>
  <!-- 
    Notice how the type validation for props keeps working in both cases,
    displaying a type error when you switch to the second import: just like it should,
    because in the custom file the type of `foo` is `string` instead of `number`
  -->
  <MainComponent :foo="1" />
</template>
