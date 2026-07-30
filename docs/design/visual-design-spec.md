# 視覺設計規範 — 無障礙智慧地圖

版本：v1.0
狀態：草案，待 nav-dev 實作、nav-review 驗收
適用範圍：`src/components/BottomSheet/*`、`src/components/Wrapper/MapControlsWrapper.tsx`、`src/components/AIChatBot.tsx`、`src/app/globals.css`、`src/stores/useMapStore.ts`

---

## 0. 背景與這份規格要解決什麼

這份規格是接續一次已喊停的實作（`docs/design/_wip-ui-audit-reference.diff`，未 commit，僅供參考）。上一輪試做把方向做對了大半（AI 助理併入面板、地圖控制項移出左下角、z-index token 化），但有幾個地方需要重新裁決或補強，本規格會逐一標明「採納」「修正」「否決」：

- **採納**：AI 助理不再是獨立浮動卡片，改為 BottomSheet/Layer2 面板的一種內容模式。
- **採納**：地圖控制項統一移到右下角／右上角，永久禁用左下角。
- **修正**：z-index 分層數字重新推導（見 §1.4），理由不同於草稿。
- **修正**：Side Rail Logo 與搜尋列 a11y 快捷鍵的圖示/顏色角色對調，且顏色選擇與草稿不同（見 §3.1、§2）。
- **否決**：`_wip-ui-audit-reference.diff` 中 `setSheetMode(mode, { fromAI: true })` 的 `fromAI` 例外機制。理由與最終裁決見 §5.2 ——這正是本規格被要求「明確裁決」的衝突點。

---

## 1. Design Tokens

沿用 Tailwind CSS 4 的 `@theme` / CSS 變數作法（專案沒有 `tailwind.config.js`），全部加在 `src/app/globals.css` 既有的 `:root` / `.dark` / `.high-contrast` 區塊。**不新增獨立的 `--alert` token**——現有 `--destructive`（`oklch(0.577 0.245 27.325)` ≈ `#DC2626` red-600）在數值上已經等於使用者要的 SOS 紅，重複定義只會製造第二個事實來源。改用語意別名指向同一個值。

### 1.1 色彩

```css
@theme inline {
  /* ...既有 --color-* 對應保留... */
  --color-accessibility: var(--accessibility);
  --color-accessibility-foreground: var(--accessibility-foreground);
  --color-accessibility-active: var(--accessibility-active);
  --color-sos: var(--destructive); /* 語意別名，非新色，见下方說明 */
  --color-sos-foreground: var(--destructive-foreground, var(--primary-foreground));
}

:root {
  /* 既有 --primary 已是 tailwind blue-600（#2563EB），active 用 blue-700（#1D4ED8）
     —— 不新增 --primary-active token，直接在 hover/active 狀態用 Tailwind 的
     brightness/opacity utility（如 hover:brightness-110、active:brightness-95），
     因為 shadcn 元件系統對 primary 已有既定的 hover/focus 慣例，另開一個平行
     token 只會讓兩套「按下去要變什麼顏色」的邏輯打架。 */

  /* Accessibility 語意色：無障礙圖示/徽章的「唯一標準色」，用來統一目前散落
     各檔案的 emerald-500 / orange-500 / indigo-500 等各自為政的無障礙相關
     圖示顏色（BottomSheet.tsx 的 railA11y 用 emerald、HomeContent.tsx 的
     a11y chip 用 orange，兩者其實是同一個語意卻不同色，這是需要修的不一致）。
     選用活力橙而非草稿的 #EA580C 原始 oklch 手動換算，改用 tailwind
     orange-600 的標準 oklch 值，確保跟其他 shadcn token 的色彩空間推導方式
     一致（避免手動換算誤差造成色相偏移）。 */
  --accessibility: oklch(0.646 0.222 41.116); /* tailwind orange-600, ≈ #EA580C */
  --accessibility-foreground: oklch(0.985 0 0);
  --accessibility-active: oklch(0.577 0.202 40.3); /* tailwind orange-700, ≈ #C2410C */
}

.dark {
  --accessibility: oklch(0.75 0.183 55.934); /* tailwind orange-400 for dark bg contrast */
  --accessibility-active: oklch(0.7 0.19 48);
}

.high-contrast {
  /* 高對比模式目前只覆寫 background/foreground/primary 等既有 token，
     accessibility token 若不覆寫，橙色在純黑背景上對比率仍然過低
     （WCAG AA 需 ≥4.5:1，橙 600 在 oklch(0.05 0 0) 背景上量測約 3.8:1，
     不合格）。故高對比模式下改用跟 --primary 相同的高亮黃，確保可讀。 */
  --accessibility: oklch(0.85 0.15 90);
  --accessibility-active: oklch(0.9 0.15 90);
  --accessibility-foreground: oklch(0.05 0 0);
}
```

**顏色使用規則（覆蓋草稿的字面規則）：**

