import { IconHelpCircle, IconGlobe, IconMic, IconGamepad2, IconUsers, IconShield, IconStar, IconBot } from '@/components/Icons';

const sections = [
  {
    id: 'lobby',
    icon: <IconGlobe size={18} />,
    title: '組隊大廳',
    items: [
      { q: '如何建立房間？', a: '點擊「開房間」按鈕，填寫 Riot ID、遊戲模式、牌位限制與備註後送出即可。建立者自動成為隊長。' },
      { q: '如何加入房間？', a: '在大廳列表中找到想加入的房間，點擊「加入」按鈕即可。房間滿 5 人或開始後無法加入。' },
      { q: '隊長可以做什麼？', a: '隊長可以「出發開打」開始戰局，或「關閉」解散房間。在語音聊天中，隊長可以滑鼠右鍵點擊成員進行靜音或移出。' },
      { q: '房間狀態是什麼？', a: 'OPEN = 開放加入，PLAYING = 已出發，CLOSED = 已關閉。' },
    ],
  },
  {
    id: 'voice',
    icon: <IconMic size={18} />,
    title: '語音聊天',
    items: [
      { q: '如何使用語音？', a: '加入房間後點擊「加入語音聊天」按鈕，瀏覽器會要求麥克風權限，允許後即可通話。' },
      { q: '語音需要額外軟體嗎？', a: '不需要。ValoLink 使用 LiveKit 技術直接在瀏覽器內運作，不需下載任何軟體。' },
      { q: '如何設定麥克風/喇叭？', a: '進入語音聊天室後點擊「音訊設定」按鈕，即可選擇不同的輸入/輸出裝置。' },
      { q: '無法聽到或發聲怎麼辦？', a: '確認瀏覽器已允許麥克風權限，檢查「音訊設定」中的裝置是否正確。若仍無法使用，請至官方 Discord 回報。' },
    ],
  },
  {
    id: 'riot',
    icon: <IconGamepad2 size={18} />,
    title: 'Riot ID 綁定',
    items: [
      { q: '為什麼要綁定 Riot ID？', a: '綁定後系統會自動抓取您的 Valorant 牌位資訊，讓其他玩家更了解您的實力，也作為組隊篩選參考。' },
      { q: '如何綁定？', a: '至「設定」頁面，在「Riot ID 綁定」欄位輸入您的 Riot ID（含 #，例如 TenZ#NA1），點擊綁定即可。' },
      { q: '綁定失敗怎麼辦？', a: '請確認 Riot ID 格式正確（含 # 且大小寫正確），並確認伺服器有設定 RIOT_API_KEY。若問題持續，請至官方 Discord 詢問。' },
    ],
  },
  {
    id: 'reputation',
    icon: <IconStar size={18} />,
    title: '信用評分',
    items: [
      { q: 'ValoScore 是什麼？', a: 'ValoScore 是您的信用評分，初始值為 100。每次組隊後可對隊友評分，正面評價會加分，負面評價會扣分。' },
      { q: '如何評分隊友？', a: '戰局結束後，在大廳或個人控制台中點擊「評價隊友」按鈕，選擇正面（讚）或負面（倒讚）。' },
      { q: '分數太低會怎樣？', a: '部分伺服器可設定最低 ValoScore 門檻，低於門檻的玩家可能無法加入該伺服器開設的房間。' },
    ],
  },
  {
    id: 'admin',
    icon: <IconShield size={18} />,
    title: '管理員功能',
    items: [
      { q: '如何成為管理員？', a: '將 ValoLink Bot 邀請至您擁有管理員權限的 Discord 伺服器，然後在管理員頁面點擊「驗證管理員身份」通過 Discord 授權即可。' },
      { q: '管理員可以做什麼？', a: '設定機器人公告頻道、調整最低信用門檻、管理可疑用戶、查看信用事件紀錄。' },
      { q: '如何設定公告頻道？', a: '在管理員面板的「伺服器設定」中，填入 Discord 頻道 ID 至「揪團公告頻道 ID」欄位並儲存。' },
    ],
  },
  {
    id: 'discord',
    icon: <IconBot size={18} />,
    title: 'Discord 機器人',
    items: [
      { q: '如何邀請機器人？', a: '在管理員頁面點擊「邀請機器人至伺服器」按鈕，選擇您的伺服器並授權管理員權限。' },
      { q: '機器人有哪些功能？', a: '自動在公告頻道張貼揪團訊息、同步房間狀態、查詢玩家資訊與信用分數。' },
      { q: '機器人的指令有哪些？', a: '請參考大廳中的「平台指令」面板，或輸入 /help 查看所有可用指令。' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container" style={{ maxWidth: '780px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '32px 0 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IconHelpCircle size={24} /> 使用說明
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.92rem' }}>
        ValoLink.gg 使用教學與常見問題
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {sections.map((section) => (
          <div key={section.id} className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {section.icon}
              {section.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {section.items.map((item, i) => (
                <details key={i} style={{ borderBottom: i < section.items.length - 1 ? '1px solid var(--border-muted)' : 'none', paddingBottom: i < section.items.length - 1 ? '12px' : '0' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', padding: '4px 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-blue)', fontSize: '0.75rem' }}>▼</span>
                    {item.q}
                  </summary>
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: '20px' }}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
