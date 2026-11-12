<script setup lang="ts">
import type { ColdTest } from '@/domain/schedule'

const props = defineProps<{
  targetBpm: number
  playing: boolean
}>()

const emit = defineEmits<{
  toggle: []
  result: [value: ColdTest]
  skip: []
}>()
</script>

<template>
  <section class="cold" aria-labelledby="cold-heading">
    <h2 id="cold-heading">
      冷啟動測試
    </h2>
    <p>
      今天第一次彈這段。先不要暖身，直接用目標速度
      <span class="figure cold-num">{{ props.targetBpm }}</span>
      彈一次原節奏。
    </p>
    <p class="small soft">
      這一次的結果最能代表你真的學會了沒，也決定這段多久之後再出現。
    </p>
    <button type="button" class="btn" @click="emit('toggle')">
      {{ props.playing ? '停止拍子' : '打目標速度的拍子' }}
    </button>
    <div class="cold-answers">
      <button type="button" class="btn cold-pass" @click="emit('result', 'pass')">
        過了
      </button>
      <button type="button" class="btn cold-fail" @click="emit('result', 'fail')">
        沒過
      </button>
    </div>
    <button type="button" class="btn btn-quiet" @click="emit('skip')">
      今天跳過測試
    </button>
  </section>
</template>

<style scoped>
.cold {
  display: grid;
  gap: 0.8rem;
  padding: 1.1rem;
  background: var(--paper);
  border-top: 4px solid var(--brass);
  border-radius: 3px;
}

.cold-num {
  font-size: 1.5em;
  line-height: 1;
  color: var(--brass);
}

.cold-answers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.cold-pass {
  min-height: 3.5rem;
  border-color: var(--pine);
  background: var(--pine);
  color: #fff;
  font-size: var(--step-1);
}

.cold-fail {
  min-height: 3.5rem;
  font-size: var(--step-1);
}
</style>
