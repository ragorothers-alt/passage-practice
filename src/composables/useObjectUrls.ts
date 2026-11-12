import { type MaybeRefOrGetter, onScopeDispose, shallowRef, toValue, watch } from 'vue'

/** 把存在資料庫裡的圖片轉成可以放進 <img> 的網址，用完自動釋放 */
export function useObjectUrls(blobs: MaybeRefOrGetter<Blob[] | undefined>) {
  const urls = shallowRef<string[]>([])

  function release() {
    for (const url of urls.value) URL.revokeObjectURL(url)
  }

  watch(
    () => toValue(blobs),
    (next) => {
      release()
      urls.value = (next ?? []).map(b => URL.createObjectURL(b))
    },
    { immediate: true },
  )

  onScopeDispose(release)

  return urls
}
