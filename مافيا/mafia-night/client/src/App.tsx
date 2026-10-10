import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Role = "mafia" | "citizen" | "detective" | "doctor";
type Phase = "waiting" | "night" | "discussion" | "vote" | "finished";
type Settings = { maxPlayers: number; isPublic: boolean; discussionSeconds: number; voteSeconds: number; nightSeconds: number; specialRoles: boolean; doctorCanSelf: boolean; doctorCanRepeat: boolean; mafiaVoiceAtNight: boolean };
type Member = { id: string; name: string; avatar: string; host: boolean; connected: boolean; alive: boolean; ready: boolean };
type Room = {
  code: string; settings: Settings; hostId: string; phase: Phase; phaseEndsAt?: number; winner?: "mafia" | "town"; minPlayers: number;
  players: Member[]; me: { id: string; role?: Role; alive: boolean; ready: boolean; mafiaTeammates: string[]; canUseVoice: boolean };
  events: { id: string; text: string; at: number; kind: string }[];
  messages: { id: string; playerId: string; name: string; avatar: string; text: string; scope: string; at: number }[];
  finalRoles?: { id: string; name: string; role?: Role }[];
};
type PublicRoom = { code: string; hostName: string; playerCount: number; maxPlayers: number; specialRoles: boolean };
type Page = "home" | "create" | "join" | "public" | "room";

const standaloneServerUrl = (window as Window & { __MAFIA_SERVER_URL?: string }).__MAFIA_SERVER_URL?.trim().replace(/\/+$/, "");
const serverUrl = standaloneServerUrl || import.meta.env.VITE_SERVER_URL || undefined;
const sessionKey = "mafia-night-session";
const socket: Socket = io(serverUrl, { autoConnect: false, auth: { sessionToken: localStorage.getItem(sessionKey) ?? undefined } });
const avatars = ["🕵️", "🌙", "🦊", "🎭", "🧿", "🗝️", "🦇", "♟️", "🧩", "🦉"];
const roleName: Record<Role, string> = { mafia: "مافيا", citizen: "مواطن", detective: "المحقق", doctor: "الدكتور" };
const phaseName: Record<Phase, string> = { waiting: "غرفة الانتظار", night: "الليل", discussion: "النقاش", vote: "التصويت", finished: "انتهت المباراة" };

function emitAck(event: string, payload?: unknown) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const timeout = window.setTimeout(() => resolve({ ok: false, error: "انتهت مهلة الاتصال بالخادم." }), 8_000);
    const done = (result: { ok: boolean; error?: string }) => { window.clearTimeout(timeout); resolve(result); };
    const emit = socket.emit as (...args: unknown[]) => void;
    if (payload === undefined) emit(event, done); else emit(event, payload, done);
  });
}

function saveSession(token: string, roomCode: string, playerId: string) {
  localStorage.setItem(sessionKey, JSON.stringify({ token, roomCode, playerId }));
  socket.auth = { sessionToken: token };
}

function storedSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) ?? "null") as { token: string; roomCode: string; playerId: string } | null; }
  catch { return null; }
}

