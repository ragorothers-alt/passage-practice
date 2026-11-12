<script setup lang="ts">
import { computed } from 'vue'
import {
  FAMILIES,
  FAMILY_ORDER,
  GROUP_SIZES,
  type GroupSize,
  type PatternFamily,
  type TempoMode,
  findPattern,
  patternsFor,
} from '@/domain/rhythm'

const groupSize = defineModel<GroupSize>('groupSize', { required: true })
const patternId = defineModel<string>('patternId', { required: true })
const tempoMode = defineModel<TempoMode>('tempoMode', { required: true })

const all = computed(() => patternsFor(groupSize.value))
const current = computed(() => findPattern(groupSize.value, patternId.value))

const families = computed(() =>
  FAMILY_ORDER.filter(family => all.value.some(p => p.family === family)).map(family => FAMILIES[family]),
)

const variants = computed(() => all.value.filter(p => p.family === current.value.family))
const purpose = computed(() => FAMILIES[current.value.family].purpose)

/** 只有長短不一的節奏型才需要選速度算法；爆發與落點兩種算法結果相同 */
const canStretch = computed(() => {
  const weights = current.value.notes.map(n => n.weight)
  return current.value.family !== 'burst' && new Set(weights).size > 1
})

const keepShort = computed({
  get: () => tempoMode.value === 'keepShort',
  set: (on) => { tempoMode.value = on ? 'keepShort' : 'keepPulse' },
})

function pickFamily(family: PatternFamily) {
  if (family === current.value.family) return
  const first = all.value.find(p => p.family === family)
  if (first) patternId.value = first.id
}

function pickGroupSize(n: GroupSize) {
  groupSize.value = n
  // 換了分組大小後，原本的節奏型可能不存在，退回同類的第一種或原節奏
  const next = patternsFor(n)
  if (!next.some(p => p.id === patternId.value)) {
    const sameFamily = next.find(p => p.family === current.value.family)
    patternId.value = (sameFamily ?? next[0]!).id
  }
}
</script>

<template>
  <div class="picker">
    <div class="field">
      <span class="field-label small">幾個音一組</span>
      <div class="segments" role="radiogroup" aria-label="幾個音一組">
        <button
          v-for="n in GROUP_SIZES"
          :key="n"
          type="button"
          class="segment figure picker-size"
          role="radio"
          :aria-checked="groupSize === n"
          @click="pickGroupSize(n)"
        >
          {{ n }}
        </button>
      </div>
    </div>

    <div class="field">
      <span class="field-label small">練法</span>
      <div class="segments" role="radiogroup" aria-label="練法">
        <button
          v-for="family in families"
          :key="family.family"
          type="button"
          class="segment"
          role="radio"
          :aria-checked="current.family === family.family"
          @click="pickFamily(family.family)"
        >
          {{ family.name }}
        </button>
      </div>
    </div>

    <p class="picker-purpose small">
      {{ purpose }}
    </p>

    <div v-if="variants.length > 1" class="segments" role="radiogroup" aria-label="變化">
      <button
        v-for="variant in variants"
        :key="variant.id"
        type="button"
        class="segment picker-variant"
        role="radio"
        :aria-checked="current.id === variant.id"
        @click="patternId = variant.id"
      >
        {{ variant.label }}
      </button>
    </div>

    <label v-if="canStretch" class="picker-check small">
      <input v-model="keepShort" type="checkbox" class="picker-checkbox">
      <span>短音不加速：短音維持原節奏的速度，長音多出來的時間直接加上去</span>
    </label>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 0.8rem;
}

.picker-size {
  flex: 1;
  font-size: var(--step-1);
}

.picker-purpose {
  color: var(--ink-soft);
  line-height: 1.55;
}

.picker-variant {
  font-size: var(--step--1);
  padding: 0 0.7em;
}

.picker-check {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem;
  align-items: start;
  line-height: 1.5;
  cursor: pointer;
}

.picker-checkbox {
  width: 1.4rem;
  height: 1.4rem;
  margin: 0.1rem 0 0;
  accent-color: var(--ink);
}
</style>
