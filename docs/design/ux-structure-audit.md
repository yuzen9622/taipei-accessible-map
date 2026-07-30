# UX 結構體檢 — 無障礙智慧地圖

版本：v1.0
狀態：診斷報告，待 nav-product / nav-dev 討論後排入實作
適用範圍：`src/stores/useMapStore.ts`、`src/components/BottomSheet/*`、`src/components/Wrapper/MapControlsWrapper.tsx`、`src/components/AIChatBot.tsx`、`src/components/Navigation/NavigationHUD.tsx`
前提：本報告不重複 `docs/design/visual-design-spec.md` 已裁決的色彩 / 圖示顏色 / z-index 規則，聚焦「畫面之間怎麼銜接」「同一功能為何多處可達」「使用者從進來到完成一件事要經過幾層」。

---

## 0. 一句話結論

視覺規範已經把「同一件事看起來一致」做對了，但畫面背後**同一件事其實有四套互不知情的狀態機在各自決定「現在該顯示什麼」**——這才是使用者說不出來的「怪怪的」的真正來源：不是配色不對，是**同一個功能入口在程式碼裡被實作了三到四次**，導致行為不一致、返回鍵有時候失憶、AI 助理定位尷尬。以下逐項展開。

---

## 1. 現況資訊架構圖

```
App Shell
├─ 桌面：Icon Rail（56px，恆定顯示）+ Layer2 內容面板（380px，依 panelOpen 顯示/隱藏）
├─ 手機：Bottom Sheet（peek 12% / half 38% / full 92%，可拖曳）
└─ 地圖浮層：MapControlsWrapper（右上環境膠囊、右下 3D/定位/分享/AI FAB/SOS）

【驅動畫面內容的四套並行機制】
├─ useMapStore.sheetMode（全域）
│    home → place → plan → route → navigation → station
│    （a11y 也曾是 sheetMode 值，但目前多數 a11y 走 activeRailPanel）
├─ useMapStore.activeRailPanel（全域，僅桌面 Rail／手機無對應 UI，靠各面板自己的
│    "onClose" callback 模擬類似效果）
│    none / search / route / a11y / bus / parking / environment / hazard / welfare / saved
├─ useMapStore.chatOpen（全域，正交疊加在上面兩者之上，任一改變都會被清空）
└─ 元件內 local state（未反映在 store，NOT visible to Rail/其他元件）
     ├─ HomeContent.tsx → subPanel: none/a11y/environment/hazard/welfare/parking/bus/saved
     │    （跟 activeRailPanel 的九個值幾乎一模一樣，只是活在元件內部）
     └─ RouteContent.tsx → panel: none/explanation/environment/hazard
          （environment/hazard 又重複了一次，這次是路線頁面情境下的版本）

【由 sheetMode 決定的「模式面板」（MODE_PANELS）】
home → HomeContent（含快捷 chip + 收藏 + 歷史）
place → PlaceContent（地點詳情、可規劃路線／收藏／分享）
plan → RoutePlanContent（起訖點、交通/無障礙模式、路線試算）
route → RouteContent（路線比較卡、開始導航、又有 explanation/environment/hazard 子面板）
navigation → NavigationContent（桌面 Rail Layer2 的步驟清單；地圖上另有 NavigationHUD 疊層）
station → StationDetailContent

【由 activeRailPanel 決定的「Rail 面板」（僅桌面 Rail 或手機透過 HomeContent 快捷 chip 間接觸發）】
search → HomeContent（跟上面 sheetMode=home 顯示同一元件，但走不同的 state 分支）
a11y → A11yPanel
bus → BusPanel
parking → ParkingPanel
saved → SavedPlacesPanel
hazard → HazardReportPanel
（more flyout）route → 實際上會被攔截改成 setSheetMode("plan")
（more flyout）environment → EnvironmentPanel
（more flyout）welfare → WelfarePanel

【AI 助理】
chatOpen=true → 借用同一個面板插槽顯示 AIChatBot，蓋過上述兩套機制的顯示結果
入口：手機/桌面皆為 MapControlsWrapper 右下角圓形 FAB（不在 Rail 內，
       與 visual-design-spec.md §4.2「AI 應是 Rail CTA」的裁決不一致，見 §2.4）

【導航模式】
isNavigating=true → 地圖上疊 NavigationHUD（頂部指令卡＋底部 ETA 卡，Google Maps 風格）
                  → BottomSheet 幾乎全隱（navHidesChrome），僅在使用者主動點步驟清單才浮現
                  → Rail 隱藏（isNavigating && "hidden"）
                  → MapControlsWrapper 換一整組「導航專用」按鈕（語音/定位/SOS）
```