export default function App() {
  const [page, setPage] = useState<Page>(() => location.hash.startsWith("#join=") ? "join" : storedSession() ? "room" : "home");
  const [room, setRoom] = useState<Room>();
  const [playersOnline, setPlayersOnline] = useState(0);
  const [toast, setToast] = useState<string>();
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [joinCode, setJoinCode] = useState(() => decodeURIComponent(location.hash.replace("#join=", "")).toUpperCase());
  const [soundOn, setSoundOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("mn-reduce-motion") === "true");

  const showError = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(undefined), 4500); }, []);
  const fetchPublicRooms = useCallback(() => socket.emit("room:list", (data: { rooms: PublicRoom[] }) => setPublicRooms(data.rooms)), []);

  useEffect(() => {
    const saved = storedSession();
    socket.auth = { sessionToken: saved?.token };
    socket.connect();
    socket.on("app:presence", ({ playersOnline: total }) => setPlayersOnline(total));
    socket.emit("app:status", ({ playersOnline: total }: { playersOnline: number }) => setPlayersOnline(total));
    socket.on("room:state", (next: Room) => { setRoom(next); setPage("room"); });
    socket.on("session:issued", ({ token, roomCode, playerId }) => saveSession(token, roomCode, playerId));
    socket.on("session:expired", () => { localStorage.removeItem(sessionKey); setRoom(undefined); setPage("home"); showError("انتهت جلستك؛ انضم إلى الغرفة من جديد."); });
    socket.on("app:error", ({ message }: { message: string }) => showError(message));
    socket.on("game:private-notice", ({ text }: { text: string }) => showError(text));
    fetchPublicRooms();
    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, [fetchPublicRooms, showError]);

  useEffect(() => {
    const syncHash = () => {
      if (location.hash.startsWith("#join=")) { setJoinCode(decodeURIComponent(location.hash.replace("#join=", "")).toUpperCase()); setPage("join"); }
    };
    addEventListener("hashchange", syncHash);
    return () => removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle("reduce-motion", reduceMotion); localStorage.setItem("mn-reduce-motion", String(reduceMotion)); }, [reduceMotion]);

  const navigate = (next: Page) => { if (next !== "join") history.replaceState(null, "", location.pathname); setPage(next); if (next === "public") fetchPublicRooms(); };
  const createRoom = async (details: { name: string; avatar: string; settings: Settings }) => {
    const result = await new Promise<{ ok: boolean; error?: string; token?: string; roomCode?: string; playerId?: string }>((resolve) => {
      socket.emit("room:create", details, resolve);
    });
    if (!result.ok || !result.token || !result.roomCode || !result.playerId) return showError(result.error ?? "تعذر إنشاء الغرفة.");
    saveSession(result.token, result.roomCode, result.playerId);
    setPage("room");
  };
  const joinRoom = async (details: { name: string; avatar: string; code: string }) => {
    const result = await new Promise<{ ok: boolean; error?: string; token?: string; roomCode?: string; playerId?: string }>((resolve) => {
      socket.emit("room:join", details, resolve);
    });
    if (!result.ok || !result.token || !result.roomCode || !result.playerId) return showError(result.error ?? "تعذر الانضمام إلى الغرفة.");
    saveSession(result.token, result.roomCode, result.playerId);
    setPage("room");
  };

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate("home")} aria-label="الصفحة الرئيسية"><span className="brand-mark">M</span><span>MAFIA <i>NIGHT</i></span></button>
      <div className="topbar-actions"><span className="online"><b /> {playersOnline} متصل الآن</span><button className="icon-button" onClick={() => setSoundOn(!soundOn)} aria-label="إعدادات الصوت">{soundOn ? "🔊" : "🔇"}</button><button className="icon-button" onClick={() => setReduceMotion(!reduceMotion)} aria-label="تقليل الحركة">◌</button></div>
    </header>
    {toast && <div className="toast" role="alert">{toast}<button onClick={() => setToast(undefined)}>×</button></div>}
    {page === "home" && <Home onNavigate={navigate} online={playersOnline} />}
    {page === "create" && <CreateRoom onBack={() => navigate("home")} onCreate={createRoom} />}
    {page === "join" && <JoinRoom onBack={() => navigate("home")} initialCode={joinCode} onJoin={joinRoom} />}
    {page === "public" && <PublicRooms rooms={publicRooms} onBack={() => navigate("home")} onJoin={(code) => { setJoinCode(code); navigate("join"); }} onRefresh={fetchPublicRooms} />}
    {page === "room" && room && <RoomScreen room={room} soundOn={soundOn} onError={showError} onLeave={() => { localStorage.removeItem(sessionKey); socket.auth = {}; setRoom(undefined); navigate("home"); }} />}
    {page === "room" && !room && <section className="loading-card"><div className="loader" /> جارٍ استعادة غرفتك…</section>}
    <footer>MAFIA NIGHT <span>•</span> اكشف الخائن... أو اخدع الجميع.</footer>
  </main>;
}

