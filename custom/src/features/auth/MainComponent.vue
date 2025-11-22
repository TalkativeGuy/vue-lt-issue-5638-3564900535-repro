<script lang="ts" setup>
// This import is valid by the logic implemented in the TS and Vite plugins,
// but is obviously marked as invalid by the IDE if the TS plugin gets ignored
import { sum } from "./utils"

// try and comment this line - and the "./utils" import will become valid (TS plugin gets triggered and handles it)
import ImportedComponent from "./ImportedComponent.vue";

// you can then try and uncomment this line - and the "./utils" import will stay valid
// import { ImportedComponent } from ".";

/* 
Notice how in case of using the default import,
there are no messages from the plugin regarding this file in the TS Server log,
which means the plugin is not triggered at all.

If you switch to the second import, you will see the messages like these:
```
[TS-Plugin] resolveAndMaybeRewrite called for module "vue" from "/absolute/path/to/custom/src/features/auth/MainComponent.vue"
```
*/

defineProps<{
  foo?: string;
}>();

const a = ref(1);
const b = ref(2);
const sumAB = computed(() => sum(a.value,b.value));
</script>

<template>
  <ImportedComponent :message="`The sum of ${a} and ${b} is ${sumAB}`" />
</template>
