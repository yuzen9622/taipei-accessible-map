# 產品級工程修復實作計劃（Phase 1, 2, 3）

本計劃對應稽核報告 `docs/audit/2026-08-18-product-grade-audit.md` 中的建議處理順序 1, 2, 3 項。

---

## 專案規格與約束
1. **UI/UX 設計規範**：嚴格遵循 `ui-ux-pro-max` 技能標準與本專案既有設計體系（Tailwind CSS, Shadcn UI, 多語系 i18n, Dark/Light/High-Contrast 模式, 44px 觸控目標, WCAG 2.1 AA 無障礙標準）。
2. **Commit 策略**：每個 Phase 獨立進行 Conventional Commit。
3. **隔離規範**：不 commit `docs/audit/2026-08-18-product-grade-audit.md`。

---

## Phase 1：建立 Error Boundary 與 Next.js 錯誤頁面（P1-1）
### 目標
防止任何未預期例外（如 WebGL 上下文遺失、語音串流例外、JSON 解析失敗）造成全白屏崩潰，提供局部與全域錯誤降級與重試能力。

### 實作細節
1. **`src/components/shared/ErrorBoundary.tsx`**：
   - 封裝通用 React Class Component `ErrorBoundary`，支援 `fallback` 自訂函式或預設的無障礙錯誤卡片。
   - 支援 `onReset` 回呼與重試按鈕（`ui-ux-pro-max` 規範：44px 觸控熱區、`role="alert"`、`aria-live="assertive"`）。
2. **`src/app/[lng]/error.tsx`**：
   - Next.js 路由層級 Client Error Component，支援多語系 i18n 翻譯（"發生未預期錯誤"、"重試"、"返回首頁"）。
3. **`src/app/global-error.tsx`**：
   - 根層級 HTML/Body Error Component，在最外層根版面失敗時提供基本樣式與復原機制。
4. **單元測試**：
   - `src/components/shared/__tests__/ErrorBoundary.test.tsx` 驗證錯誤捕捉、降級卡片渲染與重試呼叫。

---

## Phase 2：建立 CI 護欄並修復 61 個 Biome Lint 錯誤（P1-2）
### 目標
建立自動化 PR 品質檢查，並徹底清除既有 61 個 Biome Linter 錯誤與 76 個警告。

### 實作細節
1. **`.github/workflows/ci.yml`**：
   - 設定 PR 與 push 觸發。
   - 執行 `npm run lint`、`npx tsc --noEmit`、`npm test`。
2. **修復 61 個 Biome 錯誤**：
   - `src/app/globals.css`：調整 `@layer base *` 順序與移除衝突的 `!important` 樣式。
   - `src/components/A11yFacilityPin.tsx:56`：將靜態互動 div 轉為具備語意、鍵盤導航與 role 屬性的可及性元件。
   - `src/components/BottomSheet/BusPanel.tsx`：修正 `role="radio"` 在非 radiogroup 的結構問題，以及 `role="list"` 缺乏 listitem 的問題。
   - `src/components/BottomSheet/HazardReportPanel.tsx`：修正 `role="radio"` 與原生 `<img>` 警告。
   - `src/components/BottomSheet/HomeContent.tsx`：修正陣列 index key（改用 `placeKey`）與 `role="group"`。
   - `A11yPanel.tsx`、`ParkingPanel.tsx`、`route.ts`：自動整理 import 排序。
3. **驗證**：
   - `npm run lint` 達到 0 errors、exit=0。

---

## Phase 3：補齊登出對話隱私清理測試（P1-3）
### 目標
確保使用者於共用裝置登出時，AI 對話紀錄與快照被確實清空，防止隱私洩漏。

### 實作細節
1. **`src/stores/__tests__/useAuthStore.test.ts`**：
   - 新增 `logout()` 測試案例：
     - 模擬使用者登入並在 `useChatStore` 填充對話訊息與 active tools。
     - 執行 `useAuthStore.getState().logout()`。
     - 斷言驗證 `useAuthStore.user === null`、`session === null`、`useChatStore.messages === []`。
2. **突變驗證**：
   - 移除 `useAuthStore.ts` 中的 `useChatStore.getState().clearAll()`，確認測試必紅（Killed）；復原後變綠。
