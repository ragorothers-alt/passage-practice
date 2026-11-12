# 樂段練習

幫自己練鋼琴與小提琴的小工具：把樂譜裡卡住的樂段框出來，用不同的節奏型練，並記住每一段練到哪裡、下次什麼時候該複習。

所有資料（樂譜、樂段、練習紀錄）只存在使用裝置的瀏覽器裡，不會上傳到任何地方。換裝置或清除瀏覽器資料前，請到「設定」匯出備份。

## 開發

```bash
pnpm install
pnpm dev
```

```bash
pnpm test
```

## 部署

推送到 `main` 分支後，GitHub Actions 會自動測試、建置並發佈到 GitHub Pages。

## 結構

- `src/domain`：節奏型、速度階梯、複習排程的純邏輯與測試
- `src/data`：本機資料庫（IndexedDB）、PDF／圖片讀取、備份
- `src/audio`：節拍器引擎
- `src/components`、`src/views`：畫面
