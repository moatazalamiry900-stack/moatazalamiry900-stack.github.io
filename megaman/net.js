// =====================================================================
//  AXON BREACH — co-op networking: rooms of up to 4 players, ONLINE (anywhere, over the internet) or LOCAL
//  (one hotspot / Wi-Fi). Both use the same room code, lobby and game protocol; the only difference is how the
//  devices reach each other: LOCAL talks directly on the network, ONLINE may also go through a free relay (TURN)
//  when two phones cannot reach each other directly — which is the usual case on mobile data.
//  No server of our own: the free PeerJS cloud introduces the players, its free relays carry the traffic when
//  needed, and a free Metered account (20 GB a month) can be added in the lobby as a stronger relay.
//  WebRTC data channels (PeerJS). The host's phone is the hub of a star: every guest talks to the host,
//  the host relays. Signalling (finding each other with a 4-letter room code) needs internet for a moment;
//  the game traffic itself then flows device to device over the local network.
//  Also: the lobby screen, and the co-op session kept across page reloads (sessionStorage 'axon.mp').
//  Loaded before coop.js and game.js. PeerJS itself is fetched only when co-op is used.
// =====================================================================
'use strict';

window.AxonNet = (function () {
    const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
    const PFX = 'axonbreach-v1-', MAX = 4, SKEY = 'axon.mp';
    const COLORS = [0x39d7ff, 0xffa826, 0x5cf0a0, 0xff5fa2];
    const hex = n => '#' + n.toString(16).padStart(6, '0');
    const I = () => window.AxonI18n;
    const L = {
        ar: { mOnline: 'أونلاين', mLocal: 'محلي', subOn: 'عبر الإنترنت · حتى 4 لاعبين', hintOn: 'كل لاعب من أي مكان وعلى أي شبكة (واي فاي أو بيانات الجوال). المضيف ينشئ غرفة ويرسل الرمز لأصحابه. الخدمة مجانية.', direct: 'اتصال مباشر', relay: 'عبر خادم وسيط', natFail: 'تعذّر الوصول إلى المضيف عبر الإنترنت — جرّبوا شبكة أخرى أو أضف خادم وسيط', adv: 'خادم وسيط خاص (اختياري)', advApp: 'اسم التطبيق في Metered', advKey: 'مفتاح API', advNote: 'حساب مجاني في metered.ca يعطي 20 غيغا شهرياً — يفيد إذا لم يتصل اللاعبون.', title: 'لعب جماعي', sub: 'هوتسبوت · حتى 4 لاعبين', name: 'اسمك', host: 'استضافة غرفة', join: 'انضمام لغرفة', code: 'رمز الغرفة', connect: 'اتصال', start: 'ابدأ المهمة الجماعية', cancel: 'إلغاء', leave: 'مغادرة الغرفة', close: 'إغلاق',
            hint: 'اتصلوا كلكم بنفس الهوتسبوت أو شبكة الواي فاي. يلزم إنترنت لحظة الاتصال فقط، واللعب نفسه يمر عبر الشبكة المحلية.',
            share: 'شارك هذا الرمز مع أصحابك', waitHost: 'متصل · بانتظار المضيف ليبدأ', loading: 'تحميل مكتبة الاتصال…', creating: 'إنشاء الغرفة…', joining: 'الاتصال بالغرفة…',
            online: 'الغرفة جاهزة', noNet: 'تعذّر الاتصال — تأكد من الإنترنت على جهاز الهوتسبوت', noRoom: 'لا توجد غرفة بهذا الرمز', full: 'الغرفة ممتلئة (4 لاعبين)', badCode: 'اكتب رمزاً من 4 أحرف',
            you: 'أنت', hostTag: 'المضيف', joined: n => `${n} انضم للفريق`, left: n => `${n} غادر`, hostLeft: 'المضيف غادر — العودة للقائمة', lost: 'انقطع الاتصال بالمضيف… جارٍ إعادة الاتصال', back: 'عاد الاتصال',
            sync: 'مزامنة الفريق…', ingame: 'الفريق في اللعب — سيتم إدخالك', solo: 'لا يوجد لاعبون آخرون بعد' },
        en: { mOnline: 'Online', mLocal: 'Local', subOn: 'Over the internet · up to 4 players', hintOn: 'Everyone plays from anywhere, on any network (Wi-Fi or mobile data). The host creates a room and sends the code. The service is free.', direct: 'direct link', relay: 'through a relay', natFail: 'Could not reach the host over the internet — try another network or add a relay', adv: 'Your own relay (optional)', advApp: 'Metered app name', advKey: 'API key', advNote: 'A free metered.ca account gives 20 GB a month — useful if players cannot connect.', title: 'Co-op', sub: 'Hotspot · up to 4 players', name: 'Your name', host: 'Host a room', join: 'Join a room', code: 'Room code', connect: 'Connect', start: 'Start co-op mission', cancel: 'Cancel', leave: 'Leave room', close: 'Close',
            hint: 'Everyone joins the same hotspot or Wi-Fi. Internet is needed only for a moment to connect; the game itself runs over the local network.',
            share: 'Share this code with your friends', waitHost: 'Connected · waiting for the host to start', loading: 'Loading the network library…', creating: 'Creating the room…', joining: 'Connecting to the room…',
            online: 'Room ready', noNet: 'Could not connect — check the internet on the hotspot phone', noRoom: 'No room with this code', full: 'The room is full (4 players)', badCode: 'Type a 4-letter code',
            you: 'you', hostTag: 'host', joined: n => `${n} joined the team`, left: n => `${n} left`, hostLeft: 'The host left — back to the menu', lost: 'Lost the host… reconnecting', back: 'Reconnected',
            sync: 'Syncing the team…', ingame: 'The team is playing — taking you in', solo: 'No other players yet' },
        es: { mOnline: 'En línea', mLocal: 'Local', subOn: 'Por internet · hasta 4 jugadores', hintOn: 'Cada uno juega desde cualquier lugar y red (Wi-Fi o datos). El anfitrión crea la sala y envía el código. El servicio es gratis.', direct: 'enlace directo', relay: 'por un relé', natFail: 'No se pudo llegar al anfitrión por internet — prueba otra red o añade un relé', adv: 'Tu propio relé (opcional)', advApp: 'Nombre de la app en Metered', advKey: 'Clave API', advNote: 'Una cuenta gratis en metered.ca da 20 GB al mes — útil si no conectan.', title: 'Cooperativo', sub: 'Punto de acceso · hasta 4 jugadores', name: 'Tu nombre', host: 'Crear sala', join: 'Unirse a una sala', code: 'Código de sala', connect: 'Conectar', start: 'Empezar misión cooperativa', cancel: 'Cancelar', leave: 'Salir de la sala', close: 'Cerrar',
            hint: 'Todos en el mismo punto de acceso o Wi-Fi. Solo hace falta internet un momento para conectar; el juego va por la red local.',
            share: 'Comparte este código con tus amigos', waitHost: 'Conectado · esperando al anfitrión', loading: 'Cargando la red…', creating: 'Creando la sala…', joining: 'Conectando a la sala…',
            online: 'Sala lista', noNet: 'No se pudo conectar — revisa internet en el móvil del punto de acceso', noRoom: 'No hay sala con ese código', full: 'La sala está llena (4)', badCode: 'Escribe un código de 4 letras',
            you: 'tú', hostTag: 'anfitrión', joined: n => `${n} se unió`, left: n => `${n} salió`, hostLeft: 'El anfitrión salió — volviendo al menú', lost: 'Conexión perdida… reconectando', back: 'Reconectado',
            sync: 'Sincronizando el equipo…', ingame: 'El equipo está jugando — entrando', solo: 'Aún no hay más jugadores' },
        zh: { mOnline: '在线', mLocal: '本地', subOn: '通过互联网 · 最多 4 人', hintOn: '每个人可在任何地方、任何网络（Wi-Fi 或移动数据）游玩。房主创建房间并发送房间码。服务免费。', direct: '直连', relay: '经中继', natFail: '无法通过互联网连接房主 — 请换个网络或添加中继', adv: '自己的中继（可选）', advApp: 'Metered 应用名', advKey: 'API 密钥', advNote: 'metered.ca 免费账户每月 20 GB — 连不上时有用。', title: '联机合作', sub: '热点 · 最多 4 人', name: '你的名字', host: '创建房间', join: '加入房间', code: '房间码', connect: '连接', start: '开始合作任务', cancel: '取消', leave: '离开房间', close: '关闭',
            hint: '所有人连接同一个热点或 Wi-Fi。只在连接时需要一下网络，游戏本身走局域网。',
            share: '把这个房间码发给朋友', waitHost: '已连接 · 等待房主开始', loading: '加载联机组件…', creating: '创建房间…', joining: '连接房间…',
            online: '房间已就绪', noNet: '无法连接 — 请检查开热点手机的网络', noRoom: '没有这个房间码', full: '房间已满（4 人）', badCode: '请输入 4 位房间码',
            you: '你', hostTag: '房主', joined: n => `${n} 加入了队伍`, left: n => `${n} 离开了`, hostLeft: '房主已离开 — 返回菜单', lost: '与房主断开… 正在重连', back: '已重新连接',
            sync: '正在同步队伍…', ingame: '队伍正在游戏中 — 正在带你进入', solo: '还没有其他玩家' },
        ja: { mOnline: 'オンライン', mLocal: 'ローカル', subOn: 'インターネット経由 · 最大4人', hintOn: 'どこからでも、どの回線（Wi-Fi・モバイル通信）でも遊べます。ホストがルームを作りコードを送ります。無料です。', direct: '直接接続', relay: 'リレー経由', natFail: 'インターネット経由でホストに届きません — 別の回線を試すかリレーを追加してください', adv: '自分のリレー（任意）', advApp: 'Metered アプリ名', advKey: 'API キー', advNote: 'metered.ca の無料アカウントで月 20 GB — 接続できない時に有効。', title: '協力プレイ', sub: 'テザリング · 最大4人', name: '名前', host: 'ルームを作る', join: 'ルームに参加', code: 'ルームコード', connect: '接続', start: '協力ミッション開始', cancel: 'キャンセル', leave: 'ルームを出る', close: '閉じる',
            hint: '全員が同じテザリングかWi-Fiに接続。接続の瞬間だけネットが必要で、ゲーム自体はローカルネットワークで動きます。',
            share: 'このコードを友達に伝えてください', waitHost: '接続済み · ホストの開始待ち', loading: '通信ライブラリを読み込み中…', creating: 'ルームを作成中…', joining: 'ルームに接続中…',
            online: 'ルーム準備完了', noNet: '接続できません — テザリング元のネットを確認', noRoom: 'このコードのルームはありません', full: 'ルームは満員です（4人）', badCode: '4文字のコードを入力',
            you: 'あなた', hostTag: 'ホスト', joined: n => `${n} が参加`, left: n => `${n} が退出`, hostLeft: 'ホストが退出 — メニューへ', lost: 'ホストとの接続が切れました… 再接続中', back: '再接続しました',
            sync: 'チームを同期中…', ingame: 'チームはプレイ中 — 合流します', solo: 'まだ他のプレイヤーはいません' }
    };
    const S = (k, ...a) => { const d = L[(I() && I().lang) || 'en'] || L.en, v = d[k] !== undefined ? d[k] : L.en[k]; return typeof v === 'function' ? v(...a) : v; };

    // ---------- session: survives the page reloads the game uses for restarts ----------
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
    const saveSession = () => { try { if (session) sessionStorage.setItem(SKEY, JSON.stringify(session)); else sessionStorage.removeItem(SKEY); } catch (e) { } };
    const myName = () => { try { return localStorage.getItem('axon.mpName') || ''; } catch (e) { return ''; } };
    const setName = n => { try { localStorage.setItem('axon.mpName', n); } catch (e) { } };
    const lookNow = () => {
        const H = window.AxonHero, p = window.__axonPlayer;
        if (p) return { body: p.bodyType || 'a', skin: p.skin || 'EMBER', look: p.look || {} };
        let body = 'a', skin = 'EMBER'; try { body = localStorage.getItem('axon.hero') || 'a'; skin = localStorage.getItem('axon.skin') || 'EMBER'; } catch (e) { }
        return { body, skin, look: H && H.loadLook ? H.loadLook() : {} };
    };

    // ---------- PeerJS ----------
    let lib = null;
    function loadLib() {
        if (window.Peer) return Promise.resolve();
        if (lib) return lib;
        lib = new Promise((res, rej) => {
            const s = document.createElement('script'); s.src = PEERJS; s.async = true;
            s.onload = () => window.Peer ? res() : rej(new Error('peerjs'));
            s.onerror = () => { lib = null; rej(new Error('peerjs')); };
            document.head.appendChild(s);
        });
        return lib;
    }
    // ---------- how the devices reach each other ----------
    // LOCAL: STUN only (a direct link on the same network). ONLINE: the same, plus relays for the phones that cannot
    // be reached directly — the free PeerJS relays, and the player's own Metered relays if a key was entered.
    const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
    const FREE_TURN = [{ urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }];
    const ls = (k, d = '') => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
    let mode = ls('axon.mpMode', 'online') === 'local' ? 'local' : 'online', extraIce = null;
    function peerOpts() { return { debug: 0, config: { iceServers: mode === 'local' ? STUN : STUN.concat(FREE_TURN, extraIce || []) } }; }
    // the player's own relay list (asked once per session; a failure just means the free relays are used)
    function loadIce() {
        const app = ls('axon.turnApp').trim().replace(/[^a-z0-9-]/gi, ''), key = ls('axon.turnKey').trim();
        if (mode === 'local' || !app || !key || extraIce) return Promise.resolve();
        return Promise.race([fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`).then(r => r.ok ? r.json() : []), new Promise(r => setTimeout(() => r([]), 4000))])
            .then(list => { if (Array.isArray(list) && list.length) extraIce = list.filter(x => x && x.urls).slice(0, 6); }).catch(() => { });
    }
    // direct or relayed, and the ping: read from the live connection every few seconds
    const links = new Map();            // slot (host side) or 0 (guest side) → { relay, ms }
    function probe(conn, slot) {
        const pc = conn && conn.peerConnection; if (!pc || !pc.getStats) return;
        pc.getStats().then(st => { let pair = null; const byId = {}; st.forEach(r => { byId[r.id] = r; if (r.type === 'transport' && r.selectedCandidatePairId) pair = r.selectedCandidatePairId; });
            let p = pair ? byId[pair] : null; if (!p) st.forEach(r => { if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected)) p = r; });
            if (!p) return; const lc = byId[p.localCandidateId], rc = byId[p.remoteCandidateId];
            links.set(slot, { relay: !!((lc && lc.candidateType === 'relay') || (rc && rc.candidateType === 'relay')), ms: p.currentRoundTripTime != null ? Math.round(p.currentRoundTripTime * 1000) : -1 });
            if (panel && panel.classList.contains('show')) renderLobby();
        }).catch(() => { });
    }
    setInterval(() => { if (role === 'host') conns.forEach((c, slot) => { if (c.conn.open) probe(c.conn, slot); }); else if (hostConn && hostConn.open) probe(hostConn, 0); }, 3000);
    const linkText = slot => { const l = links.get(slot); return l ? ` · ${S(l.relay ? 'relay' : 'direct')}${l.ms >= 0 ? ' · ' + l.ms + ' ms' : ''}` : ''; };


    let peer = null, role = null, code = null, mySlot = 0, phase = 'idle';
    const conns = new Map();            // host: slot → { conn, name, look, rx }
    let hostConn = null, hostRx = 0, lostT = 0;
    let roster = [];                    // [{ slot, name, look }]
    const handlers = [];
    let retryTimer = 0, closing = false, natT = 0;

    const emit = (m, from) => handlers.forEach(h => { try { h(m, from); } catch (e) { console.warn('net', e); } });
    function rosterUpdate() {
        if (role !== 'host') return;
        roster = [{ slot: 0, name: myName() || 'P1', look: lookNow() }];
        conns.forEach((c, slot) => roster.push({ slot, name: c.name, look: c.look }));
        roster.sort((a, b) => a.slot - b.slot);
        broadcast({ t: 'roster', list: roster });
        emit({ t: 'roster', list: roster }, 0); renderLobby();
    }
    // host → every guest (except one)
    function broadcast(m, except) { conns.forEach((c, slot) => { if (slot !== except && c.conn.open) { try { c.conn.send(m); } catch (e) { } } }); }
    function sendTo(slot, m) { const c = conns.get(slot); if (c && c.conn.open) try { c.conn.send(m); } catch (e) { } }
    // guest → host, or host → everyone
    function send(m) {
        if (role === 'host') broadcast(m);
        else if (hostConn && hostConn.open) { try { hostConn.send(m); } catch (e) { } }
    }

    // ---------- host ----------
    const CODE_CH = 'abcdefghjkmnpqrstuvwxyz23456789';
    const newCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
    function hostRoom(reconnect) {
        role = 'host'; mySlot = 0; status(S('creating'));
        loadLib().then(loadIce).then(() => {
            let tries = 0;
            const open = () => {
                if (!reconnect && !code) code = newCode();
                peer = new window.Peer(PFX + code, peerOpts());
                peer.on('open', () => { phase = session ? 'game' : 'lobby'; status(S('online')); rosterUpdate(); });
                peer.on('connection', conn => acceptGuest(conn));
                peer.on('disconnected', () => { if (!closing) setTimeout(() => { try { peer && !peer.destroyed && peer.reconnect(); } catch (e) { } }, 1500); });
                peer.on('error', err => {
                    const t = err && err.type;
                    if (t === 'unavailable-id') {                         // the old room id is still held for a few seconds after a reload
                        try { peer.destroy(); } catch (e) { }
                        if (reconnect && ++tries < 25) { setTimeout(open, 1500); return; }
                        if (!reconnect) { code = newCode(); setTimeout(open, 100); return; }
                    }
                    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'browser-incompatible') status(S('noNet'), true);
                });
            };
            open();
        }).catch(() => status(S('noNet'), true));
    }
    function acceptGuest(conn) {
        let slot = -1;
        conn.on('data', m => {
            if (!m || typeof m !== 'object') return;
            if (slot < 0) {
                if (m.t !== 'hello') return;
                const used = new Set([0, ...conns.keys()]);
                if (m.slot > 0 && m.slot < MAX && !used.has(m.slot)) slot = m.slot;
                else for (let s = 1; s < MAX; s++) if (!used.has(s)) { slot = s; break; }
                if (slot < 0) { try { conn.send({ t: 'full' }); } catch (e) { } setTimeout(() => conn.close(), 300); return; }
                conns.set(slot, { conn, name: String(m.name || 'P' + (slot + 1)).slice(0, 14), look: m.look || {}, rx: performance.now() });
                const w = window.AxonCoop && window.AxonCoop.where ? window.AxonCoop.where() : 'x';
                let ck = null; try { ck = localStorage.getItem('axon.ckpt'); } catch (e) { }
                conn.send({ t: 'welcome', slot, phase: session ? 'game' : 'lobby', seed: session ? session.seed : null, where: w, ck });
                rosterUpdate(); toastAll('joined', conns.get(slot).name);
                emit({ t: 'join', slot }, slot);
                return;
            }
            const c = conns.get(slot); if (c) c.rx = performance.now();
            if (m.t === 'bye') { dropGuest(slot); return; }
            if (m.t === 'look') { c.look = m.look; rosterUpdate(); }
            if (m.t === 'goto') { teamGoto(m.to); return; }
            emit(m, slot);
        });
        conn.on('close', () => { if (slot > 0) dropGuest(slot); });
        conn.on('error', () => { if (slot > 0) dropGuest(slot); });
    }
    function dropGuest(slot) {
        const c = conns.get(slot); if (!c) return;
        conns.delete(slot); try { c.conn.close(); } catch (e) { }
        toastAll('left', c.name); rosterUpdate(); emit({ t: 'leave', slot }, slot);
    }

    // ---------- guest ----------
    function joinRoom(c, reconnect) {
        role = 'client'; code = c; status(S('joining'));
        loadLib().then(loadIce).then(() => {
            const connect = () => {
                if (!peer || peer.destroyed) {
                    peer = new window.Peer(peerOpts());
                    peer.on('open', () => dial());
                    peer.on('disconnected', () => { if (!closing) setTimeout(() => { try { peer && !peer.destroyed && peer.reconnect(); } catch (e) { } }, 1500); });
                    peer.on('error', err => {
                        const t = err && err.type;
                        if (t === 'peer-unavailable') { if (reconnect || session) { retryTimer = setTimeout(dial, 2000); return; } status(S('noRoom'), true); return; }
                        if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'browser-incompatible') { status(S('noNet'), true); if (session) retryTimer = setTimeout(connect, 3000); }
                    });
                } else dial();
            };
            const dial = () => {
                if (closing || !peer || peer.destroyed) return;
                if (hostConn) { try { hostConn.close(); } catch (e) { } }
                const conn = hostConn = peer.connect(PFX + code, { reliable: true, serialization: 'json' });
                clearTimeout(natT); natT = setTimeout(() => { if (conn === hostConn && !conn.open && !closing && !session) status(S(mode === 'online' ? 'natFail' : 'noNet'), true); }, 14000);
                conn.on('open', () => {
                    clearTimeout(natT); hostRx = performance.now(); lostT = 0;
                    conn.send({ t: 'hello', name: myName() || 'P', look: lookNow(), slot: session ? session.slot : 0, seed: session ? session.seed : null });
                });
                conn.on('data', m => onHostMsg(m));
                conn.on('close', () => { if (!closing && conn === hostConn) hostLost(); });
            };
            connect();
        }).catch(() => status(S('noNet'), true));
    }
    function onHostMsg(m) {
        if (!m || typeof m !== 'object') return;
        hostRx = performance.now();
        if (lostT) { lostT = 0; toast(S('back')); }
        if (m.t === 'full') { status(S('full'), true); leave(true); return; }
        if (m.t === 'welcome') {
            mySlot = m.slot;
            if (m.phase === 'lobby') { phase = 'lobby'; renderLobby(); status(S('waitHost')); return; }
            // the team is already playing: load the same world, where they are (unless this page already is that world)
            if (!session || session.seed !== m.seed) {
                status(S('ingame'));
                session = { role: 'client', code, slot: mySlot, seed: m.seed }; saveSession();
                reloadTo(m.where === 'm' ? 'autostart' : 'hub', m.ck);
                return;
            }
            session.slot = mySlot; saveSession(); phase = 'game'; emit({ t: 'connected' });
            return;
        }
        if (m.t === 'roster') { roster = m.list || []; renderLobby(); emit(m, 0); return; }
        if (m.t === 'start' || m.t === 'goto') {
            session = { role: 'client', code, slot: mySlot, seed: m.seed }; saveSession();
            if (m.t === 'start') status(S('sync'));
            reloadTo(m.t === 'start' ? 'hub' : m.to, m.ck);
            return;
        }
        if (m.t === 'bye') { hostGone(); return; }
        if (m.t === 'toast') { toast(S(m.k, m.n)); return; }
        emit(m, m.id !== undefined ? m.id : 0);
    }
    function hostLost() {
        if (closing || lostT) return;
        lostT = performance.now(); toast(S('lost'));
        retryTimer = setTimeout(function again() {
            if (closing) return;
            if (performance.now() - lostT > 35000) { hostGone(); return; }
            try { if (peer && !peer.destroyed) { if (peer.disconnected) peer.reconnect(); joinRoomRedial(); } } catch (e) { }
            retryTimer = setTimeout(again, 2500);
        }, 1500);
    }
    function joinRoomRedial() {
        if (hostConn && hostConn.open) return;
        const conn = hostConn = peer.connect(PFX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => { hostRx = performance.now(); conn.send({ t: 'hello', name: myName() || 'P', look: lookNow(), slot: session ? session.slot : mySlot, seed: session ? session.seed : null }); });
        conn.on('data', m => onHostMsg(m));
        conn.on('close', () => { if (!closing && conn === hostConn) { lostT = 0; hostLost(); } });
    }
    function hostGone() { toast(S('hostLeft')); setTimeout(() => leave(true), 2200); }

    // ---------- team actions ----------
    function reloadTo(to, ck) {
        closing = true;
        try {
            sessionStorage.setItem('axon.skipSplash', '1');
            if (to) sessionStorage.setItem('axon.' + to, '1');
            if (ck !== undefined && ck !== null) localStorage.setItem('axon.ckpt', ck);
        } catch (e) { }
        setTimeout(() => location.reload(), role === 'host' ? 450 : 120);
    }
    const newSeed = () => (Math.random() * 4294967296) >>> 0;
    // everyone reloads into the same place: 'hub' (HQ), 'autostart' (the mission again) — with a fresh shared world seed
    function teamGoto(to) {
        if (!session) return false;
        if (role !== 'host') { send({ t: 'goto', to }); status(S('sync')); return true; }
        let ck = null; try { ck = localStorage.getItem('axon.ckpt'); } catch (e) { }
        session.seed = newSeed(); saveSession();
        broadcast({ t: 'goto', to: to || 'hub', seed: session.seed, ck });
        reloadTo(to || 'hub', ck);
        return true;
    }
    function startTeam() {
        if (role !== 'host') return;
        session = { role: 'host', code, slot: 0, seed: newSeed() }; saveSession();
        broadcast({ t: 'start', seed: session.seed });
        status(S('sync')); reloadTo('hub');
    }
    function leave(silent) {
        closing = true; clearTimeout(retryTimer);
        try { if (role === 'host') broadcast({ t: 'bye' }); else send({ t: 'bye' }); } catch (e) { }
        const wasGame = !!session;
        session = null; saveSession();
        setTimeout(() => { try { conns.forEach(c => c.conn.close()); if (peer) peer.destroy(); } catch (e) { } peer = null; conns.clear(); role = null; code = null; closing = false; }, 200);
        if (wasGame) { try { sessionStorage.setItem('axon.skipSplash', '1'); } catch (e) { } setTimeout(() => location.reload(), 300); }
        else if (!silent) { roster = []; renderLobby(); }
    }
    // a message for everyone, each in their own language (key + name)
    function toastAll(k, n) { toast(S(k, n)); broadcast({ t: 'toast', k, n }); }
    function toast(s) { if (panel && panel.classList.contains('show')) status(s); else if (window.AxonCoop && window.AxonCoop.toast) window.AxonCoop.toast(s); }

    // heartbeat: a guest that stays silent is dropped; a host that stays silent is chased
    setInterval(() => {
        const now = performance.now();
        if (role === 'host') conns.forEach((c, slot) => { if (now - c.rx > 9000) dropGuest(slot); });
        else if (role === 'client' && phase !== 'idle' && hostConn && hostRx && now - hostRx > 9000 && !lostT) hostLost();
        if (role === 'host' && conns.size) broadcast({ t: 'hb' }); else if (role === 'client' && hostConn && hostConn.open) send({ t: 'hb' });
    }, 2500);

    // ---------- lobby screen ----------
    let panel = null, stMsg = '', stErr = false;
    function status(s, err) { stMsg = s; stErr = !!err; const el = panel && panel.querySelector('.mp-status'); if (el) { el.textContent = s; el.classList.toggle('err', !!err); } }
    const CSS = `
      #mp-lobby{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:rgba(3,8,16,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:var(--font);opacity:0;pointer-events:none;transition:opacity .25s}
      #mp-lobby.show{opacity:1;pointer-events:auto;visibility:visible}
      .mp-card{position:relative;width:min(460px,92%);max-height:92%;overflow:auto;box-sizing:border-box;padding:18px;display:grid;gap:12px;color:var(--ink);
        background:linear-gradient(160deg,rgba(20,40,64,.94),rgba(8,16,30,.97));border:1px solid rgba(57,215,255,.3);
        clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
      .mp-card h2{margin:0;font-size:20px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
      .mp-card h2 small{font-size:10px;letter-spacing:.3em;color:var(--cyan)}
      .mp-x{position:absolute;top:12px;inset-inline-end:12px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:var(--ink);font-size:18px;cursor:pointer}
      .mp-row{display:grid;gap:6px}
      .mp-row label{font-size:11px;letter-spacing:.2em;color:var(--dim)}
      .mp-in{padding:10px 12px;font:600 15px var(--font);color:var(--ink);background:rgba(255,255,255,.05);border:1px solid var(--line);outline:none;min-width:0}
      .mp-in:focus{border-color:var(--amber)}
      .mp-code{font:700 22px var(--font);letter-spacing:.5em;text-transform:uppercase;text-align:center}
      .mp-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .mp-b{padding:11px 12px;font:700 13px var(--font);letter-spacing:.06em;color:var(--ink);background:rgba(57,215,255,.1);border:1px solid var(--line);cursor:pointer}
      .mp-b.pri{background:var(--amber);border-color:var(--amber);color:#1a0d00}
      .mp-b:disabled{opacity:.45;cursor:default}
      .mp-big{display:grid;place-items:center;gap:2px;padding:10px;background:rgba(255,168,38,.08);border:1px dashed rgba(255,168,38,.5)}
      .mp-big b{font-size:38px;letter-spacing:.35em;color:var(--amber);text-transform:uppercase;padding-inline-start:.35em}
      .mp-big span{font-size:11px;color:var(--dim)}
      .mp-list{display:grid;gap:6px}
      .mp-p{display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
      .mp-p i{width:12px;height:12px;transform:rotate(45deg);flex:none}
      .mp-p b{font-size:14px}.mp-p small{margin-inline-start:auto;font-size:10px;letter-spacing:.15em;color:var(--dim)}
      .mp-p.empty{opacity:.35}
      .mp-status{font-size:12px;color:var(--cyan);min-height:16px}.mp-status.err{color:#ff7a8e}
      .mp-hint{font-size:11px;line-height:1.6;color:var(--dim);margin:0}
      .mp-seg{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--line)} .mp-seg .mp-b{border:0;background:transparent;color:var(--dim)} .mp-seg .mp-b.on{background:var(--cyan);color:#04121e}
      .mp-adv{border:1px dashed var(--line);padding:6px 10px} .mp-adv summary{cursor:pointer;font-size:11px;letter-spacing:.06em;color:var(--dim)} .mp-adv[open] summary{margin-bottom:8px;color:var(--cyan)} .mp-adv .mp-row{margin-bottom:6px}
      html.rtl-text .mp-card{direction:rtl} .mp-code,.mp-big b{direction:ltr}
      #stage.short .mp-card{padding:12px 14px;gap:8px} #stage.short .mp-big b{font-size:28px}`;
    function ensurePanel() {
        if (panel) return;
        const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        panel = document.createElement('div'); panel.id = 'mp-lobby';
        (document.getElementById('stage') || document.body).appendChild(panel);
        panel.addEventListener('click', e => {
            const b = e.target.closest('[data-mp]'); if (!b) { if (e.target === panel) closeLobby(); return; }
            const A = window.__axonAudio; if (A) { try { A.init(); A.playLock(); } catch (err) { } }
            const nameIn = panel.querySelector('#mp-name'); if (nameIn) setName(nameIn.value.trim().slice(0, 14));
            const ta = panel.querySelector('#mp-tapp'), tk = panel.querySelector('#mp-tkey'); if (ta && tk && (ta.value.trim() !== ls('axon.turnApp') || tk.value.trim() !== ls('axon.turnKey'))) { lsSet('axon.turnApp', ta.value.trim()); lsSet('axon.turnKey', tk.value.trim()); extraIce = null; }
            const act = b.dataset.mp;
            if (act === 'm-online' || act === 'm-local') { if (!role) { mode = act === 'm-local' ? 'local' : 'online'; lsSet('axon.mpMode', mode); extraIce = null; } renderLobby(); }
            else if (act === 'close') closeLobby();
            else if (act === 'host') { view = 'host'; renderLobby(); hostRoom(false); }
            else if (act === 'join') { view = 'join'; renderLobby(); }
            else if (act === 'connect') {
                const c = (panel.querySelector('#mp-code').value || '').trim().toLowerCase();
                if (!/^[a-z0-9]{4}$/.test(c)) { status(S('badCode'), true); return; }
                joinRoom(c, false);
            } else if (act === 'start') startTeam();
            else if (act === 'cancel') { leave(true); view = 'home'; stMsg = ''; renderLobby(); }
        });
    }
    let view = 'home';
    function renderLobby() {
        if (!panel) return;
        const nm = (myName() || '').replace(/[<>&"]/g, '');
        const slots = [0, 1, 2, 3].map(s => {
            const p = roster.find(r => r.slot === s);
            if (!p) return `<div class="mp-p empty"><i style="background:${hex(COLORS[s])}"></i><b>—</b></div>`;
            const tag = s === 0 ? S('hostTag') : '', me = s === mySlot ? ` · ${S('you')}` : '';
            const lk = role === 'host' ? (s ? linkText(s) : '') : (s === mySlot ? linkText(0) : '');
            return `<div class="mp-p"><i style="background:${hex(COLORS[s])}"></i><b>${String(p.name).replace(/[<>&"]/g, '')}</b><small>${tag}${me}${lk}</small></div>`;
        }).join('');
        let body;
        if (view === 'host' && role === 'host') {
            body = `<div class="mp-big"><span>${S('code')}</span><b>${code || '····'}</b><span>${S('share')}</span></div>
              <div class="mp-list">${slots}</div>
              <div class="mp-btns"><button class="mp-b" type="button" data-mp="cancel">${S('cancel')}</button><button class="mp-b pri" type="button" data-mp="start" ${phase === 'lobby' ? '' : 'disabled'}>${S('start')}</button></div>`;
        } else if (view === 'join') {
            body = `<div class="mp-row"><label>${S('code')}</label><input id="mp-code" class="mp-in mp-code" maxlength="4" autocomplete="off" autocapitalize="off" spellcheck="false" value="${role === 'client' && code ? code : ''}"></div>
              ${role === 'client' && roster.length ? `<div class="mp-list">${slots}</div>` : ''}
              ${role === 'client' && phase === 'lobby' ? `<div class="mp-big"><span>${S('waitHost')}</span></div>` : ''}
              <div class="mp-btns"><button class="mp-b" type="button" data-mp="cancel">${S('cancel')}</button>${role === 'client' && phase === 'lobby' ? '' : `<button class="mp-b pri" type="button" data-mp="connect">${S('connect')}</button>`}</div>`;
        } else {
            const esc = v => String(v).replace(/[<>&"]/g, '');
            body = `<div class="mp-seg"><button class="mp-b${mode === 'online' ? ' on' : ''}" type="button" data-mp="m-online">${S('mOnline')}</button><button class="mp-b${mode === 'local' ? ' on' : ''}" type="button" data-mp="m-local">${S('mLocal')}</button></div>
              <div class="mp-row"><label>${S('name')}</label><input id="mp-name" class="mp-in" maxlength="14" value="${nm}" placeholder="P1"></div>
              <div class="mp-btns"><button class="mp-b pri" type="button" data-mp="host">${S('host')}</button><button class="mp-b" type="button" data-mp="join">${S('join')}</button></div>
              ${mode === 'online' ? `<details class="mp-adv"${ls('axon.turnKey') ? ' open' : ''}><summary>${S('adv')}</summary>
                <div class="mp-row"><label>${S('advApp')}</label><input id="mp-tapp" class="mp-in" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" value="${esc(ls('axon.turnApp'))}"></div>
                <div class="mp-row"><label>${S('advKey')}</label><input id="mp-tkey" class="mp-in" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" value="${esc(ls('axon.turnKey'))}"></div>
                <p class="mp-hint">${S('advNote')}</p></details>` : ''}`;
        }
        panel.innerHTML = `<div class="mp-card"><button class="mp-x" type="button" data-mp="close" aria-label="${S('close')}">×</button>
            <h2>${S('title')} <small>${S(mode === 'online' ? 'subOn' : 'sub')}</small></h2>${body}
            <div class="mp-status${stErr ? ' err' : ''}">${stMsg}</div><p class="mp-hint">${S(mode === 'online' ? 'hintOn' : 'hint')}</p></div>`;
        const ci = panel.querySelector('#mp-code'); if (ci) ci.addEventListener('input', () => { ci.value = ci.value.toLowerCase().replace(/[^a-z0-9]/g, ''); });
    }
    function openLobby() {
        ensurePanel();
        if (!role) { view = 'home'; stMsg = ''; stErr = false; }
        renderLobby(); panel.classList.add('show');
    }
    function closeLobby() { if (panel) panel.classList.remove('show'); }
    if (I()) I().onChange(() => renderLobby());

    // a co-op page load: reconnect to the room by itself
    if (session && session.code) {
        code = session.code; mySlot = session.slot || 0; phase = 'game';
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => (session.role === 'host' ? hostRoom(true) : joinRoom(code, true)));
        else (session.role === 'host' ? hostRoom(true) : joinRoom(code, true));
    }

    return {
        COLORS, S,
        get on() { return !!session; },                    // a co-op game is running (world seed shared)
        get role() { return session ? session.role : role; },
        get slot() { return mySlot; },
        get seed() { return session ? session.seed : null; },
        get roster() { return roster; },
        get peers() { return role === 'host' ? conns.size : roster.length - 1; },
        nameOf(slot) { const p = roster.find(r => r.slot === slot); return p ? p.name : 'P' + (slot + 1); },
        lookOf(slot) { const p = roster.find(r => r.slot === slot); return p ? p.look : null; },
        send, sendTo, broadcast,
        relay(m, from) { if (role === 'host') broadcast(Object.assign({ id: from }, m), from); },
        onMsg(fn) { handlers.push(fn); },
        goto: teamGoto, leave, openLobby, closeLobby,
        host: () => hostRoom(false), join: c => joinRoom(String(c).toLowerCase(), false), start: startTeam, get code() { return code; }, get phase() { return phase; },
        lookChanged() { const lk = lookNow(); if (role === 'host') rosterUpdate(); else send({ t: 'look', look: lk }); }
    };
})();