| 語意 | Token | 使用範圍 |
|---|---|---|
| 主要品牌色 | `--primary`（藍） | 主要 CTA、路線規劃入口、AI 助理 CTA、Side Rail 啟用態指示條 |
| 無障礙語意色 | `--accessibility`（橙） | 所有「這是無障礙相關資訊」的圖示 tint：Side Rail 的 `railA11y` icon、StationDetail/PlaceContent 裡的無障礙標記、A11yPanel 圖示 |
| **例外**：搜尋列「搜尋無障礙設施」快捷鍵 | `--primary`（藍，實心底） | 這是全站唯一被拉高到主色實心底的無障礙相關按鈕，因為它是核心功能 CTA，視覺優先權高於「這是無障礙語意」的分類色（見 §3.1 使用者原話：「用實心主色底」）。**其餘所有無障礙相關圖示一律用橙色，不得跟這個例外混淆或互相盜用彼此的顏色。** |
| 緊急色 | `--sos`（= `--destructive`，紅） | 僅限 SOS 按鈕、SOS 對話框；不得用於一般 alert/warning（那是 amber，見 hazard 相關 UI） |

### 1.2 字級

沿用現有 Tailwind 預設字級尺度，不新增自訂 `--font-size-*` token；規則以「用途」而非「像素值」定義，避免各元件各自寫死：

| 用途 | class | 依據 |
|---|---|---|
| 內文 | `text-base`（16px） | 已是專案 `body` 預設，符合行動裝置最小可讀字級（WCAG 建議 ≥16px 避免 iOS Safari 自動縮放輸入框） |
| 次要說明文字 | `text-xs` ~ `text-sm`（12–14px） | 現有 `text-muted-foreground` 搭配用法保留 |
| 關鍵操作按鈕文字 | `text-sm font-bold` ~ `text-base font-bold` | 面板標題、送出/確認按鈕 |
| Rail 圖示下方微標籤 | `text-[9px] font-medium` | **只允許在「圖示+文字雙重標示」且容器寬度 ≤48px 的情境使用**，且必須套用 `truncate whitespace-nowrap max-w-[48px]`（見 §3.3 禁止事項），不可再縮更小 |
| 核心功能按鈕（Icon+文字並列，非窄欄位） | `text-sm font-semibold` ~ `text-base font-bold` | 搜尋列快捷 chip、面板內主要按鈕 |

**規則：所有「核心功能」按鈕一律 Icon + 文字雙重標示**（現有 `HomeContent.tsx` 的 quick action chip 已符合）；**唯獨寬度受限的 44px 圖示按鈕（Side Rail 一般項目除外，AI CTA 除外）不強制文字**，見 §3.3。

### 1.3 圓角與陰影

沿用既有 `--radius: 0.75rem` 尺度（`--radius-sm/md/lg/xl`），不新增更細的圓角 token。陰影沿用 Tailwind 內建 `shadow-sm/md/lg/xl/2xl` utility，不自訂 box-shadow 值——目前程式碼已經是這樣用（`shadow-xl`、`shadow-2xl` 等），新增自訂陰影 token 只會製造第二套系統。

補充一條目前程式碼裡沒有但需要的規則：**所有毛玻璃浮層（rail、面板、bottom sheet、展開卡片）一律 `bg-background/95 backdrop-blur-md` + `border border-border/50`**，這組合已經是事實標準，寫進規格供 review 檢查一致性。

### 1.4 Z-Index 分層系統（重新推導，非照抄草稿）

草稿原始想法是「drawer-panel 排在 floating-controls 之下」，但沒有說明其他層（rail 本體、modal、toast）怎麼排。以下是完整推導：

```css
:root {
  --z-map-base: 0;         /* 地圖底圖（MapLibre canvas） */
  --z-map-overlay: 10;     /* 路線線條、地圖標記/Pin — 仍是「地圖內容」，非 UI 外殼 */
  --z-drawer-panel: 20;    /* 面板本體：手機 Bottom Sheet 容器、桌面 Layer2 內容面板 */
  --z-floating-controls: 30; /* 地圖控制項：環境資訊膠囊、3D/定位/分享/SOS/語音 */
  --z-drawer-rail: 40;     /* 桌面 Icon Rail 本體 + 收合/展開 toggle */
  --z-modal: 50;           /* 阻斷式對話框：登入、SOS 確認、離開導航確認、分享 sheet */
  --z-toast: 60;           /* 系統通知（sonner toast） */
}
```

**推導理由（逐層說明，而非套用草稿數字）：**