**關鍵觀察**：使用者在同一個畫面上點「無障礙設施」，實際觸發的程式路徑會因為「你人在哪個畫面」而完全不同——在首頁點快捷 chip 是 `setActiveRailPanel("a11y")` + 本地 `setSubPanel("a11y")` 雙寫；在 Rail 直接點是只寫 `activeRailPanel`；這兩條路徑最終畫面看起來一樣，但底層資料流不同，未來任何人要改 a11y 面板的行為，都要記得同時改兩個地方，這正是「感覺哪裡怪但說不出來」的技術根源之一。

---

## 2. 七個問題的具體回答

### 2.1 Rail 項目 vs 首頁快捷 chip 的重複 — **判定：非刻意設計，是需要收斂的重複**

看程式碼意圖（`HomeContent.tsx` 註解「Superset of the quick actions in the search panel, so everything reachable from 快捷功能 is also reachable from 更多」）可以確定：原始設計思路是「Rail 是完整目錄，首頁 chip 是使用者常用的子集捷徑」，這個分工邏輯本身沒有錯（像瀏覽器書籤列 vs 完整書籤庫）。

但實作方式讓兩者變成**兩套獨立的開關系統**而不是「同一份資料的兩種呈現」：
- Rail 版本：點擊 → 純粹改 `activeRailPanel`（全域 store），面板顯示邏輯在 `BottomSheet.tsx` 的 `DesktopPanelContent`/`MobileSheetContent`。
- 首頁 chip 版本：點擊 → 呼叫 `setSubPanel(def.id)`（`HomeContent.tsx` 局部 state），面板顯示邏輯在 `HomeContent.tsx` 自己的 early return（`if (subPanel === "environment") return <EnvironmentPanel onClose={...} />`）。

這造成两個具體問題：
1. **返回行為不一致**：從 Rail 進入的面板，關閉鍵呼叫 `setActiveRailPanel("none")`；從首頁 chip 進入的面板，關閉鍵呼叫本地 `setSubPanel("none")` 回到 HomeContent——兩者「感覺」都是回上一頁，但一個是全域狀態改變（可能連動 Rail 的 active 指示條），一個純粹是元件內部重渲染，使用者無法從行為判斷自己在哪個系統裡，只是恰好兩邊 UI 長得像。
2. **a11y 特別分裂**：`openA11y()` 同時寫兩個狀態（`setActiveRailPanel("a11y")` **且** `setSubPanel("a11y")`），其餘五個 quick action 只寫 `subPanel`。這代表 a11y 這一個功能已經被三方追蹤（`sheetMode` 曾經也有 `"a11y"` 值、`activeRailPanel`、`subPanel`），其餘的 hazard/parking/bus/environment/welfare 只被兩方追蹤（`activeRailPanel` 走 Rail 路徑時 / `subPanel` 走 chip 路徑時），維護風險最高的正是使用者最常用的無障礙設施功能。

**立場**：不要二選一砍掉其中一個入口——「快捷捨近」與「完整目錄」的分工本身是對使用者友善的（尤其對認知負荷較高的使用者，常用功能不必每次都去翻 Rail）。**該收斂的是底層機制，不是入口數量**：首頁 chip 點擊也應該呼叫 `setActiveRailPanel(id)`，讓 `subPanel` 這個本地 state 整個消失，兩個入口殊途同歸到同一個全域狀態、同一份渲染邏輯。

### 2.2 sheetMode 與 activeRailPanel 雙軌狀態機 — **判定：目前的模型讓「現在是什麼狀態」不可預測，需要改成單一模型，且現況其實是三到四軌，不是兩軌**