function Home({ onNavigate, online }: { onNavigate: (page: Page) => void; online: number }) {
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">لعبة اجتماعية مباشرة</p><h1>في هذه المدينة،<br /><em>لا أحد بريء.</em></h1><p className="hero-description">اكشف الخائن قبل أن يبتلع الظلام المدينة. لعبة مافيا عربية حيّة مع أصدقائك، قرارات سرية، وتصويت يغيّر كل شيء.</p><div className="hero-actions"><button className="primary-button" onClick={() => onNavigate("create")}>أنشئ غرفة <span>←</span></button><button className="secondary-button" onClick={() => onNavigate("join")}>انضم بكود</button></div><div className="live-note"><span className="pulse" /> {online || "—"} لاعبون في المدينة الآن</div></div>
      <div className="hero-scene" aria-hidden="true"><div className="moon" /><div className="skyline" /><div className="scene-card"><span>المرحلة الحالية</span><b>☾ الليل يحلّ</b><small>اختر هدفك بحذر</small></div></div>
    </section>
    <section className="quick-grid"><button onClick={() => onNavigate("create")}><span>✦</span><b>غرفة خاصة</b><small>ادعُ أصدقاءك بكود آمن</small></button><button onClick={() => onNavigate("public")}><span>◎</span><b>غرف عامة</b><small>ادخل لعبة متاحة الآن</small></button><button onClick={() => onNavigate("join")}><span>⌘</span><b>لدي كود</b><small>انضم إلى أصدقائك فورًا</small></button></section>
    <section className="rules-section"><p className="eyebrow">كيف تلعب؟</p><h2>ثلاث مراحل. قرار واحد في كل مرة.</h2><div className="rule-grid"><article><span>01</span><h3>الليل</h3><p>تعمل الأدوار الخاصة في الخفاء. المافيا تختار، المحقق يكشف، والدكتور ينقذ.</p></article><article><span>02</span><h3>النقاش</h3><p>حلّل ما حدث، راقب التناقضات، وادفع الآخرين لكشف نواياهم.</p></article><article><span>03</span><h3>التصويت</h3><p>صوت واحد قد ينقذ المدينة أو يمنح المافيا طريقها إلى الفوز.</p></article></div></section>
  </>;
}

function PlayerIdentity({ name, setName, avatar, setAvatar }: { name: string; setName: (value: string) => void; avatar: string; setAvatar: (value: string) => void }) {
  return <fieldset className="identity"><label>اسمك في اللعبة<input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="مثال: المحقق" autoFocus /></label><div><label>اختر رمزك</label><div className="avatar-picker">{avatars.map((item) => <button type="button" className={avatar === item ? "selected" : ""} onClick={() => setAvatar(item)} key={item}>{item}</button>)}</div></div></fieldset>;
}

