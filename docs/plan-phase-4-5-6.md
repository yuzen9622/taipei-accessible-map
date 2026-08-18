# 產品級工程修復實作計劃（Phase 4, 5, 6）

本計劃對應稽核報告 `docs/audit/2026-08-18-product-grade-audit.md` 中的建議處理順序 4, 5, 6 項。

---

## 專案規格與約束
1. **UI/UX 設計規範**：嚴格遵循 `ui-ux-pro-max` 技能標準（WCAG 2.1 AA、最小 44px 觸控熱區、骨架屏防止 Layout Shift、防連點、錯誤狀態單次提示）。
2. **Commit 策略**：每個 Phase 獨立進行 Conventional Commit。
3. **隔離規範**：不 commit `docs/audit/2026-08-18-product-grade-audit.md`。

---

## Phase 4：優化 GPS 錯誤處理防 Toast 轟炸（P1-4）
### 目標
解決 `navigator.geolocation.watchPosition` 在無訊號、地下區域或權限拒絕時每秒連續發送錯誤 Toast 的問題。

### 實作細節
1. **`src/components/ClientMap.tsx`**：
   - 建立狀態轉移型錯誤追蹤（如 `lastLocationErrorRef` 或 `isLocationErrorActive`），確保在連續收到定位錯誤時，僅在**狀態首次進入錯誤**時提示一次。
   - 當定位恢復正常時重置錯誤標記。
2. **測試防護**：
   - 新增/更新測試驗證連續定位失敗時錯誤處理行為。

---

## Phase 5：收斂 Nominatim 呼叫與修正 API 錯誤防護（P2-1, P2-4, P2-5）
### 目標
統一反向地理編碼 API、修復回報端點錯誤防護、補齊圖片上傳體積與格式檢查。

### 實作細節
1. **收斂 Nominatim API（P2-1）**：
   - 在 `src/lib/api/placeSearch.ts` 建立統一封裝 `reverseGeocode(lat, lng, lang)`：
     - 包含快取、自訂 User-Agent、結構化錯誤回傳與 OSM 格式轉換。
   - 將 5 個元件的直接 `fetch("https://nominatim...")` 替換為統一呼叫：
     1. `src/components/ClientMap.tsx:297`
     2. `src/components/ClientMap.tsx:389`
     3. `src/components/Sos/SosDialog.tsx:358`
     4. `src/components/BottomSheet/HazardReportPanel.tsx:103`
     5. `src/components/Wrapper/MapControlsWrapper.tsx:203`
2. **修復 `createHazardReport` 錯誤防護（P2-4）**：
   - 在 `src/lib/api/a11y.ts` 中以 `fetchRequest` 或健全的 HTTP 狀態碼檢查封裝 `createHazardReport`，確保遇到 502/504 等非 JSON 錯誤時優雅降級為 `ApiError`。
3. **圖片上傳客戶端驗證（P2-5）**：
   - 在 `HazardReportPanel.tsx` 加上檔案大小上限（5MB）與 MIME 類型檢查（`image/jpeg`, `image/png`, `image/webp` 等），並在超限時給予友善提示。
4. **單元測試**：
   - 補齊反向地理編碼與檔案驗證的單元測試。

---

## Phase 6：實施 Code Splitting 降低首頁體積（P2-3）
### 目標
透過動態延遲載入（`next/dynamic`），將非首屏核心的重型模組按需載入，降低首次載入 JS 體積。

### 實作細節
1. **`src/components/BottomSheet/BottomSheet.tsx`**：
   - 將次級面板（`EnvironmentPanel`, `WelfarePanel`, `HazardReportPanel`, `ParkingPanel`, `StationDetailContent`, `BusPanel`, `RouteExplanationPanel`, `SavedPlacesPanel` 等）改為 `next/dynamic` 載入，並搭配 `ui-ux-pro-max` 規格的平滑 Loading Fallback。
2. **`src/components/ClientMap.tsx`**：
   - 將 `AIChatBot`、`VoiceSessionHost`、`SosDialog` 改為動態載入。
3. **驗證**：
   - 執行 `npm run build` 確認首頁 Bundle 縮減，且所有功能運作正常。