程式碼證實這不只是「兩套」：
- `sheetMode`（全域，5-6 個值：home/place/plan/route/navigation/station）
- `activeRailPanel`（全域，9 個值，含 `"none"`）
- `HomeContent.subPanel`（元件內，7 個值，跟 activeRailPanel 高度重疊）
- `RouteContent.panel`（元件內，4 個值：none/explanation/environment/hazard——environment 和 hazard **又跟 activeRailPanel 的 environment/hazard 是同一個底層元件 `EnvironmentPanel`/`HazardReportPanel`，只是從路線頁情境呼叫**）

`BottomSheet.tsx` 用 `MODE_PANELS`（一個 Set）決定「當 sheetMode 屬於這五種值時，activeRailPanel 的顯示被蓋過」，這代表**這兩套系統之間存在人工訂出的優先順序規則**，而不是天生互斥。任何新增功能的工程師都必須先搞清楚「這個新面板該用 sheetMode 還是 activeRailPanel，還是乾脆自己開一個本地 state（像 RouteContent 那樣）」——目前沒有任何文件或型別強制這個決策，全靠開發者當下的直覺，這正是為什麼四套系統會並存：不是有人設計了四套，而是每次新增功能都各自複製了一份「哪個面板現在該顯示」的邏輯。

**更好的單一模型建議**：把「目前畫面該顯示什麼」收斂成**一個 discriminated union**，例如：
```
type ViewState =
  | { screen: "home" }
  | { screen: "place"; ... }
  | { screen: "plan"; ... }
  | { screen: "route"; ... }
  | { screen: "navigation"; ... }
  | { screen: "panel"; panel: "a11y" | "bus" | "parking" | "environment" | "hazard" | "welfare" | "saved" }
  | { screen: "assistant" }
```
單一 `viewState` 取代 `sheetMode` + `activeRailPanel` + `chatOpen` + 各元件本地 `subPanel`/`panel`。任何切換都是「設定 `viewState` 為某個值」，不會有兩套系統互相覆蓋的問題，`MODE_PANELS` 這種「誰蓋過誰」的規則表也直接消失，因為同一時間只可能有一個 `viewState`。這是本報告優先級最高的重整項目（見 §4 P0）。

### 2.3 核心旅程步數 — **判定：從打開 App 到開始導航，最少 5 次點擊 / 4 次畫面切換，其中至少 1 次是可以省略的中間層**

實際走一遍 `PlaceContent.tsx` → `RoutePlanContent.tsx` → `RouteContent.tsx` 的程式邏輯：

1. 打開 App → `sheetMode = "home"`（peek 狀態，只看到搜尋列）
2. 點搜尋列輸入地點 → 選到結果 → `handlePlaceChange` 呼叫 `setSheetMode("place")`（畫面 1 → 2）
3. 在地點詳情頁點「規劃路線」→ `handlePlanRoute` 呼叫 `setSheetMode("plan")`（畫面 2 → 3，且此時 `destination` 已經帶入，使用者只需要確認/選起點交通方式）
4. 在規劃頁點「搜尋路線」→ `handleStartRoute` → `handleComputeRoute` 成功後 `setSheetMode("route")`（畫面 3 → 4）
5. 在路線結果頁點「開始導航」→ `handleStartNav` → `setIsNavigating(true)` → `sheetMode = "navigation"`（畫面 4 → 5，且整個 UI 骨架換成 NavigationHUD）

也就是**至少 5 次有意義的點擊、4 次完整畫面切換**才能從「打開 App」走到「開始導航」。對比 Google Maps 的等價流程（搜尋 → 詳情頁直接有「路線」按鈕 → 選一條路線 → 導航），本專案多出來的是**「規劃頁」這一層**——`RoutePlanContent` 本質上只是讓使用者確認起點（預設就是目前位置）跟選交通/無障礙模式，如果起點已經是「目前位置」且使用者只是想要「最常見的無障礙輪椅模式 + 大眾運輸」，這一整層可以合併成地點詳情頁的一個內嵌選項列（像「規劃路線」按鈕旁邊直接放交通模式的下拉），把「地點詳情 → 規劃頁」這一次畫面切換省掉，變成「地點詳情頁內直接觸發路線試算」。

**特別對輪椅使用者的意義**：這條路徑上每一次畫面切換都伴隨 Bottom Sheet 高度變化（peek→half→half→half→peek）與 Rail 面板的 slide 動畫，對於使用單手操作、或需要放慢速度確認每一步的使用者，4 次切換代表 4 次「重新定位注意力、確認畫面沒有跳掉」的認知成本。省一層 = 省 20-25% 的旅程摩擦。