function CreateRoom({ onBack, onCreate }: { onBack: () => void; onCreate: (details: { name: string; avatar: string; settings: Settings }) => void }) {
  const [name, setName] = useState(""); const [avatar, setAvatar] = useState(avatars[0]); const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>({ maxPlayers: 8, isPublic: false, discussionSeconds: 90, voteSeconds: 45, nightSeconds: 45, specialRoles: true, doctorCanSelf: true, doctorCanRepeat: false, mafiaVoiceAtNight: true });
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); await onCreate({ name, avatar, settings }); setBusy(false); };
  const setting = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  return <section className="form-layout"><button className="back-link" onClick={onBack}>→ العودة</button><div className="form-heading"><p className="eyebrow">قائد المدينة</p><h1>أنشئ لعبتك</h1><p>يمكنك تغيير هذه الإعدادات قبل بدء المباراة فقط.</p></div><form onSubmit={submit} className="game-form"><PlayerIdentity {...{ name, setName, avatar, setAvatar }} /><div className="divider" /><div className="form-grid"><label>الحد الأقصى للاعبين <output>{settings.maxPlayers} لاعبًا</output><input type="range" min="4" max="16" value={settings.maxPlayers} onChange={(event) => setting("maxPlayers", Number(event.target.value))} /></label><label>مدة النقاش<select value={settings.discussionSeconds} onChange={(event) => setting("discussionSeconds", Number(event.target.value))}><option value="60">دقيقة</option><option value="90">دقيقة ونصف</option><option value="120">دقيقتان</option><option value="180">3 دقائق</option></select></label><label>مدة التصويت<select value={settings.voteSeconds} onChange={(event) => setting("voteSeconds", Number(event.target.value))}><option value="30">30 ثانية</option><option value="45">45 ثانية</option><option value="60">دقيقة</option></select></label><label>مدة الليل<select value={settings.nightSeconds} onChange={(event) => setting("nightSeconds", Number(event.target.value))}><option value="30">30 ثانية</option><option value="45">45 ثانية</option><option value="60">دقيقة</option></select></label></div><div className="toggle-list"><Toggle checked={settings.isPublic} onChange={(value) => setting("isPublic", value)} label="غرفة عامة" hint="تظهر في قائمة الغرف المتاحة" /><Toggle checked={settings.specialRoles} onChange={(value) => setting("specialRoles", value)} label="أدوار خاصة" hint="أضف المحقق والدكتور عند 5 لاعبين أو أكثر" /><Toggle checked={settings.doctorCanSelf} onChange={(value) => setting("doctorCanSelf", value)} label="الدكتور ينقذ نفسه" hint="اسمح للدكتور باختيار نفسه" /><Toggle checked={settings.doctorCanRepeat} onChange={(value) => setting("doctorCanRepeat", value)} label="إنقاذ متكرر" hint="اسمح بإنقاذ اللاعب نفسه في ليلتين متتاليتين" /><Toggle checked={settings.mafiaVoiceAtNight} onChange={(value) => setting("mafiaVoiceAtNight", value)} label="صوت المافيا الليلي" hint="قناة صوتية سرية لأفراد المافيا" /></div><button disabled={busy || name.trim().length < 2} className="primary-button full">{busy ? "جارٍ الإنشاء…" : "إنشاء الغرفة"} <span>←</span></button></form></section>;
}

function JoinRoom({ onBack, initialCode, onJoin }: { onBack: () => void; initialCode: string; onJoin: (details: { name: string; avatar: string; code: string }) => void }) {
  const [name, setName] = useState(""); const [avatar, setAvatar] = useState(avatars[0]); const [code, setCode] = useState(initialCode); const [busy, setBusy] = useState(false);
  useEffect(() => setCode(initialCode), [initialCode]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); await onJoin({ name, avatar, code: code.toUpperCase() }); setBusy(false); };
  return <section className="form-layout narrow"><button className="back-link" onClick={onBack}>→ العودة</button><div className="form-heading"><p className="eyebrow">دعوة سرية</p><h1>انضم إلى الغرفة</h1><p>أدخل كود الدعوة المكوّن من 6 رموز.</p></div><form onSubmit={submit} className="game-form"><label className="code-input">كود الغرفة<input value={code} maxLength={6} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="A1B2C3" /></label><PlayerIdentity {...{ name, setName, avatar, setAvatar }} /><button disabled={busy || name.trim().length < 2 || code.length !== 6} className="primary-button full">{busy ? "جارٍ الدخول…" : "انضم إلى اللعبة"} <span>←</span></button></form></section>;
}

function PublicRooms({ rooms, onBack, onJoin, onRefresh }: { rooms: PublicRoom[]; onBack: () => void; onJoin: (code: string) => void; onRefresh: () => void }) {
  return <section className="form-layout"><button className="back-link" onClick={onBack}>→ العودة</button><div className="form-heading rows"><div><p className="eyebrow">مفتوحة للجميع</p><h1>الغرف العامة</h1><p>اختر غرفة متاحة وانضمّ إلى التحقيق.</p></div><button className="secondary-button" onClick={onRefresh}>↻ تحديث</button></div><div className="room-list">{rooms.length ? rooms.map((room) => <article key={room.code} className="public-room"><div className="room-code">{room.code}</div><div><b>غرفة {room.hostName}</b><p>{room.specialRoles ? "أدوار خاصة مفعّلة" : "الأدوار الأساسية"}</p></div><span>{room.playerCount}/{room.maxPlayers}</span><button className="primary-button compact" onClick={() => onJoin(room.code)}>انضم</button></article>) : <div className="empty-state">لا توجد غرف عامة متاحة الآن. أنشئ واحدة ودع الآخرين ينضمون.</div>}</div></section>;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint: string }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="switch" /><span><b>{label}</b><small>{hint}</small></span></label>;
}