1. **`map-base` < `map-overlay`**：不需解釋，地圖內容自身的堆疊。
2. **`map-overlay` < `drawer-panel`**：任何 UI 外殼都必須蓋過地圖內容本身，否則面板會被路線線條穿幫。
3. **`drawer-panel` < `floating-controls`**：這是本規格要嚴格保證的核心規則——地圖控制項（3D/定位/縮放/SOS）**無論任何面板處於什麼模式都必須可見不被遮擋**。但新架構下，AI 助理已經不再是獨立浮層（見 §5），面板與控制項之間主要靠**版位避讓**而非 z-index 分開（面板固定在左側/底部，控制項固定在右側/頂部，正常狀況下兩者的可視區域本來就不重疊）。z-index 在此僅作為「保底」：萬一手機版把 Bottom Sheet 拖到 `full`（92dvh）導致版位重疊，控制項仍會浮在面板之上而非被蓋住——這比反過來（面板蓋過控制項導致 SOS 按不到）安全得多，因為 SOS 是緊急出口，任何情況都不可以被蓋住。
4. **`floating-controls` < `drawer-rail`**：桌面 Icon Rail 是「恆定存在的導航骨架」（品牌 Logo、AI 助理入口、六個分類按鈕），語意上比「隨環境變化的地圖控制項」更接近「結構」而非「懸浮小工具」。而且 Rail 的收合/展開 toggle 在視覺上會跨過 Layer2 面板邊緣，若它的 z 比 floating-controls 低，toggle 有機率被環境資訊卡片展開時蓋住（環境卡片展開位置在右上角，理論上不會物理重疊，但既然兩者本來就不共享版位，把 rail 排更高沒有副作用，卻能避免未來新增控制項時意外蓋住導航骨架）。
5. **`drawer-rail` < `modal`**：登入、SOS 確認、離開導航確認都是「阻斷使用者、需要先處理完才能做其他事」的對話框，必須蓋過一切既有 UI，這是 modal 的定義,不需要更多論證。
6. **`modal` < `toast`**：sonner toast（例如「已送出求救訊息」「語音導航已開啟」）代表「系統剛剛做了一件事,要讓你知道」，即使當下有 modal 開著（例如 SOS 對話框開啟時同時觸發送出成功的 toast）,這則通知也必須看得到,否則使用者會不確定操作是否成功。這條在草稿裡完全沒被列入,是本次推導新增的層。

**明確禁止事項**：任何新元件的 z-index 一律使用上述 token（`z-(--z-xxx)`），不得再寫死 `z-30`/`z-40`/`z-50` 之類的數字（目前 `MapControlsWrapper.tsx`、`BottomSheet.tsx` 都是這樣寫死的,是技術債,本次改版一併換成 token）。

---

## 2. RWD 斷點決策：`lg`（1024px），不是 `md`（768px）

**決定：維持 `lg`（1024px）作為桌面雙欄 Side Rail 版面與手機 Bottom Sheet 版面的分界，不改用使用者原始草稿寫的 `md`（768px）。**

理由：

1. **版面寬度算術**：桌面模式下 Icon Rail 固定 56px + Layer2 內容面板 380px + 面板與 Rail 間距 12px ×2 ≈ 需要至少 460px 的左側空間才能不擠壓地圖。若斷點設在 768px（常見平板直向寬度、部分小筆電視窗寬度），扣掉 460px 左側面板後只剩約 300px 給地圖 + 右側控制項，地圖會被壓縮到難以操作的寬度，尤其對需要精確點擊小目標（無障礙設施圖釘）的使用者是負面體驗。1024px 斷點能保證面板攤開後地圖至少還有 ~560px 可視寬度。
2. **現有程式碼已經是 `lg`**：`useIsDesktop`（`src/hook/useIsDesktop.ts`）與 `BottomSheet.tsx`（`hidden lg:block` / `block lg:hidden`）目前的斷點就是 1024px。改成 `md` 是一次會牽動整個雙欄／單欄切換邏輯、`aria-hidden`/`inert` 判斷、以及所有 `lg:` class 的破壞性重構，風險遠高於效益，而使用者提出 `md` 的原始草稿本身也只是「憑印象寫的規格草稿」，沒有實測依據。
3. **與 shadcn/ui 慣例一致**：shadcn 的 `useIsMobile`/`Sheet` 元件慣例斷點也多落在 `md`~`lg` 之間，1024px 屬於常見且合理的「桌機 vs. 平板/手機」分界，不是專案獨有的怪異選擇。

**結論寫入驗收條件**：任何新增的響應式元件都必須用 `lg:` 而非 `md:` 做桌面/行動判斷，並優先複用 `useIsDesktop()` hook 而非各自寫 `window.innerWidth` 判斷（`useMapStore.ts` 第 155 行目前有一處內聯判斷 `window.innerWidth >= 1024`，屬技術債，應改呼叫共用邏輯或至少維持相同數值來源，不得與 hook 的斷點分岔）。

---

## 3. Icon 語意系統

目標：同一個圖示在全站只能代表一種語意，同一個語意在全站只能用一種圖示+顏色組合。以下是稽核現有程式碼（`BottomSheet.tsx`、`HomeContent.tsx`、`MapControlsWrapper.tsx`）後訂出的標準表：

