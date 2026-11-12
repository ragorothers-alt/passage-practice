<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

const props = defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })

const el = useTemplateRef<HTMLDialogElement>('dialog')

watch(
  [open, el],
  ([isOpen, dialog]) => {
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  },
  { immediate: true },
)
</script>

<template>
  <dialog ref="dialog" class="dialog" :aria-label="props.title" @close="open = false">
    <div v-if="open" class="dialog-body">
      <h2>{{ props.title }}</h2>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(34rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 24px 60px -20px rgb(28 43 39 / 60%);
}

.dialog::backdrop {
  background: rgb(28 43 39 / 55%);
}

.dialog-body {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem;
}
</style>