function RoomScreen({ room, onError, onLeave }: { room: Room; soundOn: boolean; onError: (message: string) => void; onLeave: () => void }) {
  const [now, setNow] = useState(Date.now()); const [selected, setSelected] = useState<Member>(); const [chat, setChat] = useState(""); const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  const remaining = Math.max(0, Math.ceil(((room.phaseEndsAt ?? now) - now) / 1000));
  const host = room.hostId === room.me.id;
  const actionLabel = room.phase === "vote" ? "تأكيد التصويت" : room.me.role === "mafia" ? "تأكيد الهدف" : room.me.role === "doctor" ? "تأكيد الإنقاذ" : "تأكيد التحقيق";
  const act = async () => { if (!selected) return; const result = await emitAck("game:action", { targetId: selected.id }); if (!result.ok) onError(result.error ?? "تعذر تنفيذ الإجراء."); setSelected(undefined); };
  const ready = async () => { const result = await emitAck("room:ready", { ready: !room.me.ready }); if (!result.ok) onError(result.error ?? "تعذر التحديث."); };
  const start = async () => { const result = await emitAck("game:start"); if (!result.ok) onError(result.error ?? "لا يمكن البدء الآن."); };
  const leave = async () => { const result = await emitAck("room:leave"); if (!result.ok) return onError(result.error ?? "لا يمكن المغادرة."); onLeave(); };
  const sendChat = async (event: FormEvent) => { event.preventDefault(); const text = chat; setChat(""); const result = await emitAck("chat:send", { text }); if (!result.ok) onError(result.error ?? "تعذر إرسال الرسالة."); };
  const canAct = room.me.alive && ((room.phase === "vote") || (room.phase === "night" && ["mafia", "detective", "doctor"].includes(room.me.role ?? "")));
  const share = async () => { const link = `${location.origin}${location.pathname}#join=${room.code}`; try { await navigator.clipboard.writeText(link); onError("تم نسخ رابط الدعوة."); } catch { onError(`رابط الدعوة: ${link}`); } };
  return <section className={`game-room phase-${room.phase}`}>
    <div className="room-header"><div><button className="code-chip" onClick={share} title="نسخ رابط الدعوة">{room.code} <span>⧉</span></button><p>{host ? "أنت المضيف" : "غرفة مباشرة"}</p></div><PhaseTimer phase={room.phase} remaining={remaining} /><div className="room-header-actions"><button className="subtle-button" onClick={() => setSettingsOpen(!settingsOpen)}>⚙ الإعدادات</button><button className="subtle-button danger" onClick={leave}>مغادرة</button></div></div>
    {settingsOpen && <SettingsPanel room={room} isHost={host} close={() => setSettingsOpen(false)} onError={onError} />}
    <div className="game-grid"><aside className="role-panel"><RoleCard room={room} /><div className="phase-guide"><b>{phaseName[room.phase]}</b><p>{room.phase === "night" ? "نفّذ دورك بصمت. لا تظهر معلوماتك إلا لك." : room.phase === "discussion" ? "ناقش الأدلة قبل بدء التصويت." : room.phase === "vote" ? "اختر لاعبًا واحدًا؛ لا يمكن تغيير صوتك." : "استعد لبدء التحقيق."}</p></div><VoicePanel enabled={room.me.canUseVoice} players={room.players} selfId={room.me.id} onError={onError} /></aside>
      <main className="table-panel"><div className="phase-banner"><span className="phase-icon">{room.phase === "night" ? "☾" : room.phase === "vote" ? "✦" : room.phase === "discussion" ? "☀" : "◈"}</span><div><span>المرحلة الحالية</span><b>{phaseName[room.phase]}</b></div>{room.phase !== "waiting" && room.phase !== "finished" && <strong>{formatTime(remaining)}</strong>}</div>
        {room.phase === "finished" ? <Results room={room} onNew={() => location.reload()} /> : <><PlayerGrid room={room} selectable={canAct} onSelect={setSelected} /><div className="event-feed">{room.events.slice(0, 4).map((event) => <p className={event.kind} key={event.id}><span>✦</span>{event.text}</p>)}</div>{room.phase === "waiting" && <LobbyActions room={room} isHost={host} onReady={ready} onStart={start} onShare={share} />}</>}</main>
      <aside className="chat-panel"><div className="chat-title"><div><span>⌁</span><b>{room.phase === "night" && room.me.role === "mafia" && room.me.alive ? "همس المافيا" : !room.me.alive ? "دردشة المشاهدين" : "دردشة المدينة"}</b></div><small>{room.messages.length} رسالة</small></div><div className="messages">{room.messages.length ? room.messages.map((message) => <div className="message" key={message.id}><span className="message-avatar">{message.avatar}</span><p><b>{message.name}</b><span>{message.text}</span></p></div>) : <div className="empty-chat">لا رسائل بعد.<br />ابدأ النقاش.</div>}</div><form className="chat-form" onSubmit={sendChat}><input value={chat} maxLength={500} onChange={(event) => setChat(event.target.value)} placeholder="اكتب رسالتك…" disabled={room.phase === "night" && room.me.role !== "mafia"} /><button disabled={!chat.trim()} aria-label="إرسال">↑</button></form></aside>
    </div>
    {selected && <div className="modal-backdrop"><section className="confirm-modal"><span>{room.phase === "vote" ? "⚖" : "☾"}</span><h2>{actionLabel}</h2><p>هل أنت متأكد من اختيار <b>{selected.name}</b>؟ {room.phase === "vote" && "لا يمكن تغيير صوتك بعد التأكيد."}</p><div><button className="secondary-button" onClick={() => setSelected(undefined)}>إلغاء</button><button className="primary-button compact" onClick={act}>تأكيد</button></div></section></div>}
  </section>;
}

