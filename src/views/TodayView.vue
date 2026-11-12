<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PassageRow from '@/components/PassageRow.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db } from '@/data/db'
import { longDate } from '@/domain/describe'
import { toDateKey } from '@/domain/schedule'

const now = new Date()
const today = toDateKey(now)
const dateLabel = longDate(now)

const data = useLiveQuery(async () => {
  const [pieces, passages, sessions] = await Promise.all([
    db.pieces.toArray(),
    db.passages.orderBy('due').toArray(),
    db.sessions.where('dateKey').equals(today).toArray(),
  ])
  const titles = new Map(pieces.map(p => [p.id, p.title]))
  const rows = passages.map(passage => ({ passage, pieceTitle: titles.get(passage.pieceId) ?? '' }))
  return {
    pieceCount: pieces.length,
    due: rows.filter(r => r.passage.due <= today),
    later: rows.filter(r => r.passage.due > today),
    practicedToday: new Set(sessions.map(s => s.passageId)).size,
  }
})

const loaded = computed(() => data.value !== undefined)
const due = computed(() => data.value?.due ?? [])
const later = computed(() => data.value?.later ?? [])
const hasPassages = computed(() => due.value.length + later.value.length > 0)

const headline = computed(() => {
  if (due.value.length > 0) return `今天該練 ${due.value.length} 段`
  if (data.value && data.value.practicedToday > 0) return '今天排定的都練完了'
  return '今天沒有排定的樂段'
})
</script>

<template>
  <div class="page">
    <header>
      <p class="soft">
        {{ dateLabel }}
      </p>
      <h1 v-if="loaded">
        {{ hasPassages ? headline : '從一段卡住的地方開始' }}
      </h1>
    </header>

    <div v-if="loaded && !hasPassages" class="empty">
      <p v-if="data?.pieceCount === 0">
        加入一首正在練的曲子，上傳樂譜，框出最卡的那幾小節。之後每天打開，這裡會告訴你今天該練哪幾段。
      </p>
      <p v-else>
        你已經有曲目了，但還沒有樂段。打開一首曲子，從樂譜框出卡住的地方。
      </p>
      <RouterLink class="btn btn-primary" :to="{ name: 'library' }">
        {{ data?.pieceCount === 0 ? '加入第一首曲目' : '打開曲目' }}
      </RouterLink>
    </div>

    <ul v-if="due.length > 0" class="list">
      <li v-for="row in due" :key="row.passage.id">
        <PassageRow :passage="row.passage" :piece-title="row.pieceTitle" :today="today" />
      </li>
    </ul>

    <section v-if="later.length > 0" class="stack" aria-labelledby="later-heading">
      <h2 id="later-heading">
        之後才到期
      </h2>
      <p class="soft small">
        想提前練也可以，直接打開就好。
      </p>
      <ul class="list">
        <li v-for="row in later" :key="row.passage.id">
          <PassageRow :passage="row.passage" :piece-title="row.pieceTitle" :today="today" />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
</style>
