<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseDialog from '@/components/BaseDialog.vue'
import PassageForm, { type PassageFields } from '@/components/PassageForm.vue'
import PassageRow from '@/components/PassageRow.vue'
import PieceForm from '@/components/PieceForm.vue'
import SourceList from '@/components/SourceList.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db } from '@/data/db'
import { kindOf, loadPages } from '@/data/pages'
import { type NewPiece, repo } from '@/data/repo'
import { toDateKey } from '@/domain/schedule'
import { INSTRUMENT_NAMES, type Passage, type Source } from '@/domain/types'

const props = defineProps<{ pieceId: string }>()
const router = useRouter()
const today = toDateKey(new Date())

const data = useLiveQuery(
  async () => {
    const [piece, sources, passages] = await Promise.all([
      db.pieces.get(props.pieceId),
      db.sources.where('pieceId').equals(props.pieceId).sortBy('createdAt'),
      db.passages.where('pieceId').equals(props.pieceId).sortBy('createdAt'),
    ])
    return { piece: piece ?? null, sources, passages }
  },
  [() => props.pieceId],
)

const piece = computed(() => data.value?.piece ?? null)
const sources = computed(() => data.value?.sources ?? [])
const passages = computed(() => data.value?.passages ?? [])
const loaded = computed(() => data.value !== undefined)

// 樂譜上傳
const uploading = shallowRef(false)
const uploadError = shallowRef('')

async function addSources(files: File[]) {
  uploading.value = true
  uploadError.value = ''
  const failed: string[] = []
  for (const file of files) {
    const kind = kindOf(file)
    if (!kind) {
      failed.push(file.name)
      continue
    }
    try {
      const pages = await loadPages(kind, file)
      const pageCount = pages.pageCount
      pages.close()
      await repo.addSource(props.pieceId, { name: file.name, blob: file, kind, pageCount })
    }
    catch {
      failed.push(file.name)
    }
  }
  uploading.value = false
  if (failed.length > 0) {
    uploadError.value = `無法讀取：${failed.join('、')}。請確認是 PDF 或圖片檔，且檔案沒有損壞或加密。`
  }
}

function crop(source: Source) {
  void router.push({ name: 'crop', params: { pieceId: props.pieceId, sourceId: source.id } })
}

// 編輯曲目
const editingPiece = shallowRef(false)

async function savePiece(input: NewPiece) {
  await repo.updatePiece(props.pieceId, input)
  editingPiece.value = false
}

// 沒有譜面圖片的樂段，以及編輯既有樂段
const addingPassage = shallowRef(false)
const editingPassage = shallowRef<Passage | null>(null)
const passageDialogOpen = computed({
  get: () => addingPassage.value || editingPassage.value !== null,
  set: (open) => {
    if (!open) {
      addingPassage.value = false
      editingPassage.value = null
    }
  },
})

async function savePassage(fields: PassageFields) {
  if (editingPassage.value) {
    await repo.updatePassage(editingPassage.value.id, fields)
  }
  else {
    await repo.createPassage({ pieceId: props.pieceId, crops: [], origin: null, ...fields })
  }
  passageDialogOpen.value = false
}

// 刪除前的確認
interface PendingDelete {
  title: string
  message: string
  run: () => Promise<void>
}
const pendingDelete = shallowRef<PendingDelete | null>(null)
const confirmOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (open) => {
    if (!open) pendingDelete.value = null
  },
})

function askDeletePiece() {
  pendingDelete.value = {
    title: '刪除這首曲目？',
    message: `「${piece.value?.title}」的樂譜、${passages.value.length} 個樂段與所有練習紀錄都會刪除，無法復原。`,
    run: async () => {
      await repo.deletePiece(props.pieceId)
      await router.replace({ name: 'library' })
    },
  }
}