| 圖示 (lucide-react) | 語意 | 顏色 | 允許出現的情境 | 明確禁止 |
|---|---|---|---|---|
| `Accessibility`（輪椅） | 「這是無障礙相關資訊/功能」的分類標記 | `--accessibility`（橙），**唯一例外**：搜尋列核心 CTA 用 `--primary`（藍實心底，見下） | Side Rail `railA11y` 按鈕、A11yPanel 標題、StationDetail/PlaceContent 的無障礙徽章、Bottom Sheet 手機版 header 小 icon | 不可單獨當作品牌 Logo 使用（見 §4 的災難情境）；不可用來代表「送出／確認」等其他語意 |
| `MapPin` | 「地點/地標」——地圖上的位置概念 | 中性 `text-foreground` 或依情境；作為品牌組合圖示的一部分時用 `--primary` | 品牌 Logo 組合圖示的底層形狀（見 §4.1）、地圖上的搜尋結果標記 | 不可跟 `Bookmark`（收藏地點）或 `Clock`（歷史紀錄）混用——三者是不同語意：MapPin=地點本身、Bookmark=使用者收藏動作、Clock=時間/歷史 |
| **品牌組合圖示**：`MapPin` + `Accessibility`（疊加） | 「無障礙智慧地圖」App 品牌本身 | `--primary` 底 + 白色前景 | **僅限** Side Rail 最上方 Logo 槽位、App favicon/啟動畫面 | 不得在任何功能性按鈕上重複使用這個組合（品牌記號只能出現一次，出現在功能按鈕上會讓使用者誤以為是「回到品牌介紹頁」之類的無意義動作） |
| `Bot` / `BotMessageSquare` | AI 助理入口，且僅代表這一件事 | `--primary`（Side Rail CTA 用漸層藍靛，見 §4.2） | Side Rail AI CTA、面板 header 顯示 AI 助理內容時的標題 icon、Avatar 內的 icon | 不可用於任何「自動化/機器人化」的其他隱喻（例如不可拿來代表「離線快取」或「系統自動偵測」等非 AI 對話功能） |
| `Navigation` | 路線/方向 | `text-primary` 或 `text-blue-500` | Rail 的 `railRoute`、面板標題、定位/recenter 按鈕、導航 HUD | 不可跟 `LocateFixed`（導航中的重新置中）混淆使用場景——两者外觀不同但語意相近，規則是：**一般模式用 `Navigation`，導航進行中的重新置中專用 `LocateFixed`**，維持現狀不必統一成同一個 icon（統一反而讓使用者無法從圖示分辨「現在是不是在導航模式」） |
| `AlertTriangle` / `TriangleAlert` | 「路況障礙回報」這個特定領域，不是通用警告 | 琥珀 `amber-500/600` | Rail `hazard`、HazardReportPanel | 不可挪用來做全站通用的「錯誤/失敗」提示（那應該用 toast 內建的 error 樣式，不需要圖示） |
| `Cloud` / `Leaf` / `Wind` / `Thermometer` / `CloudRain` | 環境資訊家族（空氣品質/天氣），彼此可互換出現在同一個情境群組 | `sky-500`（分類色）；個別指標各自的資料語意色（`Leaf`=空氣品質等級色、`Thermometer`=紅、`Wind`=藍） | EnvironmentPanel、右上角環境膠囊 | 不可拆散到其他無關功能（例如不可把 `Leaf` 拿去代表「環保回收站」之類的無障礙設施子分類，容易和空氣品質誤認） |
| `Bus` / `CircleParking` / `Heart` / `Bookmark` | 各自獨立分類（公車／停車／福利／收藏），一圖示一語意 | 各自既有分類色（emerald/indigo/rose/amber）保留不變 | 對應 Rail 項目與面板 | 維持現狀，不在本次範圍內調整 |

**稽核發現需要修正的既有不一致**：`BottomSheet.tsx` 的 `RAIL_ITEMS` 目前把 `a11y` 的顏色寫成 `text-emerald-500`（第 64 行），與 `HomeContent.tsx` 的 a11y quick action 用 `orange-500` 系不一致——這正是本規格要統一的項目，兩處都應改用 `--accessibility` token。

---

## 4. Side Rail 元件規格

容器（維持現有結構不變）：`fixed left-3 top-3 bottom-3 w-[56px]`，`bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50`，`z-(--z-drawer-rail)`，內距 `py-3`、項目間距 `gap-1`。

### 4.1 Logo 區

- 尺寸：`h-10 w-10`（40px），置中於 56px 容器內，`mb-2`。
- 造型：`rounded-full`，背景 `bg-gradient-to-br from-primary to-blue-700`（沿用既有 primary 漸層做法,不新增漸層 token）。
- 圖示：**組合圖示**——`MapPin` 作為主體（`h-5 w-5`，`fill="currentColor" fillOpacity={0.25}` 讓地標形狀有存在感但不搶戲）+ 右下角疊加一個白底圓形小徽章，內含 `Accessibility` icon（`h-2.5 w-2.5`，`bg-white text-primary rounded-full p-0.5`，`absolute -bottom-1 -right-1`）。這解決使用者原話「一開始只是一個裸的藍色輪椅圖示，跟下面的功能按鈕長得一模一樣，沒有品牌識別度」——組合圖示 + 圓形實心底這兩點,讓 Logo 在視覺上明顯區別於下方方形/圓角矩形的功能按鈕。
- 互動：**可點擊**，`onClick` 行為＝回到首頁搜尋（`setSheetMode("home")`）並收合任何開啟的面板/AI 助理（見 §5 的統一收合規則）。`aria-label` 用完整 app 名稱（`t("title")`），圖示本身 `aria-hidden`。
- 明確禁止：不得在其他任何按鈕重複使用「MapPin+Accessibility」組合圖示（見 §3 品牌圖示規則）。