function PhaseTimer({ phase, remaining }: { phase: Phase; remaining: number }) { return <div className={`timer ${remaining < 11 ? "urgent" : ""}`}><span>{phase === "waiting" || phase === "finished" ? "●" : "◷"}</span><b>{phase === "waiting" ? "في الانتظار" : phase === "finished" ? "اكتملت" : formatTime(remaining)}</b></div>; }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }

function RoleCard({ room }: { room: Room }) {
  const role = room.me.role; const team = room.players.filter((player) => room.me.mafiaTeammates.includes(player.id));
  return <section className={`role-card ${role ?? "unknown"}`}><span className="role-eyebrow">دورك السري</span><div className="role-symbol">{role === "mafia" ? "♛" : role === "detective" ? "⌕" : role === "doctor" ? "✚" : role === "citizen" ? "♟" : "?"}</div><h2>{role ? roleName[role] : "سيُكشف قريبًا"}</h2><p>{role === "mafia" ? "تخلّص من سكان المدينة دون كشف هويتك." : role === "detective" ? "تحقّق من هوية لاعب واحد كل ليلة." : role === "doctor" ? "أنقذ لاعبًا واحدًا من هجوم الليل." : role === "citizen" ? "راقب، ناقش، وصوّت لحماية المدينة." : "انتظر المضيف ليبدأ المباراة."}</p>{team.length > 1 && <div className="teammates">زملاؤك: {team.filter((player) => player.id !== room.me.id).map((player) => player.name).join("، ")}</div>}</section>;
}

