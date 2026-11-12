<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseDialog from '@/components/BaseDialog.vue'
import PieceForm from '@/components/PieceForm.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db } from '@/data/db'
import { type NewPiece, repo } from '@/data/repo'
import { INSTRUMENT_NAMES } from '@/domain/types'

const router = useRouter()
const adding = shallowRef(false)

const data = useLiveQuery(async () => {
  const [pieces, passages] = await Promise.all([
    db.pieces.orderBy('createdAt').reverse().toArray(),
    db.passages.toArray(),
  ])
  const counts = new Map<string, number>()
  for (const p of passages) counts.set(p.pieceId, (counts.get(p.pieceId) ?? 0) + 1)
  return pieces.map(piece => ({ piece, passageCount: counts.get(piece.id) ?? 0 }))
})

const rows = computed(() => data.value ?? [])
const loaded = computed(() => data.value !== undefined)

async function add(input: NewPiece) {
  const piece = await repo.createPiece(input)
  adding.value = false
  await router.push({ name: 'piece', params: { pieceId: piece.id } })
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1>曲目</h1>
      <button class="btn btn-primary" @click="adding = true">
        加入曲目
      </button>
    </header>

    <div v-if="loaded && rows.length === 0" class="empty">
      <p>還沒有曲目。先加入一首正在練的曲子，再上傳樂譜、框出卡住的樂段。</p>
      <button class="btn btn-primary" @click="adding = true">
        加入第一首曲目
      </button>
    </div>

    <ul v-else class="pieces">
      <li v-for="row in rows" :key="row.piece.id">
        <RouterLink :to="{ name: 'piece', params: { pieceId: row.piece.id } }" class="piece sheet">
          <span class="piece-title">{{ row.piece.title }}</span>
          <span class="soft small">
            {{ INSTRUMENT_NAMES[row.piece.instrument] }}<template v-if="row.piece.composer">，{{ row.piece.composer }}</template>
          </span>
          <span class="piece-count small">
            <span class="figure piece-num">{{ row.passageCount }}</span> 個樂段
          </span>
        </RouterLink>
      </li>
    </ul>

    <BaseDialog v-model:open="adding" title="加入曲目">
      <PieceForm submit-label="加入" @submit="add" @cancel="adding = false" />
    </BaseDialog>
  </div>
</template>

<style scoped>
.pieces {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: var(--gap);
}

.piece {
  display: grid;
  gap: 0.2rem;
  padding: 1.1rem 1.2rem 1rem;
  text-decoration: none;
  border-top: 4px solid var(--ink);
  height: 100%;
}

.piece-title {
  font-size: var(--step-1);
  font-weight: 700;
  line-height: 1.3;
}

.piece-count {
  margin-top: 0.6rem;
}

.piece-num {
  font-size: var(--step-1);
}
</style>