### 4.2 AI 助理 CTA 按鈕

- 尺寸：`h-11 w-11`（44px，與其他 Rail 項目一致，符合最小觸控目標）,`rounded-xl`。
- 視覺差異化：**恆定實心填色**（`bg-gradient-to-b from-primary to-indigo-600 text-primary-foreground`），不像其他 Rail 項目平常是透明/淡色調、僅 active 時才填色——因為 AI 助理是「啟動一個動作」而非「切換一個篩選檢視」，需要在視覺階層上讀作主要 CTA。當助理面板開啟中（`aria-pressed="true"`）時切換為內縮陰影 + `ring-2 ring-primary/30` 的按下態,而不是換一個完全不同的顏色（維持「這是同一個按鈕，只是狀態不同」的視覺連續性）。
- 圖示：`Bot`（`h-5 w-5`）。
- 文字標籤：**沿用其他 Rail 項目的圖示+文字雙重標示**（不做成純圖示按鈕，維持 Rail 整體視覺文法一致），但**強制使用短版翻譯鍵 `assistShort`**，內容上限 **繁中 ≤ 4 字、英文 ≤ 8 字元**（例：`"AI 助理"` 4 字合規；`"Assistant"` 9 字元超標,英文版應改用 `"AI"` 或 `"Assist"`）。標籤 class 與其他 Rail 項目相同：`text-[9px] leading-none font-medium truncate whitespace-nowrap max-w-[48px]`。
- **絕對禁止**：這顆按鈕（以及所有 44px 寬的 Rail 按鈕）內部文字**永遠不得使用完整 app 名稱翻譯鍵 `t("assist")`**（該字串「無障礙智慧地圖 AI 助理」長達 9 個中文字+英文字母，是導致過去版本文字換行擠成一團的直接原因）。`t("assist")` 只能用在：面板 header（有完整寬度可容納）、`aria-label`（螢幕閱讀器念完整名稱不受版面限制）。任何要塞進 ≤48px 容器的文字，一律先過一次「≤4 字/8 字元」檢查，寧可用短標籤或純圖示，也不可以直接丟完整字串進去賭它「應該還好」。

### 4.3 一般功能按鈕（RAIL_ITEMS：search / a11y / bus / parking / saved / hazard）

沿用現有實作模式（`BottomSheet.tsx` 第 458–490 行），規格不變、僅顏色統一（見 §3 稽核表）：

- 尺寸 `h-11 w-11 rounded-xl`；未啟用態 `text-muted-foreground`，hover `bg-muted`；啟用態 `bg-primary/10` + 左側 3px 高亮條（`layoutId="rail-indicator"` 的 spring 動畫維持）。
- 圖示 `h-5 w-5`，啟用態才顯示分類色（其餘時候維持中性灰,避免六個高彩度圖示同時常駐造成視覺噪音）。
- 標籤 `text-[9px]`，同 §4.2 的字數與 truncate 規則（**同樣 ≤4 字/8 字元**，這條規則對整個 Rail 一體適用，不是只有 AI CTA 特例）。
- 「更多」(`railMore`) 展開的 flyout 選項（route/environment/welfare）維持現有橫向文字列表樣式（此處寬度足夠,不受 44px 限制,可以顯示完整標籤）。

---

## 5. AI 助理面板整合規格

### 5.1 呈現方式

**採納** `_wip-ui-audit-reference.diff` 的核心方向：AI 助理不再是獨立的 `fixed z-50` 浮動卡片，改為 BottomSheet/Layer2 的其中一種面板內容，與 `sheetMode`/`activeRailPanel` 共用同一個顯示插槽（同一時間只會顯示一種內容）。

- **桌面**：`chatOpen === true` 時,Layer2 內容面板（`left-[68px] top-3 w-[380px]`）顯示 `AIChatBot` 內容，header 顯示 `BotMessageSquare` + `t("assist")`，關閉鍵行為＝「返回」（`ChevronLeft`），而不是「清空關閉」——因為底下原本開著的搜尋/路線視圖應該還在，回上一層即可看到。
- **手機**：`chatOpen === true` 時 Bottom Sheet 內容區顯示 `AIChatBot`，並強制吸附到 `half`（38%）高度（不能停在 `peek`，聊天輸入框在 12% 高度下不可用；也不預設跳 `full`，因為地圖脈絡在對話中仍常需要參考）。
- **移除**：`ClientMap.tsx` 中獨立掛載的 `<AIChatBot />` 與其原本 `fixed bottom-2 right-3 ... z-50` 容器，`MapControlsWrapper.tsx` 中原本位於左下角的 AI FAB 群組（3D/定位/AI 三顆一組）**整組拿掉**——這正是使用者抱怨的「桌面版 AI 助理卡片蓋住左下角地圖控制項」的根源，而不是靠 z-index 去解，是靠「AI 助理本來就不該是獨立浮層」直接消除問題。
- **手機版 AI 入口**：因為手機沒有 Side Rail，AI 助理的開啟入口保留在 `MapControlsWrapper.tsx` 右下角控制群組中（現有位置：Recenter 與「更多」toggle 之間，恆定可見,不收進「更多」），維持 `bg-primary` 實心圓 44px + `BotMessageSquare` 圖示，不加文字（此處是獨立圓形 FAB，不在 Rail 的圖示文字雙標籤文法內，維持現狀即可，草稿在這點沒有問題）。

