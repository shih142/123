# MAXIMA 12D - QUANTUM TACTICAL HUD V4.0 (OPTIMIZED)

本專案為針對 `https://123-delta-pink.vercel.app/` 進行的全面功能與架構優化升級版本。

## 🚀 重點優化內容 (Optimization Highlights)

### 1. ⚡ 離線模擬與預設流派速測 (Presets & Mock Fallback)
- **痛點解決**：Supercell API 限制嚴格（常因動態 IP 回傳 403，或因玩家近期無天梯戰績回傳 `No battle logs`），原站會直接中斷並卡在紅色報錯。
- **升級**：
  - 新增四套經典天梯體系速測按鈕（**2.6 極速輪轉**、**暗夜重裝推進**、**迫擊自閉控場**、**皮卡刺客突進**），一鍵體驗完整演算。
  - API 無法連線時，可一鍵啟動「**量子模擬演算 (DEMO SIM)**」，根據玩家 Tag 生成合理化推演數據，保證視覺與體驗不中斷。

### 2. 🛡️ 後端 API 代理健全性升級 (`/api/clash-proxy.js`)
- **雙重降級回退**：同時請求 `/players/{tag}` 與 `/battlelog`。若戰鬥日誌為空，自動降級利用玩家個人資料與常用牌組推估 12 維度數據，大幅降低報錯率。
- **快取機制**：加入 `Cache-Control: s-maxage=180`，避免短時間內頻繁請求觸發 Supercell 速率限制。
- **精準錯誤提示**：明確標明是否為 Supercell IP 白名單未配置、標籤不存在或金鑰過期。

### 3. 🎯 12 維度戰術弱點與處方針斷 (Tactical Diagnostics)
- 新增戰術診斷摺疊面板，自動根據計算出的 12D 矩陣數值給出戰術建議：
  - **DEF 實體裝甲**：過低時提示補充低費拉扯或建築牌。
  - **ATK 爆發當量**：過低時提示反擊斬殺手段不足。
  - **SKL / SPD / CLT / STA**：全方位針對微操、節奏切換、極限逆轉率、掉血穩定度進行深入診斷。

### 4. 📊 天梯巔峰基準對比線 (Benchmark Overlay)
- 雷達圖右上角新增 `+天梯基準線` 切換開關，可在雷達圖上疊加天梯頂尖選手基準線（金黃色虛線），直觀對比攻防差距。

### 5. 🔊 Cyberpunk 原生音效系統 (Web Audio Synthesizer)
- 透過 Web Audio API 純代碼合成科幻音效（掃描聲、運算完成音、警報音），免除外連音檔載入失敗的風險。
- 右上角提供一鍵靜音/開啟開關 (`AUDIO: ON/OFF`)。

### 6. 🕒 歷史紀錄與操作流暢度 (History & UX)
- 支援 `Enter` 鍵直接觸發掃描。
- 自動過濾全形字元與 `#` 符號。
- 透過 LocalStorage 自動保留最近查詢的 5 筆標籤，隨時快速載入。

### 7. 📋 戰術情報一鍵匯出 (Export Tactical Intel)
- 右上角一鍵生成 Cyberpunk 風格純文字戰情報告，並複製到剪貼簿，方便分享到 Discord、社群討論區或 LINE 群組。

---

## 🛠️ 本地測試與預覽方式
直接使用瀏覽器開啟 `index.html` 即可體驗所有前端功能與預設流派演算！