function PlayerGrid({ room, selectable, onSelect }: { room: Room; selectable: boolean; onSelect: (member: Member) => void }) {
  return <div className="player-grid">{room.players.map((player) => { const isMe = player.id === room.me.id; const restrictedMafia = room.me.role === "mafia" && room.phase === "night" && room.me.mafiaTeammates.includes(player.id); const disabled = !selectable || !player.alive || restrictedMafia; return <button key={player.id} disabled={disabled} className={`player-card ${isMe ? "me" : ""} ${!player.alive ? "dead" : ""} ${room.me.mafiaTeammates.includes(player.id) ? "teammate" : ""}`} onClick={() => onSelect(player)}><span className="player-avatar">{player.avatar}</span><span className="player-name">{player.name}{player.host && <i>مضيف</i>}</span><small>{!player.alive ? "خارج اللعبة" : !player.connected ? "يعيد الاتصال" : player.ready && room.phase === "waiting" ? "جاهز" : isMe ? "أنت" : "متصل"}</small>{!player.connected && <b className="connection-dot offline" />}{player.alive && player.connected && <b className="connection-dot" />}</button>; })}</div>;
}

function LobbyActions({ room, isHost, onReady, onStart, onShare }: { room: Room; isHost: boolean; onReady: () => void; onStart: () => void; onShare: () => void }) {
  const allReady = room.players.length >= room.minPlayers && room.players.every((player) => player.ready);
  return <section className="lobby-actions"><p>{room.players.length < room.minPlayers ? `بانتظار ${room.minPlayers - room.players.length} لاعبين على الأقل.` : allReady ? "الجميع جاهزون — يمكن بدء المباراة." : "ينبغي أن يؤكد كل لاعب جاهزيته."}</p><div><button className="secondary-button" onClick={onShare}>⧉ دعوة الأصدقاء</button><button className={room.me.ready ? "ready-button ready" : "ready-button"} onClick={onReady}>{room.me.ready ? "✓ أنت جاهز" : "أنا جاهز"}</button>{isHost && <button className="primary-button compact" disabled={!allReady} onClick={onStart}>ابدأ المباراة ←</button>}</div></section>;
}

function SettingsPanel({ room, isHost, close, onError }: { room: Room; isHost: boolean; close: () => void; onError: (message: string) => void }) {
  const [settings, setSettings] = useState(room.settings); const editable = isHost && room.phase === "waiting";
  const save = async () => { const result = await emitAck("room:update-settings", settings); if (!result.ok) return onError(result.error ?? "تعذر حفظ الإعدادات."); close(); };
  return <section className="settings-panel"><div><b>إعدادات الغرفة</b><button className="icon-button" onClick={close}>×</button></div>{editable ? <><label>الحد الأقصى: {settings.maxPlayers}<input type="range" min="4" max="16" value={settings.maxPlayers} onChange={(event) => setSettings({ ...settings, maxPlayers: Number(event.target.value) })} /></label><Toggle label="غرفة عامة" hint="مرئية في الغرف العامة" checked={settings.isPublic} onChange={(isPublic) => setSettings({ ...settings, isPublic })} /><Toggle label="أدوار خاصة" hint="محقق ودكتور" checked={settings.specialRoles} onChange={(specialRoles) => setSettings({ ...settings, specialRoles })} /><button className="primary-button compact" onClick={save}>حفظ</button></> : <p>يستطيع المضيف تعديل الإعدادات قبل بدء المباراة. الأدوار الخاصة: {room.settings.specialRoles ? "مفعلة" : "معطلة"}.</p>}</section>;
}

function Results({ room, onNew }: { room: Room; onNew: () => void }) { return <section className="results"><span>{room.winner === "mafia" ? "♛" : "☀"}</span><p>انتهت المباراة</p><h1>{room.winner === "mafia" ? "فازت المافيا" : "فازت المدينة"}</h1><div>{room.finalRoles?.map((player) => <p key={player.id}><b>{player.name}</b><span>{player.role ? roleName[player.role] : "—"}</span></p>)}</div><button className="primary-button" onClick={onNew}>لعبة جديدة</button></section>; }