### 5.2 【裁決】AI 主動切換面板 vs. 使用者手動切換面板——是否自動關閉 AI 助理

這是本規格被要求明確裁決的衝突點。現況：

- `useAIChat.ts` 現有邏輯：AI 工具呼叫觸發 `show-route` 或 `switch-panel` 時，`useAIChat` 自己在收到結果後呼叫 `setOpen(false)`（第 233–243 行），也就是說**現有 production 行為已經是「AI 觸發的畫面切換會自動關閉助理」**。
- `_wip-ui-audit-reference.diff` 試圖引入 `setSheetMode(mode, { fromAI: true })`，讓 AI 觸發的切換**不再**自動關閉助理（只有「使用者手動」操作才關），但這個「手動關閉」規則只在 `isMobileViewport()` 為真時生效（`useMapStore.ts` diff 片段），**桌面版完全沒有對應處理**——結果會是：桌面上使用者在 AI 助理開著的狀態下手動點擊 Rail 的其他項目（例如「無障礙設施」），`activeRailPanel` 會變成 `"a11y"`，但因為 `chatOpen` 沒被清掉、且 Layer2 面板的 render 邏輯是「`chatOpen` 為真就無條件顯示 `AIChatBot`」，畫面會卡住不放行使用者剛剛點的動作、繼續顯示聊天室——這是一個真實會發生的 bug，也是這份規格存在的理由之一。

**裁決結果：否決 `fromAI` 例外機制，改用單一、不分來源的規則——**

> **面板插槽同一時間只能顯示一件事。任何會改變「目前該顯示什麼」的動作——不論觸發者是 AI 工具呼叫、Rail 點擊、或 sheetMode 轉換——一律連帶把 `chatOpen` 設回 `false`。沒有例外。**

理由：

1. 這與現有 production 行為（AI 觸發切換即關閉助理）**本來就一致**，不需要為了「保留 AI 觸發時的助理視窗」而發明新狀態，因為使用者從沒抱怨過這件事——會被抱怨的只有「桌面版沒有處理手動切換」這個遺漏,不是「AI 觸發時不該關」這件事本身有問題。
2. 「AI 幫你規劃好路線，直接把畫面切到路線視圖」本來就是這個功能的價值所在（像 Google 助理：問完問題直接給你看結果，不需要你再手動關掉聊天視窗），保留聊天室蓋在結果上面反而是雜訊。
3. 統一規則消除了「這次切換是誰觸發的」這種需要在多處程式碼裡追蹤來源的心智負擔，`setSheetMode`/`setActiveRailPanel` 只要在 store 層各自的 setter 裡加一行 `chatOpen: false`（if not already false）就完整涵蓋所有呼叫點，桌面/手機都自動生效,不需要 `isMobileViewport()` 這種平台判斷。

**具體實作規則（供 nav-dev 對照）：**

- `useMapStore.setSheetMode()`、`useMapStore.setActiveRailPanel()`：兩者的 setter 內都加上「若 `chatOpen` 為真則一併設為 `false`」，**不接受 `opts?: { fromAI }` 參數**，移除 wip diff 中曾引入的該參數。
- `useAIChat.ts` 第 231/243 行原本各自呼叫 `setOpen(false)` 的邏輯**可以拿掉**（因為已經被 `executeAction` 內部呼叫的 `setSheetMode`/相關 setter 統一處理），但保留也不會出錯（幂等）——nav-dev 可自行決定是否順手清理,不是硬性要求。
- `useMapStore.setChatOpen(true)`：**不**清空 `sheetMode`/`activeRailPanel`（維持它們原本的值），這樣使用者從助理面板點「返回」時能回到原本開著的搜尋/路線畫面，而不是被強制打回首頁。

### 5.3 焦點管理（無障礙驗收項）

- 開啟 AI 助理面板時，焦點需移至面板標題或輸入框（`role="region"` 容器 + 適當 `aria-label`，維持現有 Layer2 面板的 `role="region"`/`aria-label` 寫法）。
- 關閉/返回時，焦點需回到觸發它的按鈕（Rail 的 AI CTA 或手機版 FAB），不可讓焦點掉到 `document.body`。

---

## 6. 地圖控制項規格

### 6.1 版位規則

**永久禁用左下角**（使用者原話：「左下角是 UI 盲區，只要左側面板一多，左下角必被遮擋」）。全部地圖控制項只能出現在以下兩處：

