# 產品級工程修復實作計劃（Phase 7）

本計劃對應稽核報告 `docs/audit/2026-08-18-product-grade-audit.md` 中的建議處理順序第 7 項：**拆解 God Component 與 God Store（P2-2）**。

---

## 專案規格與約束
1. **100% 向後相容**：所有既有 import 路徑（如 `import { RouteCard, shouldAppendExitNumber } from "@/components/shared/RouteCard"`、`import useMapStore from "@/stores/useMapStore"`）必須完全無縫相容，既有 257 個單元測試與 build 必須全數通過。
2. **UI/UX 設計規範**：遵循 `ui-ux-pro-max` 技能標準與既有專案風格，保證零版面跳動與無障礙相容。
3. **Commit 策略**：完成後進行獨立 Conventional Commit。

---

## 1. 拆解 `src/components/shared/RouteCard.tsx` (1,235L)
### 目標結構：`src/components/shared/RouteCard/`
- `index.ts` / `RouteCard.tsx`：主卡片元件（Header, Rating, Actions, Leg Details 容器）。
- `StarRating.tsx`：星級評等與通告無障礙等級標籤元件。
- `WalkStepsList.tsx`：步行分步指示列表與折疊展開器。
- `DriveStepsList.tsx`：開車分步指示列表與折疊展開器。
- `TransitStops.tsx`：大眾運輸停靠站點列表。
- `A11yStationIcons.tsx`：車站與出發/抵達點無障礙設施圖標與折疊抽屜。
- `IntermediateStops.tsx`：中途停靠站點展開列表。
- `LegDetail.tsx`：單段行程細節卡片（結合圖標、步行/公車/捷運/開車）。
- `utils.ts`：純函式工具（`shouldAppendExitNumber`, `getConfidenceLabelKey`, 常數定義）。

---

## 2. 拆解 `src/stores/useMapStore.ts` (585L, 50+ 欄位)
### 目標結構：Zustand Slice Pattern (`src/stores/map/`)
- `src/stores/map/types.ts`：所有 Map 相關型別宣告。
- `src/stores/map/createMapInstanceSlice.ts`：地圖實例、3D 視圖、Sidebar 狀態。
- `src/stores/map/createRouteSlice.ts`：起終點、路線規劃計算結果、選取路線、Transit/Metro 警報。
- `src/stores/map/createSearchSlice.ts`：搜尋目標、歷程紀錄、我的收藏與分類、待處理文字查詢。
- `src/stores/map/createTransitSlice.ts`：公車路線、即時動態、站點資訊、即時車輛位置。
- `src/stores/map/createA11ySlice.ts`：無障礙設施標記、篩選器、障礙物回報待辦情境。
- `src/stores/map/createSheetSlice.ts`：底層抽屜模式、Snap 高度、側邊欄導航選單、導航鎖定狀態。
- `src/stores/useMapStore.ts`：聚合所有 Slice，維持 100% 相同之 Store 型別與導出。

---

## 3. 模組化 `src/components/BottomSheet/BottomSheet.tsx` (1,170L)
- 抽離導航 Rail 定義與常數（`railConfig.ts`）。
- 抽離桌面與行動端面板容器渲染器。

---

## 4. 驗證標準
1. `npm run lint` ➜ 0 errors, 0 warnings
2. `npx tsc --noEmit` ➜ 0 errors
3. `npm test` ➜ 257 tests 全部通過
4. `npm run check:cycles` ➜ 0 circular dependencies
5. `npm run build` ➜ 產出正常且首頁體積保持精簡