### 2.4 AI 助理的心智定位 — **判定：目前定位模糊，且程式碼本身對「AI 助理到底是什麼」有兩套互相矛盾的說法**

`visual-design-spec.md §4.2/§5.1` 裁決「桌面版 AI 助理入口應該是 Side Rail CTA（跟其他六個分類按鈕平起平坐，但用實心填色特殊化）」；但目前 `BottomSheet.tsx` 第 497-502 行的註解明白寫著：「AI 助理 is NOT a rail item... it's an independent floating button next to SOS/locate, not living in this fixed 56px column」，而 `MapControlsWrapper.tsx` 第 588-604 行也確實把 AI FAB 放在桌面右下角控制群組裡，跟 3D/定位/分享/SOS 同排。

這代表**規範文件與程式碼現況本身就對「AI 助理算不算 Rail 的一份子」有分歧**——這不是視覺問題（規範已經定義好顏色/尺寸），是**尚未執行的結構決策**。從使用者心智模型角度，這個分歧會造成實際困惑：
- 如果 AI 助理是「地圖操作類」（跟 3D/定位/分享同排），使用者會把它理解成「像 SOS 一樣的工具按鈕」，可能不會想到要跟它對話規劃路線。
- 如果 AI 助理是「內容瀏覽類」（跟搜尋/路線同排在 Rail），使用者更容易理解成「這是搜尋的另一種方式（用講的而不是打字）」，跟目前 AI 助理實際功能（可以查設施、規劃路線、對話）更吻合。

**立場**：AI 助理的實際能力（查詢+規劃+對話）在功能上更接近「另一種輸入搜尋/路線需求的方式」，而不是「地圖顯示控制」，**應該歸屬 Rail 而非浮動 FAB 群組**，這與 `visual-design-spec.md §4.2` 的裁決方向一致，只是尚未落地。目前的「浮動 FAB」定位會讓使用者把 AI 助理誤認為次要工具，而非首頁搜尋的平行替代方案，長期會壓低 AI 功能的使用率。落地此裁決應與 §2.2 的單一 `viewState` 重構一起做（AI 助理變成 `viewState = { screen: "assistant" }` 的一個值，不再是疊加在其他兩者之上的第三個正交開關 `chatOpen`）。

### 2.5 登入/註冊在流程裡的位置 — **判定：目前的「延後、非阻斷」設計是對的，不需要調整順序，但兩個需要帳號的功能目前不會主動提示登入，屬於隱性斷點**

`AccountLogin.tsx` 把登入入口做成 Rail 底部（桌面）/ 手機 header 右上角的一個帳號選單按鈕，未登入時整個 App 可以正常瀏覽地圖、搜尋、規劃路線、甚至收藏地點（`savedPlaces` 存在 localStorage，不強制登入）——這個「先讓你用，需要時才問你」的設計方向是對的，**不應該改成強制註冊牆**，對第一次使用、只是想找廁所的使用者尤其重要（見 §3 情境①）。

但實際檢查兩個「隱性需要登入」的功能：
- **語音對話**（`AIChatBot.tsx` `handleMicClick`）：未登入會跳 `toast.error("請先登入才能使用語音對話")`，這是一個**事後才知道**的阻擋，使用者要先點麥克風、等 toast 跳出來才知道這功能需要帳號，不是在按鈕本身就標示清楚（例如加一個小鎖頭圖示或 disabled 狀態）。
- **SOS 緊急聯絡人**（`EmergencyContactsManager`，在設定裡的「安全」分頁）：`settingsTab === "safety" && !user` 只顯示一行「請登入」純文字，沒有引導使用者「去哪裡登入」（沒有一個可點的登入按鈕在這個空狀態裡，使用者得自己回頭找 Rail 底部的帳號選單）。

**立場**：登入時機的「延後」原則不需要改，但兩處**空狀態/阻擋狀態的訊息需要補一個直接可點的「登入」CTA**，而不是只顯示文字或 toast，這在 SOS 相關功能上尤其重要——一個真的需要在緊急時刻設定聯絡人的使用者，不該被要求自己去找登入入口在哪裡。

