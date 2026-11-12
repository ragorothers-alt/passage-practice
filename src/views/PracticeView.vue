<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PracticeDesk from '@/components/practice/PracticeDesk.vue'
import { db } from '@/data/db'
import type { Passage } from '@/domain/types'

const props = defineProps<{ passageId: string }>()
const router = useRouter()

// 只在進入時讀一次：練習中的狀態由練習畫面自己掌握，不該被資料庫的更新打斷
const passage = shallowRef<Passage | null>(null)
const pieceTitle = shallowRef('')
const missing = shallowRef(false)

watch(
  () => props.passageId,
  async (id) => {
    passage.value = null
    missing.value = false
    const found = await db.passages.get(id)
    if (id !== props.passageId) return
    if (!found) {
      missing.value = true
      return
    }
    pieceTitle.value = (await db.pieces.get(found.pieceId))?.title ?? ''
    passage.value = found
  },
  { immediate: true },
)

function leave() {
  if (window.history.state?.back) router.back()
  else void router.replace({ name: 'today' })
}
</script>

<template>
  <PracticeDesk v-if="passage" :key="passage.id" :passage="passage" :piece-title="pieceTitle" @leave="leave" />
  <div v-else-if="missing" class="page">
    <div class="empty">
      <p>找不到這個樂段，可能已經被刪除。</p>
      <RouterLink class="btn" :to="{ name: 'today' }">
        回到今日
      </RouterLink>
    </div>
  </div>
</template>
