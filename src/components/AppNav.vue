<script setup lang="ts">
import { RouterLink } from 'vue-router'

const items = [
  { to: '/', label: '今日', exact: true },
  { to: '/pieces', label: '曲目', exact: false },
  { to: '/settings', label: '設定', exact: false },
]
</script>

<template>
  <nav class="nav" aria-label="主選單">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :active-class="item.exact ? '' : 'nav-item-current'"
      exact-active-class="nav-item-current"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  display: flex;
  background: var(--ink);
  color: var(--paper);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 3.5rem;
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.08em;
  opacity: 0.6;
  border-top: 3px solid transparent;
}

.nav-item-current {
  opacity: 1;
  border-top-color: var(--felt);
}

@media (min-width: 56rem) {
  .nav {
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    width: 5.5rem;
    padding: 0;
  }

  .nav-item {
    flex: none;
    min-height: 4.5rem;
    border-top: 0;
    border-left: 4px solid transparent;
    writing-mode: vertical-rl;
    letter-spacing: 0.3em;
    font-size: var(--step-1);
  }

  .nav-item-current {
    border-left-color: var(--felt);
  }
}
</style>