### 2.6 導航模式跟一般模式的斷層 — **判定：斷層是刻意且大部分正確的設計選擇，但轉場的「返回路徑」比「進入路徑」弱，容易讓使用者誤以為東西不見了**

`isNavigating = true` 時：Rail 整組隱藏（`isNavigating && "hidden"`）、Bottom Sheet 幾乎全收（`navHidesChrome`）、`MapControlsWrapper` 換成一整組不同的按鈕（語音/定位/SOS，不再有 3D/分享/AI）、地圖疊加全新的 `NavigationHUD`。這個「map-first，UI 儘量隱藏」的邏輯本身是對的方向——Google Maps／Apple Maps 進入導航模式也是類似的骨架級切換，使用者對「進入導航＝畫面會大幅簡化」有既有預期，不算是「感覺變了一個完全不同的 App」的負面體驗，**這條斷層應該保留**。

真正的風險在**離開導航**這條路徑：`confirmNavExit`／`setIsNavigating(false)` 呼叫後，`sheetMode` 被設回 `"route"`（`useMapStore.ts` 第 475 行），但如果使用者是透過 Rail 點擊其他項目觸發離開導航（`requestNavExit`），目的地反而是 `intent.target`（可能是 `"plan"`／`"home"`／其他 rail panel）——也就是說**離開導航後回到哪個畫面，取決於使用者用哪個按鈕觸發離開**，這個規則本身沒有寫在任何可見的 UI 提示上（`ExitNavDialog` 只問「確定要離開導航嗎」，沒有告知「離開後你會看到路線總覽 / 首頁 / 你剛才想去的面板」）。對輪椅使用者或长者而言，導航中途因為各種理由（走錯路、想查旁邊的無障礙廁所）中斷導航後，下一秒畫面突然變成完全不同的內容，會產生「我剛剛做了什麼、現在在哪裡」的困惑感，這是需要在 `ExitNavDialog` 補上明確文案的地方（例如「離開後回到路線總覽」）。

### 2.7 手機版跟桌面版是否真的一致 — **判定：核心邏輯一致，但至少三處具體不一致，其中一處是真的會讓手機使用者卡住的行為差異**

具體檢查 `MapControlsWrapper.tsx`：

1. **AI 助理入口在两个平台的角色不同**：手機版 FAB 標示為註解「primary entry」（唯一入口），桌面版同時有 FAB **和**理論上該有的 Rail CTA（但 Rail CTA 尚未真的實作，見 §2.4）——目前兩平台實質上都只有 FAB，是巧合地一致，但一旦桌面補上 Rail CTA、卻忘記同步從桌面 FAB 移除，就會變成「桌面有兩個入口，手機只有一個」的新落差。
2. **「更多」收合機制只在手機存在**：手機版 3D/分享收在 `moreControlsOpen` 的加號展開選單裡，桌面版 3D/分享是恆定顯示的獨立按鈕，理由（手機螢幕直向空間有限）合理，但這代表**同一個「3D 切換」按鈕在手機上多一層點擊**（先點加號展開，才看到 3D 按鈕），如果使用者常用 3D 檢視建築物（例如判斷坡道方向），手機上的操作成本比桌面高，值得在資料上驗證這是否造成實際使用率落差。
3. **`RouteContent.tsx` 的本地 `panel` state（explanation/environment/hazard）沒有手機/桌面差異，但它本身就是跟 activeRailPanel 重複的第三份 environment/hazard 顯示邏輯**——這不是手機桌面不一致，而是同一份重複邏輯在两平台都存在，見 §2.2。

**立場**：手機/桌面的差異大多是「螢幕空間限制下的合理取捨」，不需要追求像素級一致；但**AI 助理入口的角色定位**（主要入口 vs 次要浮動按鈕）应該兩平台講同一個故事，目前的一致只是因為桌面版該做的重構還沒做，一旦做了必須連動確認手機版邏輯沒有被遺漏（对齐 `visual-design-spec.md §7.5` 驗收清單裡「桌面/手機分開驗收」的既有要求）。

---

## 3. 使用者情境走查

### 情境① 第一次使用、想找無障礙廁所（新使用者，可能對 App 完全陌生）

