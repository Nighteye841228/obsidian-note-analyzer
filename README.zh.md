# Note Linter 使用說明

Note Linter 是一個被動式 Obsidian 筆記品質檢查工具。它不會自動修改筆記，而是像程式碼 linter 一樣，根據筆記的連結、結構與維護狀態顯示警告。

## 啟用方式

1. 在 Obsidian 中啟用 Community plugins。
2. 安裝或載入 `obsidian-note-linter`。
3. 開啟命令面板，執行 `Open Dashboard`，或點擊左側 ribbon 的警告圖示。
4. 如需重新掃描，在 plugin settings 中按 `Rebuild Cache`。

## Dashboard

Dashboard 會依警告類型分組：

- `Orphan Note`
- `Atomicity Violation`
- `Knowledge Sink`
- `Knowledge Decay`
- `Unfinished Stub`

每個分類都可以展開或摺疊。分類名稱後方會顯示警告數量。每條警告中的重要數值會以紅色顯示，方便快速掃描。

點擊筆記名稱會在主視窗開啟該筆記。

## 警告類型

### Orphan Note

筆記建立已超過設定天數，且沒有連出、沒有被連入，也沒有被 MOC/Index 收錄。

這代表筆記可能沒有進入知識網路。

### Atomicity Violation

筆記可能過於龐大或包含太多概念。目前可檢查三種條件：

- 字數超過設定值
- H1/H2/H3 標題數超過設定值
- 列表項目數超過設定值

每個條件都可以獨立啟用或停用。

### Knowledge Sink

很多筆記連到它，但它沒有連出去任何筆記。

這類筆記可能是知識黑洞：它被其他內容引用，但沒有把思考延伸到其他概念。

### Knowledge Decay

筆記太久沒有更新，而且位於知識網路中較重要的位置。

Dashboard 會顯示簡短訊息，例如：

```text
Not been updated 100 days.
```

內部計算使用 Decay Index：

```text
Decay Index = 未更新天數 x 中心性分數 x 筆記類型權重
```

`Decay Index Threshold` 不是天數，而是警告敏感度分數。數值越低，越容易出現 decay 警告；數值越高，只會顯示更核心且更久未更新的筆記。

### Unfinished Stub

筆記中包含未完成項目，例如 markdown task checkbox。

## 主要設定

### Debug Logging

開啟後會在 Obsidian developer console 顯示掃描資訊，包括每篇筆記的 metrics、warnings，以及 `topDecayScores`。

### Orphan Days Threshold

孤立筆記被警告前需要存在的天數。

### Black Hole Inbound Threshold

Knowledge Sink 的最低被連入數量。  
例如設定為 `1`，代表至少有 1 篇筆記連到它且它沒有連出去時，就會被警告。

### Decay Index Threshold

Knowledge Decay 的警告分數門檻，不是天數。

建議調整方式：

- 警告太多：調高，例如 `50` 或 `100`
- 警告太少：調低，例如 `10` 或 `20`
- 預設值：`30`

### Decay Weights

不同類型筆記的 decay 權重：

- `MOC Decay Weight`
- `Default Decay Weight`
- `Evergreen Decay Weight`
- `Literature Decay Weight`

MOC 預設較高，文獻摘錄預設較低。

### MOC / Index Tags

用來判斷哪些筆記是 MOC 或 Index。預設：

```text
#MOC, #Index
```

### Excluded Folders / Excluded Tags

可排除不想檢查的資料夾或 tag，例如 daily notes、journal、template。

## 疑難排解

### Dashboard 沒有顯示警告

1. 確認 plugin 已啟用。
2. 按 `Rebuild Cache`。
3. 開啟 `Debug Logging`。
4. 開 developer console，搜尋：

```text
[Note Linter]
```

### Black Hole 沒有觸發

確認該筆記：

- 被連入數量大於或等於 `Black Hole Inbound Threshold`
- 沒有任何 outbound links

### Decay 沒有觸發

Decay 不是只看天數。請在 debug console 的 `topDecayScores` 查看該筆記的 `decayIndex` 是否低於 `Decay Index Threshold`。