function askDeletePassage(passage: Passage) {
  pendingDelete.value = {
    title: '刪除這個樂段？',
    message: `「${passage.title}」與它的練習紀錄會刪除，無法復原。`,
    run: () => repo.deletePassage(passage.id),
  }
}

function askDeleteSource(source: Source) {
  pendingDelete.value = {
    title: '移除這份樂譜？',
    message: `「${source.name}」會從這台裝置移除。已經框選的樂段會保留，但無法再從這份樂譜重新框選。`,
    run: () => repo.deleteSource(source.id),
  }
}

async function confirmDelete() {
  const pending = pendingDelete.value
  pendingDelete.value = null
  await pending?.run()
}
</script>

<template>
  <div v-if="loaded && !piece" class="page">
    <div class="empty">
      <p>找不到這首曲目，可能已經被刪除。</p>
      <RouterLink class="btn" :to="{ name: 'library' }">
        回到曲目
      </RouterLink>
    </div>
  </div>

  <div v-else-if="piece" class="page">
    <header class="page-head">
      <div>
        <p class="soft small">
          {{ INSTRUMENT_NAMES[piece.instrument] }}<template v-if="piece.composer">，{{ piece.composer }}</template>
        </p>
        <h1>{{ piece.title }}</h1>
      </div>
      <div class="row">
        <button class="btn btn-quiet" @click="editingPiece = true">
          編輯
        </button>
        <button class="btn btn-danger" @click="askDeletePiece">
          刪除曲目
        </button>
      </div>
    </header>

    <section class="stack" aria-labelledby="passages-heading">
      <h2 id="passages-heading">
        樂段
      </h2>
      <div v-if="passages.length === 0" class="empty">
        <p>還沒有樂段。從下方的樂譜框出卡住的地方；如果你看紙本練，也可以建立不含譜面的樂段，只用節拍器和紀錄。</p>
      </div>
      <ul v-else class="passages">
        <li v-for="passage in passages" :key="passage.id" class="passage-item">
          <PassageRow :passage="passage" :today="today" />
          <div class="row passage-actions">
            <button class="btn btn-quiet" @click="editingPassage = passage">
              編輯
            </button>
            <button class="btn btn-danger" @click="askDeletePassage(passage)">
              刪除
            </button>
          </div>
        </li>
      </ul>
      <div class="row">
        <button class="btn" @click="addingPassage = true">
          建立不含譜面的樂段
        </button>
      </div>
    </section>

    <section class="stack" aria-labelledby="sources-heading">
      <h2 id="sources-heading">
        樂譜
      </h2>
      <SourceList
        :sources="sources"
        :busy="uploading"
        :error="uploadError"
        @add="addSources"
        @crop="crop"
        @remove="askDeleteSource"
      />
    </section>

    <BaseDialog v-model:open="editingPiece" title="編輯曲目">
      <PieceForm :initial="piece" submit-label="儲存" @submit="savePiece" @cancel="editingPiece = false" />
    </BaseDialog>

    <BaseDialog v-model:open="passageDialogOpen" :title="editingPassage ? '編輯樂段' : '建立樂段'">
      <PassageForm
        :key="editingPassage?.id ?? 'new'"
        :initial="editingPassage ?? undefined"
        :submit-label="editingPassage ? '儲存' : '建立'"
        @submit="savePassage"
        @cancel="passageDialogOpen = false"
      />
    </BaseDialog>

    <BaseDialog v-model:open="confirmOpen" :title="pendingDelete?.title ?? ''">
      <p>{{ pendingDelete?.message }}</p>
      <div class="row">
        <button class="btn btn-primary" @click="confirmDelete">
          刪除
        </button>
        <button class="btn btn-quiet" @click="confirmOpen = false">
          取消
        </button>
      </div>
    </BaseDialog>
  </div>
</template>

<style scoped>
.passages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.passage-item {
  display: grid;
  gap: 0.15rem;
}

.passage-actions {
  justify-content: flex-end;
}
</style>
