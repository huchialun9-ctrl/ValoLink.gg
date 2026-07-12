# VALOLINK.GG

> 特戰英豪找人平台 — 用真實戰績說話，用信用分篩隊友。

## 這專案在幹嘛

ValoLink.gg 是一個跨 Discord 伺服器的組隊配對平台。主要做的事：

- **開房揪團** — 在網頁上直接開隊伍，設定模式、牌位限制、備註
- **信用評分** — 打完可以互評（友善 / 嘴砲 / 掛網），分數會影響之後能跟誰組隊
- **Riot ID 綁定** — 綁定後自動拉牌位跟戰績，不用手key
- **語音聊天** — 用 LiveKit 做的，進房可以直接講話，不用跳 Discord
- **即時大廳** — Server-Sent Events 推送，有人開/關房畫面自動更新
- **管理面板** — Discord 管理員可以在網頁上調設定、看信用事件、清可疑用戶

## 技術選型

| 層 | 用什麼 |
| --- | --- |
| 框架 | Next.js 16 (webpack) |
| 語音 | LiveKit |
| 資料庫 | PostgreSQL + Prisma |
| 樣式 | CSS Module + 自訂變數 |
| 部署 | Render |

## 開發

```bash
npm install
npm run dev
```

環境變數請看 `.env`，裡面有 Discord OAuth、LiveKit、HenrikDev API 那些。

## 頁面路徑

- `/` — 組隊大廳，主要入口
- `/dashboard` — 個人控制台，綁定 Riot ID、看信用走勢、互評隊友
- `/leaderboard` — 信用排行榜
- `/player/[discordId]` — 公開玩家頁面
- `/admin` — 伺服器管理員設定面板

## 語音怎麼運作

進房間 → 跟 LiveKit Server 要 token → 用 WebSocket 進語音房 → 推 mic track → 收大家音訊。

Audio Settings 面板可以切 mic 跟 speaker 裝置，ControlBar 控制 mute / disconnect。

## 免責

Riot API 資料來自 Riot Games 官方 API，牌位查詢走 HenrikDev。跟 Riot Games 沒有合作關係。