| 位置 | 內容 | 說明 |
|---|---|---|
| **右上角** | 環境資訊膠囊（空氣品質/氣溫，可展開卡片） | 唯一允許出現在上半部的控制項，因為它是「資訊揭露」而非「操作」，不需要跟底部的操作型按鈕搶版位 |
| **右下角** | 3D/2D 切換、定位/Recenter、分享位置、語音導航開關（導航中）、**SOS** | SOS 永遠是這一組裡視覺上最外側/最後一個（貼齊螢幕角落），維持使用者建立的肌肉記憶位置不變 |

桌面版原本位於左下角的「3D + 定位 + AI 助理」三顆按鈕群組**整組移除**：3D 與定位併入右下角控制群組（與分享/SOS 同排，`flex-row gap-2`）；AI 助理入口改為 Side Rail CTA（見 §4.2），不再是獨立浮動按鈕。手機版維持現有「常駐可見（定位、AI）+ 收合在『更多』(+) 裡（3D、分享）」的分層揭露設計，這部分現有實作已經合理，不需要更動。

### 6.2 z-index

見 §1.4：地圖控制項使用 `z-(--z-floating-controls)`（30），高於面板本體 `z-(--z-drawer-panel)`（20），低於 Rail 本體 `z-(--z-drawer-rail)`（40）與 Modal `z-(--z-modal)`（50）。

### 6.3 與 Side Rail / Bottom Sheet 的避讓關係

**主要靠版位避讓，z-index 只是保底**——這是本規格對「避讓關係」的核心立場：

- 桌面：Rail（左側 56/64px）與 Layer2 面板（左側 380px 寬,面板開啟時左緣約在 448–460px 處）都固定在螢幕**左側**；控制項固定在**右側**（右上、右下）。兩者的可視版位在正常視窗寬度下本來就不重疊，不需要靠 z-index 決勝負。這也是為什麼 §6.1 要求「整組移除左下角控制項」——只要控制項不再出現在左側,避讓問題直接不存在,不需要動態計算 `left` 偏移量去閃避面板（目前 `MapControlsWrapper.tsx` 用 `!sidebarCollapsed && panelOpen ? "left-[468px]" : "left-[76px]"` 這種動態位移正是因為控制項還留在左側才需要的補丁，改到右側後這段邏輯應可整段刪除）。
- 手機：Bottom Sheet 從螢幕底部升起，右下角控制項用 `--bottom-sheet-h` CSS 變數（已由 `BottomSheet.tsx` 即時發布）動態貼齊在 sheet 頂緣上方（`MOBILE_BOTTOM_OFFSET = "bottom-[calc(var(--bottom-sheet-h,12dvh)+16px)]"`），這個機制**維持不變**，是現有實作中做得對的部分。
- **已知邊角案例（需在驗收時檢查）**：手機版使用者手動把 Bottom Sheet 拖到 `full`（92dvh）時,右上角環境膠囊（固定在 `top-24`，約 96px）可能被 sheet 頂緣（約在 `8dvh` 處,多數手機螢幕下小於 96px）蓋住。這是版位重疊而非單純 z 排序能解決的問題——即使把控制項 z 排更高，硬把一顆按鈕懸浮在 sheet 內容之上,觀感也不理想。**建議處理方式**（供 nav-dev 參考,非本規格強制驗收項）：sheet 高度超過 `half`（38%）時,環境膠囊淡出隱藏,收合到 `half` 以下再淡入,如同導航模式隱藏 UI 的既有模式（`navHidesChrome`）。若這次不修，至少要在程式碼留註解說明已知限制，不能悄悄放著不提。

---

## 7. 驗收條件

### 7.1 Design Tokens
- [ ] `globals.css` 新增 `--accessibility` / `--accessibility-foreground` / `--accessibility-active`（`:root`、`.dark`、`.high-contrast` 三處都要有對應值，特別是 `.high-contrast` 不可留用預設橙色，需驗證對比率）
- [ ] `globals.css` 新增 `--z-map-base` / `--z-map-overlay` / `--z-drawer-panel` / `--z-floating-controls` / `--z-drawer-rail` / `--z-modal` / `--z-toast` 七個 z-index token
- [ ] 專案內不再有寫死的 `z-30` / `z-40` / `z-50`（`BottomSheet.tsx`、`MapControlsWrapper.tsx` 全面替換為 `z-(--z-xxx)`）
- [ ] `BottomSheet.tsx` 的 `railA11y` 顏色（現為 `text-emerald-500`）與 `HomeContent.tsx` 的 a11y 相關顏色統一改用 `--accessibility`（**除**搜尋列核心 CTA 例外用 `--primary`）

### 7.2 RWD
- [ ] 桌面/行動判斷全部使用 `lg:` breakpoint 與 `useIsDesktop()` hook，無新增的 `md:` 判斷或獨立 `window.innerWidth` 內聯判斷

### 7.3 Icon 語意
- [ ] 全站無出現「同一語意用不同圖示」或「同一圖示用在互斥語意」的情況（可對照 §3 表格逐一檢查）
- [ ] 品牌組合圖示（MapPin+Accessibility）只出現在 Side Rail Logo 與 favicon,不出現在任何功能性按鈕上

