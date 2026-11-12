<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppNav from './components/AppNav.vue'

const route = useRoute()
const bare = computed(() => route.meta.bare === true)
</script>

<template>
  <div class="shell" :class="{ 'shell-bare': bare }">
    <AppNav v-if="!bare" class="shell-nav" />
    <main class="shell-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 1fr auto;
}

.shell-nav {
  grid-row: 2;
  position: sticky;
  bottom: 0;
  z-index: 5;
}

.shell-main {
  grid-row: 1;
  min-width: 0;
}

.shell-bare {
  grid-template-rows: 1fr;
}

/* 平板橫放時選單移到左側，把垂直空間留給內容 */
@media (min-width: 56rem) {
  .shell {
    grid-template-rows: none;
    grid-template-columns: auto 1fr;
  }

  .shell-nav {
    grid-row: auto;
    position: sticky;
    top: 0;
    bottom: auto;
    height: 100dvh;
  }

  .shell-main {
    grid-row: auto;
  }

  .shell-bare {
    grid-template-columns: 1fr;
  }
}
</style>