1. 打開 App → 只看到搜尋列（peek 狀態）+ 快捷 chip（含「無障礙設施」）——**這一步是好的**，不需要學習就能找到入口。
2. 點快捷 chip 的「無障礙設施」→ `openA11y()` 同時觸發 `activeRailPanel` 與本地 `subPanel` → 顯示 `A11yPanel`。
3. **卡點**：`A11yPanel` 本身需要使用者先勾選類型（廁所/電梯/坡道等）才會出資料（`toggleA11yType`），對第一次使用、不熟悉「這個 App 需要先篩選才有結果」慣例的使用者，這一步容易被誤以為「沒有資料」而放棄。這不是本報告職責範圍內的元件內部 UX（A11yPanel 本身的互動設計），但值得記錄：**首次使用者在這裡的挫折感，跟「入口找不到」無關（入口做得很好），而是「找到入口後才發現還要多一步設定」**。
4. 找到廁所後點擊 → 地圖飛過去、可能想規劃路線過去——這裡會發現「無障礙設施結果」本身**沒有直接的「規劃路線去這裡」按鈕**（`A11yPanel` 點擊行為多半只是 `flyTo`，需要使用者自己再手動去搜尋這個地點才能進入 `PlaceContent` 拿到「規劃路線」按鈕），這是一個明確的斷點：**從「發現一個無障礙設施」到「規劃路線過去」之間缺一座橋**。

### 情境② 常用者、想規劃一條路線後導航

依 §2.3 的路徑，5 次點擊、4 次畫面切換。常用者对這個節奏可能已經熟悉、不算卡點，但**規劃頁（`RoutePlanContent`）在「目的地已知」的情況下,仍然要求使用者手動確認交通模式與無障礙模式**——如果使用者的無障礙模式是固定的（例如永遠是「輪椅」），每次都要重新點選同一個選項,这是重複性摩擦，可以用「記住上次選擇」的方式（localStorage 存最後一次的 travelMode/a11yMode 作為預設值，而非固定 `"transit"`/`"normal"`）幾乎零成本地優化掉这一步。

### 情境③ 需要 SOS 緊急求助

1. SOS 按鈕在任何模式下都是右下角固定位置、恆定可見（一般模式與導航模式皆有）——**這是全站做得最好的部分**，符合「緊急功能不可被任何面板狀態遮擋」的原則（也呼應 `visual-design-spec.md §1.4` 的 z-index 推導邏輯）。
2. **卡點**：如果使用者從未設定過緊急聯絡人（`EmergencyContactsManager`），在真正需要 SOS 的當下才發現「原來 SOS 對話框需要先有聯絡人資料」，而設定聯絡人的入口藏在「帳號選單 → 設定 → 安全分頁」，如果此時使用者又還沒登入，看到的只是一行「請登入」文字（見 §2.5），**這是三層深的迷宮，發生在使用者最不該被要求多想的緊急情境**。SOS 按鈕本身可即點即用（不需要登入即可打開對話框），但「有沒有預先設定好聯絡人」這件事完全没有在平時被提醒或引導完成，屬於「功能存在但沒有主動要求使用者完成前置設定」的落差。

---

## 4. 優先排序的重整建議清單