### 7.4 Side Rail
- [ ] Logo 槽位為 40px 圓形、`MapPin`+`Accessibility` 組合圖示，可點擊回首頁
- [ ] AI 助理 CTA 為恆定實心填色（非透明底），圖示+短標籤（≤4 中文字/8 英文字元），`aria-pressed` 反映開啟狀態
- [ ] **全 Rail 檢查**：任何 44px/48px 寬容器內的文字標籤都不是 `t("assist")` 這種完整 app 名稱字串；所有標籤都套用 `truncate whitespace-nowrap max-w-[48px]`
- [ ] 一般功能按鈕顏色統一改用 `--accessibility`（a11y 項目）,其餘分類色維持不變

### 7.5 AI 助理整合
- [ ] `ClientMap.tsx` 不再獨立掛載 `<AIChatBot />`；`MapControlsWrapper.tsx` 左下角三顆按鈕群組（3D/定位/AI）整組移除
- [ ] 桌面：`chatOpen` 為真時 Layer2 面板顯示 AI 助理內容，header 有「返回」語意的關閉鍵（`ChevronLeft`，非 `X`）
- [ ] 手機：`chatOpen` 為真時 Bottom Sheet 內容顯示 AI 助理內容，且強制吸附至 `half`
- [ ] `useMapStore.setSheetMode()` / `setActiveRailPanel()` 內部一律連帶清空 `chatOpen`，**不存在** `fromAI` 或任何依賴觸發來源的例外參數
- [ ] 手動測試：桌面版在 AI 助理開啟狀態下點擊 Rail 的「無障礙設施」，畫面應立即切換到 A11yPanel（AI 助理消失），此為修復 wip 版本遺漏桌面判斷的回歸測試案例
- [ ] 手動測試：透過 AI 對話請求路線規劃，AI 回應後畫面自動切到路線視圖、助理面板關閉（維持現有行為，不應退化）
- [ ] 開啟/關閉 AI 助理面板時焦點正確移動與歸位（見 §5.3）

### 7.6 地圖控制項
- [ ] 全站無任何控制項出現在左下角
- [ ] 右下角控制項順序：3D → 定位 → 分享 → SOS（SOS 恆為最外側）
- [ ] 桌面版 `MapControlsWrapper.tsx` 不再有依 `panelOpen`/`sidebarCollapsed` 動態計算 `left` 偏移的邏輯（因控制項已不在左側,此邏輯應整段移除而非保留但失效）
- [ ] 手機版 Bottom Sheet 拖到 `full` 時，人工檢查右上角環境膠囊是否被遮擋，若遮擋需至少留下已知限制註解（見 §6.3）

### 7.7 無障礙驗收（跨所有項目）
- [ ] 新增/調整顏色的文字與圖示對比率 ≥ 4.5:1（一般文字）／≥ 3:1（大字/圖示），含 `.high-contrast` 模式
- [ ] 所有可互動元素觸控目標 ≥ 44×44px
- [ ] 所有圖示按鈕有 `aria-label`；狀態切換按鈕有 `aria-pressed`/`aria-expanded`
- [ ] 鍵盤 Tab 順序符合視覺閱讀順序，`focus-visible` 樣式在所有新按鈕上可見
- [ ] 螢幕閱讀器（VoiceOver/TalkBack 任一）走一次「開啟 AI 助理 → 對話 → 返回 → 切換到無障礙設施面板」全流程，語音播報內容與實際畫面一致

---

## 8. 優先級建議

| 項目 | 優先級 | 理由 |
|---|---|---|
| §5.2 AI 助理面板整合 + chatOpen 統一收合規則 | **P0** | 這是唯一有實際 bug（桌面版遺漏）的項目，且是使用者用「災難」形容的痛點源頭，修正後同時解決「浮層互相遮擋」與「操作降低興致」兩項抱怨 |
| §6.1 地圖控制項移出左下角 | **P0** | 直接對應使用者三條逐字抱怨（1、2、3），且改動範圍集中在 `MapControlsWrapper.tsx` 一個檔案，投入產出比高 |
| §1.4 Z-index token 化 | **P1** | 本身不修任何可見 bug（因為 P0 項目做完後版位已經不重疊），但能防止未來新增浮層時重蹈覆轍,屬於「打地基」工作，建議跟 P0 一起做 |
| §4 Side Rail Logo / AI CTA 視覺 | **P1** | 使用者明確提出品牌識別度問題，但目前功能是「堪用但不夠精緻」而非「壞掉」，可以在 P0 穩定後排入 |
| §2 RWD 斷點定案 | **P2** | 現狀（`lg`）本來就沒有 bug，這份規格只是把既有決策正式寫下來供未來對照，不需要任何程式碼改動 |
| §3 Icon 語意系統統一（顏色稽核） | **P2** | 屬於一致性打磨，使用者沒有直接抱怨這件事造成困擾，可以跟其他小幅視覺調整一起排入 |
| §6.3 已知邊角案例（環境膠囊被 sheet 遮擋） | **P3** | 屬於「使用者手動拖到極端狀態才會發生」的邊角案例，非常態使用路徑，可延後但需要留 tracking（至少要有註解或 issue） |