function VoicePanel({ enabled, players, selfId, onError }: { enabled: boolean; players: Member[]; selfId: string; onError: (message: string) => void }) {
  const [joined, setJoined] = useState(false); const [muted, setMuted] = useState(false); const [streams, setStreams] = useState<Map<string, MediaStream>>(new Map());
  const streamRef = useRef<MediaStream | null>(null); const peers = useRef(new Map<string, RTCPeerConnection>()); const iceServers = useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  const closePeer = useCallback((id: string) => { peers.current.get(id)?.close(); peers.current.delete(id); setStreams((current) => { const next = new Map(current); next.delete(id); return next; }); }, []);
  const stop = useCallback(() => { socket.emit("voice:leave"); for (const id of peers.current.keys()) closePeer(id); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setJoined(false); setStreams(new Map()); }, [closePeer]);
  const createPeer = useCallback((id: string) => {
    const existing = peers.current.get(id); if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: iceServers.current }); peers.current.set(id, pc);
    streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
    pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit("voice:signal", { toPlayerId: id, signal: { candidate } }); };
    pc.ontrack = ({ streams: remote }) => { const remoteStream = remote[0]; if (remoteStream) setStreams((current) => new Map(current).set(id, remoteStream)); };
    pc.onconnectionstatechange = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) closePeer(id); };
    return pc;
  }, [closePeer]);
  useEffect(() => {
    const onPeers = async (list: { id: string }[]) => { for (const peer of list) { const pc = createPeer(peer.id); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socket.emit("voice:signal", { toPlayerId: peer.id, signal: { description: pc.localDescription } }); } };
    const onSignal = async ({ fromPlayerId, signal }: { fromPlayerId: string; signal: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => { const pc = createPeer(fromPlayerId); if (signal.description) { await pc.setRemoteDescription(signal.description); if (signal.description.type === "offer") { const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit("voice:signal", { toPlayerId: fromPlayerId, signal: { description: pc.localDescription } }); } } if (signal.candidate) await pc.addIceCandidate(signal.candidate); };
    const onLeft = ({ id }: { id: string }) => closePeer(id);
    socket.on("voice:peers", onPeers); socket.on("voice:signal", onSignal); socket.on("voice:peer-left", onLeft);
    return () => { socket.off("voice:peers", onPeers); socket.off("voice:signal", onSignal); socket.off("voice:peer-left", onLeft); };
  }, [closePeer, createPeer]);
  useEffect(() => { if (joined && !enabled) { stop(); onError("تم إيقاف الصوت لأن المرحلة تغيّرت."); } }, [enabled, joined, onError, stop]);
  useEffect(() => () => stop(), [stop]);
  const join = async () => { try { const iceResponse = await fetch(serverUrl ? `${serverUrl}/api/ice` : "/api/ice"); const iceConfig = await iceResponse.json() as { iceServers?: RTCIceServer[] }; if (iceConfig.iceServers?.length) iceServers.current = iceConfig.iceServers; const local = await navigator.mediaDevices.getUserMedia({ audio: true }); const result = await emitAck("voice:join"); if (!result.ok) { local.getTracks().forEach((track) => track.stop()); return onError(result.error ?? "تعذر دخول القناة الصوتية."); } streamRef.current = local; setJoined(true); } catch { onError("تعذر الوصول إلى الميكروفون. راجع إذن المتصفح واستخدم HTTPS في النشر."); } };
  const toggleMute = () => { const next = !muted; streamRef.current?.getAudioTracks().forEach((track) => track.enabled = !next); setMuted(next); };
  return <section className="voice-panel"><div><span className={joined ? "voice-live" : ""}>◉</span><b>الصوت المباشر</b></div><p>{enabled ? joined ? `${streams.size + 1} في القناة` : "متاح لهذه المرحلة" : "غير متاح في هذه المرحلة"}</p>{enabled && <div className="voice-actions">{joined ? <><button onClick={toggleMute}>{muted ? "🎙 تشغيل الميكروفون" : "🔇 كتم الميكروفون"}</button><button onClick={stop}>مغادرة القناة</button></> : <button onClick={join}>🎙 انضم للمحادثة</button>}</div>}{[...streams].map(([id, stream]) => <RemoteAudio key={id} stream={stream} name={players.find((player) => player.id === id)?.name ?? "لاعب"} />)}<small>يحتاج الصوت إلى إذن الميكروفون.</small></section>;
}

function RemoteAudio({ stream, name }: { stream: MediaStream; name: string }) { const ref = useRef<HTMLAudioElement>(null); useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]); return <audio ref={ref} autoPlay aria-label={`صوت ${name}`} />; }
