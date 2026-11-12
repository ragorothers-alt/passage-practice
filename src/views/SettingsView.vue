<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import { usePreferences } from '@/composables/usePreferences'
import { type BackupFile, exportBackup, importBackup, parseBackup } from '@/data/backup'
import { describeSaveError } from '@/data/errors'
import { toDateKey } from '@/domain/schedule'

const prefs = usePreferences()

const countInOptions = [0, 2, 4]
const stepOptions = [2, 4, 6, 8]
const repsOptions = [2, 3, 5]

// 儲存空間
const usage = shallowRef('')
const persisted = shallowRef<boolean | null>(null)

onMounted(async () => {
  if (!navigator.storage?.estimate) return
  const { usage: used } = await navigator.storage.estimate()
  if (used !== undefined) usage.value = `${(used / 1024 / 1024).toFixed(1)} MB`
  persisted.value = (await navigator.storage.persisted?.()) ?? null
})

// 匯出
const includeSources = shallowRef(false)
const exporting = shallowRef(false)
const message = shallowRef('')
const failure = shallowRef('')

async function download() {
  exporting.value = true
  message.value = ''
  failure.value = ''
  try {
    const backup = await exportBackup({ includeSources: includeSources.value })
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `樂段練習備份-${toDateKey(new Date())}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    message.value = `已匯出 ${backup.pieces.length} 首曲目、${backup.passages.length} 個樂段、${backup.sessions.length} 筆紀錄。請到下載資料夾確認檔案。`
  }
  catch (err) {
    failure.value = describeSaveError(err, '匯出備份')
  }
  finally {
    exporting.value = false
  }
}

// 匯入：先讀檔、再確認、才取代
const picker = useTemplateRef<HTMLInputElement>('picker')
const pending = shallowRef<BackupFile | null>(null)
const confirming = shallowRef(false)

async function onPick(event: Event) {
  const el = event.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  message.value = ''
  failure.value = ''
  try {
    pending.value = parseBackup(await file.text())
    confirming.value = true
  }
  catch (err) {
    failure.value = err instanceof Error ? err.message : '無法讀取這個檔案'
  }
}

async function restore() {
  const backup = pending.value
  confirming.value = false
  pending.value = null
  if (!backup) return
  try {
    await importBackup(backup)
    message.value = `已還原 ${backup.pieces.length} 首曲目、${backup.passages.length} 個樂段、${backup.sessions.length} 筆紀錄。`
  }
  catch (err) {
    failure.value = `${describeSaveError(err, '還原備份')} 原本的資料沒有被更動。`
  }
}
</script>

<template>
  <div class="page">
    <header>
      <h1>設定</h1>
    </header>

    <section class="stack" aria-labelledby="metronome-heading">
      <h2 id="metronome-heading">
        節拍器
      </h2>
      <label class="check">
        <input v-model="prefs.rhythmSound" type="checkbox" class="check-box">
        <span>每個音都響<span class="field-hint check-hint">把節奏型打出來，重音的聲音比較高</span></span>
      </label>
      <label class="check">
        <input v-model="prefs.pulseSound" type="checkbox" class="check-box">
        <span>另外打拍點<span class="field-hint check-hint">用較低的聲音打出等距的拍子</span></span>
      </label>
      <div class="field">
        <span class="field-label">預備拍</span>
        <div class="segments" role="radiogroup" aria-label="預備拍">
          <button
            v-for="n in countInOptions"
            :key="n"
            type="button"
            class="segment"
            role="radio"
            :aria-checked="prefs.countInBeats === n"
            @click="prefs.countInBeats = n"
          >
            {{ n === 0 ? '不要' : `${n} 拍` }}
          </button>
        </div>
        <span class="field-hint">按下開始後先數幾拍，讓你有時間把手放回樂器上。</span>
      </div>
    </section>

    <section class="stack" aria-labelledby="ladder-heading">
      <h2 id="ladder-heading">
        速度階梯
      </h2>
      <div class="field">
        <span class="field-label">每次加多少</span>
        <div class="segments" role="radiogroup" aria-label="每次加多少">
          <button
            v-for="n in stepOptions"
            :key="n"
            type="button"
            class="segment"
            role="radio"
            :aria-checked="prefs.ladderStep === n"
            @click="prefs.ladderStep = n"
          >
            +{{ n }}
          </button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">連續乾淨幾次才加速</span>
        <div class="segments" role="radiogroup" aria-label="連續乾淨幾次才加速">
          <button
            v-for="n in repsOptions"
            :key="n"
            type="button"
            class="segment"
            role="radio"
            :aria-checked="prefs.ladderCleanReps === n"
            @click="prefs.ladderCleanReps = n"
          >
            {{ n }} 次
          </button>
        </div>
      </div>
    </section>

    <section class="stack" aria-labelledby="backup-heading">
      <h2 id="backup-heading">
        備份
      </h2>
      <p>
        所有資料只存在這台裝置的瀏覽器裡。清除瀏覽器資料或換裝置前，請先匯出備份。
      </p>
      <p v-if="usage" class="soft small">
        目前使用 {{ usage }}。
        <template v-if="persisted === true">
          瀏覽器已同意不會自動清除這些資料。
        </template>
        <template v-else-if="persisted === false">
          瀏覽器在空間不足時可能自動清除，建議定期匯出；把 App 安裝到主畫面後通常就不會被清除。
        </template>
      </p>
      <label class="check">
        <input v-model="includeSources" type="checkbox" class="check-box">
        <span>包含原始樂譜檔<span class="field-hint check-hint">檔案會大很多。不包含時，樂段的譜面圖片與所有紀錄仍會保留。</span></span>
      </label>
      <div class="row">
        <button class="btn btn-primary" :disabled="exporting" @click="download">
          {{ exporting ? '匯出中…' : '匯出備份' }}
        </button>
        <button class="btn" @click="picker?.click()">
          從備份還原
        </button>
        <input ref="picker" type="file" accept="application/json,.json" hidden @change="onPick">
      </div>
      <p v-if="message" class="note-ok" role="status">
        {{ message }}
      </p>
      <p v-if="failure" class="note-bad" role="alert">
        {{ failure }}
      </p>
    </section>

    <BaseDialog v-model:open="confirming" title="用備份取代目前的資料？">
      <p v-if="pending">
        備份裡有 {{ pending.pieces.length }} 首曲目、{{ pending.passages.length }} 個樂段、{{ pending.sessions.length }} 筆紀錄，匯出於
        {{ pending.exportedAt.slice(0, 10) }}。這台裝置上目前的所有資料會被取代，無法復原。
      </p>
      <div class="row">
        <button class="btn btn-primary" @click="restore">
          取代並還原
        </button>
        <button class="btn btn-quiet" @click="confirming = false">
          取消
        </button>
      </div>
    </BaseDialog>
  </div>
</template>

<style scoped>
.check {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
  cursor: pointer;
}

.check-box {
  width: 1.5rem;
  height: 1.5rem;
  margin: 0.15rem 0 0;
  accent-color: var(--ink);
}

.check-hint {
  display: block;
}

.note-ok {
  color: var(--pine);
  font-weight: 600;
}

.note-bad {
  color: var(--felt);
  font-weight: 600;
}
</style>