| # | 建議 | 影響範圍 | 風險 | 與 visual-design-spec.md 的關係 |
|---|---|---|---|---|
| 1 | **P0** 統一「目前畫面該顯示什麼」為單一 `viewState`，取代 `sheetMode` + `activeRailPanel` + `chatOpen` + `HomeContent.subPanel` + `RouteContent.panel` 五套並行機制 | `useMapStore.ts` 大改；`BottomSheet.tsx`、`HomeContent.tsx`、`RouteContent.tsx` 都要拔掉本地 state 改讀全域 | 中—高：牽動全站每個面板的顯示邏輯，需要完整回歸測試（尤其 §2.6 提到的離開導航目標邏輯、AI 助理疊加邏輯） | 不衝突，是 §5.2「面板插槽同一時間只顯示一件事」裁決的自然延伸——目前 spec 只裁決了 chatOpen 這一個正交開關要收斂，這裡建議把收斂範圍擴大到全部平行狀態 |
| 2 | **P0** 首頁快捷 chip 改為呼叫 `setActiveRailPanel(id)`，刪除 `HomeContent.subPanel` 本地狀態 | 僅 `HomeContent.tsx` | 低：功能不變,只是接到同一份全域狀態 | 與 #1 是同一件事的先行小步（可以先做這個驗證方向對不對,再做全面 viewState 重構） |
| 3 | **P0** 落實 `visual-design-spec.md §4.2` 的 AI 助理 Rail CTA 裁決（目前程式碼尚未執行,§2.4 的分歧） | `BottomSheet.tsx` 新增 Rail 項目、`MapControlsWrapper.tsx` 桌面版移除 AI FAB | 低—中:桌面版改動小,手機版維持 FAB 不動 | 直接執行 spec 已裁決但未落地的項目,不是新增衝突 |
| 4 | **P1** 地點詳情頁 → 規劃路線頁合併一層：`PlaceContent` 內直接可選交通/無障礙模式並試算路線,省略獨立的 `RoutePlanContent` 中間頁（起訖點都已知的情境） | `PlaceContent.tsx`、`RoutePlanContent.tsx` | 中:`RoutePlanContent` 目前還負責多起點/多個 waypoint 的完整規劃,不能整個刪除,只能做「常見情境的捷徑」,需要仔細界定何時走捷徑、何時仍導向完整規劃頁 | 不衝突,純資訊架構調整 |
| 5 | **P1** SOS 緊急聯絡人設定，補上主動引導（例如：使用者第一次點開 SOS 對話框、若尚無聯絡人,對話框內直接嵌入「設定緊急聯絡人」的 CTA,而不是要求使用者自己去帳號選單找) | `SosDialog.tsx`（本次未讀,但可推測改動範圍）、`AccountLogin.tsx` 的 safety 分頁空狀態補登入 CTA | 低 | 不衝突 |
| 6 | **P1** 語音對話麥克風按鈕的登入需求，改成按鈕本身可視狀態提示（例如未登入時顯示小鎖頭圖示）,而非點擊後才跳 toast | `AIChatBot.tsx` | 低 | 不衝突,可與現有 icon 語意系統相容（鎖頭是新圖示,需要一併定義語意色,建議跟 nav-review 一起訂） |
| 7 | **P1** 離開導航確認對話框（`ExitNavDialog`）補上明確文案,告知使用者離開後會回到哪個畫面 | `ExitNavDialog.tsx` | 低 | 不衝突,屬於文案/內容補強 |
| 8 | **P2** `RoutePlanContent` 的交通模式/無障礙模式記住使用者上次選擇（localStorage）,不要每次都重置成 `transit`/`normal` | `RoutePlanContent.tsx` | 低 | 不衝突 |
| 9 | **P2** A11yPanel 結果加上「規劃路線去這裡」的直接按鈕,補上情境①提到的「發現設施→規劃路線」斷點 | `A11yPanel.tsx`（本次未讀,需要 nav-dev 進一步確認可行性） | 低—中,取決於 A11yPanel 目前資料結構是否已含足夠資訊建立 PlaceDetail | 不衝突 |
| 10 | **P3** 手機版「更多控制項」收合機制與桌面版恆定顯示的落差,待 #3 落地後一併檢視是否要讓兩平台的 AI 入口地位（主要 vs 次要）真正對齊 | `MapControlsWrapper.tsx` | 低,屬於觀察後才決定是否要動的追蹤項 | 依附於 #3 完成後才有意義去評估 |

---

## 5. 給 nav-product / nav-dev 的下一步建議

1. 先做 #2（首頁 chip 接到 `activeRailPanel`）當作 #1 全面重構的探路石——改動小、可驗證「單一狀態來源」這個方向是否真的讓行為變得更可預測,再決定要不要投入 #1 的完整 `viewState` 重構。
2. #1 完整重構建議另開一份獨立的技術重構規格（不是這份 UX 診斷的範圍),把每一個現有呼叫點（`setSheetMode`、`setActiveRailPanel`、`setChatOpen`、`HomeContent.subPanel`、`RouteContent.panel`）都列出來對照新舊行為,避免回歸測試遺漏。
3. #3（AI 助理歸位 Rail）可以獨立於 #1 先做,风险最低、也是最能立即讓「AI 助理到底是什麼」這個心智模型變清楚的一步。
