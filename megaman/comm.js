// =====================================================================
//  AXON BREACH — COMM LINK (comm.js)
//  1 KENDEL ON THE RADIO. The HQ guide stays with you during the mission: a small comm box under the top bar
//    shows his face, his name and what he says, and the hero answers him. He speaks when the mission starts
//    and when something new is in front of you — the first patrol, a lockdown arena, the pit, each of the new
//    chambers, the checkpoint, the halfway mark, low armour, the guardian's door, the guardian's second phase.
//    The game is PAUSED while they talk; tap anywhere (or press Enter / Space) to finish a line and go on,
//    or let the lines move on by themselves. It waits for the boss intro, WINNER and any full-screen card. Every talk is said once per session. Five languages.
//    level.js calls AxonComm.tick(...) every frame of the mission.
//  2 THE GUARDIAN'S PICTURE ON THE MISSION LIST. The mission terminal in the HQ shows the boss of a mission —
//    a real picture of its model, taken once — on the mission's tile and in the details panel.
//  Loaded by index.html before level.js.
// =====================================================================
'use strict';

// ---------------------------------------------------------------------
//  Small sounds shared by the talks and the new mechanics (they use the game's own synth, audio.js):
//   type(who)  the blip of text being typed — a pitch per speaker (0 hero, 1 Kendel, 2 the guardian)
//   open/close the comm channel · next: a line is done · land: something heavy hits the floor ·
//   grab / top / leap: a ladder · lift / thud: the guardian's door · fanfare: WINNER
// ---------------------------------------------------------------------
window.AxonSfx = (function () {
    const S = () => window.AxonAudio && window.AxonAudio.AudioSys;
    const run = f => { try { const a = S(); if (a && a.ctx) f(a); } catch (e) { } };
    let lastType = 0;
    return {
        type(who) { const n = performance.now(); if (n - lastType < 52) return; lastType = n; run(a => { const f = [1245, 1568, 370][who] || 1245; a.tone('square', f, f, 0.03, who === 2 ? 0.11 : 0.085, { lp: who === 2 ? 1800 : 6000, wet: 0 }); }); },
        open() { run(a => { a.noise(0.05, 0.05, { type: 'highpass', f0: 2600 }); a.tone('square', 1400, 2100, 0.07, 0.03, { delay: 0.04 }); a.tone('square', 2100, 2100, 0.05, 0.025, { delay: 0.12 }); }); },
        close() { run(a => { a.tone('square', 1800, 900, 0.08, 0.025); a.noise(0.06, 0.03, { type: 'highpass', f0: 3000, delay: 0.06 }); }); },
        next() { run(a => a.tone('triangle', 880, 1320, 0.05, 0.09)); },
        land(k = 1) { run(a => { a.noise(0.14, 0.12 * k, { type: 'lowpass', f0: 260 }); a.tone('sine', 110, 48, 0.16, 0.16 * k); }); },
        grab() { run(a => { a.tone('triangle', 320, 480, 0.06, 0.1); a.noise(0.03, 0.05, { type: 'highpass', f0: 2000 }); }); },
        top() { run(a => { a.tone('triangle', 520, 880, 0.09, 0.1); }); },
        leap() { run(a => { a.noise(0.16, 0.1, { type: 'bandpass', f0: 900 }); a.tone('sine', 500, 240, 0.14, 0.08); }); },
        lift() { run(a => { a.noise(1.25, 0.07, { type: 'lowpass', f0: 180 }); a.tone('sawtooth', 52, 96, 1.25, 0.06, { lp: 400 }); a.tone('square', 660, 660, 0.05, 0.03, { delay: 0.0 }); }); },
        thud() { run(a => { a.noise(0.3, 0.12, { type: 'lowpass', f0: 140 }); a.tone('sine', 80, 36, 0.3, 0.16); }); },
        fanfare() { run(a => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => a.tone('triangle', f, f, 0.16, 0.04, { delay: 0.12 + i * 0.07 })); }); }
    };
})();

window.AxonComm = (function () {
    const K = 1, A = 0;
    const T = {
        en: { role: 'HQ GUIDE · COMM', you: 'AXON', boss: 'GUARDIAN',
            start: [[K, 'Kendel on comms. I have you inside the facility, AXON. Nine floors up to the core.'], [A, 'Copy, signal is clean. What is waiting for me?'], [K, 'Patrol units on every floor, and gates that stay locked until a sector is cleared. One floor at a time.']],
            patrol: [[K, 'Runners ahead. They rush in a straight line — sidestep, then cut.'], [A, 'Understood.']],
            arena: [[K, 'That is a lockdown arena. The gates seal until every hostile is down — two waves.'], [A, 'Then I clear the room.']],
            pit: [[K, 'Careful — there is no floor under those platforms. A fall ends the run.'], [A, 'And the plates on them?'], [K, 'Spike beds. They flash before they fire: cross when they go dark.']],
            zhall: [[K, 'The route turns here. The stairs run across the hall, and a dome gun covers them.'], [A, 'Armoured?'], [K, 'Only while it is shut. Hit it when the dome opens to fire.']],
            shaft: [[K, 'A vertical shaft. Use the ladders — walk into one and you climb, jump to let go.'], [A, 'Going up.']],
            tower: [[K, 'The exit is on the balcony, nine metres up. The long ladder behind the spikes, or the stepped platforms on the other wall.'], [A, 'I will pick my way.']],
            saved: [[K, 'Sector clear. I logged your progress — if you fall, you restart from here.'], [A, 'Good to know.']],
            half: [[K, 'Halfway. Heavier units from here on: the big ones slam the ground — jump the shockwave.'], [A, 'Noted.']],
            low: [[K, 'Your armour is under a third! Use a repair cell or get some distance.'], [A, 'I am still standing.']],
            door: [[K, 'Last floor. The door ahead has a scanner eye — let it read you and it opens.'], [A, 'And behind it?'], [K, 'The guardian, SENTINEL-Ω. I cannot help you in there. Good luck, AXON.']],
            rage: [[K, 'Its core is overheating — it is faster now and it calls drones. Keep moving!'], [A, 'It is not walking out of here.']] },
        ar: { role: 'مرشد المقر · اتصال', you: 'أكسون', boss: 'الحارس',
            start: [[K, 'كيندل على الخط. أراك داخل المنشأة يا أكسون. تسعة طوابق حتى القلب.'], [A, 'عُلم، الإشارة واضحة. ماذا ينتظرني؟'], [K, 'دوريات في كل طابق، وبوابات تبقى مقفلة حتى تنظّف القطاع. طابق بعد طابق.']],
            patrol: [[K, 'راكضون أمامك. يهجمون بخط مستقيم — تنحَّ جانباً ثم اضرب.'], [A, 'مفهوم.']],
            arena: [[K, 'هذه ساحة إغلاق. البوابات تُقفل حتى يسقط كل الأعداء — موجتان.'], [A, 'إذن أنظّف الغرفة.']],
            pit: [[K, 'انتبه — لا أرض تحت هذه المنصات. السقوط ينهي المحاولة.'], [A, 'واللوحات التي عليها؟'], [K, 'أسرّة مسامير. تومض قبل أن تخرج: اعبر حين تنطفئ.']],
            zhall: [[K, 'الطريق ينعطف هنا. الدرج يمتد بعرض القاعة، ومدفع القبة يغطيه.'], [A, 'مدرّع؟'], [K, 'فقط وهو مغلق. اضربه حين تنفتح القبة ليطلق.']],
            shaft: [[K, 'بئر عمودي. استعمل السلالم — امشِ نحو السلّم فتتسلق، واقفز لتتركه.'], [A, 'صاعد.']],
            tower: [[K, 'المخرج على الشرفة، تسعة أمتار للأعلى. السلّم الطويل خلف المسامير، أو المنصات المدرّجة عند الجدار الآخر.'], [A, 'سأختار طريقي.']],
            saved: [[K, 'القطاع نظيف. سجّلتُ تقدمك — إن سقطت تعود من هنا.'], [A, 'جيد أن أعرف.']],
            half: [[K, 'نصف الطريق. من هنا وحدات أثقل: الكبار يضربون الأرض — اقفز فوق الموجة.'], [A, 'عُلم.']],
            low: [[K, 'درعك أقل من الثلث! استعمل خلية إصلاح أو ابتعد قليلاً.'], [A, 'ما زلت واقفاً.']],
            door: [[K, 'الطابق الأخير. الباب أمامك فيه عين فاحصة — دعها تقرؤك فينفتح.'], [A, 'وما خلفه؟'], [K, 'الحارس SENTINEL-Ω. لا أستطيع مساعدتك في الداخل. بالتوفيق يا أكسون.']],
            rage: [[K, 'قلبه يسخن — صار أسرع ويستدعي درونز. لا تتوقف عن الحركة!'], [A, 'لن يخرج من هنا.']] },
        es: { role: 'GUÍA DEL CUARTEL · COM', you: 'AXON', boss: 'GUARDIÁN',
            start: [[K, 'Kendel en línea. Te tengo dentro de la instalación, AXON. Nueve pisos hasta el núcleo.'], [A, 'Recibido, señal limpia. ¿Qué me espera?'], [K, 'Patrullas en cada piso y puertas que siguen cerradas hasta limpiar el sector. Piso a piso.']],
            patrol: [[K, 'Corredores delante. Cargan en línea recta: apártate y corta.'], [A, 'Entendido.']],
            arena: [[K, 'Es una arena de cierre. Las puertas se sellan hasta que caigan todos: dos oleadas.'], [A, 'Entonces limpio la sala.']],
            pit: [[K, 'Cuidado: no hay suelo bajo esas plataformas. Una caída acaba el intento.'], [A, '¿Y las placas?'], [K, 'Camas de pinchos. Parpadean antes de salir: cruza cuando se apaguen.']],
            zhall: [[K, 'La ruta gira aquí. La escalera cruza la sala y un cañón de cúpula la cubre.'], [A, '¿Blindado?'], [K, 'Solo cerrado. Golpéalo cuando la cúpula se abra para disparar.']],
            shaft: [[K, 'Un pozo vertical. Usa las escaleras de mano: camina hacia una y subes, salta para soltarte.'], [A, 'Subiendo.']],
            tower: [[K, 'La salida está en el balcón, nueve metros arriba. La escalera larga tras los pinchos o las plataformas del otro muro.'], [A, 'Elegiré mi camino.']],
            saved: [[K, 'Sector limpio. Guardé tu progreso: si caes, vuelves desde aquí.'], [A, 'Bueno saberlo.']],
            half: [[K, 'Mitad del camino. Unidades más pesadas: las grandes golpean el suelo, salta la onda.'], [A, 'Anotado.']],
            low: [[K, '¡Tu blindaje está por debajo de un tercio! Usa una célula de reparación o toma distancia.'], [A, 'Sigo en pie.']],
            door: [[K, 'Último piso. La puerta tiene un ojo escáner: deja que te lea y se abre.'], [A, '¿Y detrás?'], [K, 'El guardián, SENTINEL-Ω. Ahí dentro no puedo ayudarte. Suerte, AXON.']],
            rage: [[K, 'Su núcleo se sobrecalienta: es más rápido y llama drones. ¡No pares!'], [A, 'No saldrá de aquí.']] },
        zh: { role: '总部向导 · 通讯', you: 'AXON', boss: '守卫',
            start: [[K, '肯德尔呼叫。AXON，我看到你已进入设施。到核心还有九层。'], [A, '收到，信号清晰。前面有什么？'], [K, '每层都有巡逻单位，区域清空前闸门不会开。一层一层来。']],
            patrol: [[K, '前方有奔袭者。它们直线冲锋——侧移，再斩。'], [A, '明白。']],
            arena: [[K, '这是封锁竞技场。敌人全灭前闸门封死——共两波。'], [A, '那我就清场。']],
            pit: [[K, '小心——那些平台下面没有地面。掉下去就结束了。'], [A, '平台上的板子呢？'], [K, '尖刺床。弹出前会闪烁：熄灭时再过。']],
            zhall: [[K, '路线在这里转向。楼梯横穿大厅，有一门穹顶炮守着。'], [A, '有装甲？'], [K, '只在闭合时。穹顶打开开火时攻击它。']],
            shaft: [[K, '垂直竖井。用梯子——走向梯子就会攀爬，跳跃松手。'], [A, '上去了。']],
            tower: [[K, '出口在九米高的平台上。尖刺后的长梯，或另一侧墙边的阶梯平台。'], [A, '我自己选路。']],
            saved: [[K, '区域已清空。进度已记录——倒下就从这里重来。'], [A, '知道了。']],
            half: [[K, '过半了。接下来是更重的单位：大家伙会砸地——跳过冲击波。'], [A, '记下了。']],
            low: [[K, '你的装甲不到三分之一！用修复单元，或者拉开距离。'], [A, '我还站着。']],
            door: [[K, '最后一层。前面的门有一只扫描眼——让它读取你，门就会开。'], [A, '门后呢？'], [K, '守卫 SENTINEL-Ω。里面我帮不了你。祝你好运，AXON。']],
            rage: [[K, '它的核心过热了——更快了，还会召唤无人机。别停下！'], [A, '它走不出这里。']] },
        ja: { role: '司令部ガイド · 通信', you: 'AXON', boss: 'ガーディアン',
            start: [[K, 'こちらケンデル。AXON、施設内に入ったのを確認した。コアまで九階だ。'], [A, '了解、通信は良好。何が待っている？'], [K, '各階に巡回ユニット、そして区画を制圧するまで開かないゲート。一階ずつ行こう。']],
            patrol: [[K, '前方にランナー。直線で突っ込んでくる——横に避けて斬れ。'], [A, '了解。']],
            arena: [[K, 'そこは封鎖アリーナだ。敵を全滅させるまでゲートは閉じる——二波ある。'], [A, 'なら片づける。']],
            pit: [[K, '気をつけろ——その足場の下に床はない。落ちたら終わりだ。'], [A, '足場の板は？'], [K, 'スパイク床だ。出る前に点滅する。消えた時に渡れ。']],
            zhall: [[K, 'ここで道が曲がる。階段は広間を横切り、ドーム砲が狙っている。'], [A, '装甲は？'], [K, '閉じている間だけだ。撃つためにドームが開いた時を叩け。']],
            shaft: [[K, '縦坑だ。はしごを使え——向かって歩けば登る、ジャンプで離れる。'], [A, '上がる。']],
            tower: [[K, '出口は九メートル上のバルコニーだ。スパイクの奥の長いはしごか、反対の壁の段差の足場。'], [A, '道は自分で選ぶ。']],
            saved: [[K, '区画クリア。進行を記録した——倒れてもここから再開だ。'], [A, '助かる。']],
            half: [[K, '半分だ。ここから重いユニットが増える。大型は地面を叩く——衝撃波は跳び越えろ。'], [A, '覚えた。']],
            low: [[K, 'アーマーが三分の一を切った！リペアセルを使うか、距離を取れ。'], [A, 'まだ立っている。']],
            door: [[K, '最上階だ。前の扉にはスキャナーの目がある——読み取らせれば開く。'], [A, 'その奥は？'], [K, 'ガーディアン、SENTINEL-Ω。中では助けられない。健闘を祈る、AXON。']],
            rage: [[K, 'コアが過熱している——速くなり、ドローンを呼ぶ。動き続けろ！'], [A, 'ここからは出さない。']] }
    };
    // faces, drawn: Kendel (white hair, headset, amber eyes) and the hero (helmet, cyan visor band)
    const FACE = [
        '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#0b1a2c"/><path d="M8 64c2-13 11-19 24-19s22 6 24 19z" fill="#dfe8f2"/><path d="M24 47h16v8l-8 5-8-5z" fill="#39d7ff"/><path d="M19 30c0-11 5-17 13-17s13 6 13 17c0 9-6 16-13 16s-13-7-13-16z" fill="#e7b48e"/><path d="M14 30c-1-14 6-23 18-23s19 9 18 23l-5-2c0-8-5-13-13-13s-13 5-13 13z" fill="#f4f7fb"/><path d="M14 22h36v5H14z" fill="#39d7ff"/><path d="M19 15c3-6 8-9 13-9s10 3 13 9z" fill="#ffffff"/><path d="M22 24c2-4 6-5 10-5s8 1 10 5c-3-1-7-2-10-2s-7 1-10 2z" fill="#6b4226"/><ellipse cx="26.5" cy="31" rx="2.3" ry="2.8" fill="#1d2b3a"/><ellipse cx="37.5" cy="31" rx="2.3" ry="2.8" fill="#1d2b3a"/><circle cx="27.2" cy="30.2" r=".8" fill="#fff"/><circle cx="38.2" cy="30.2" r=".8" fill="#fff"/><path d="M28 39c2.5 1.6 5.5 1.6 8 0" fill="none" stroke="#8a4b33" stroke-width="1.5" stroke-linecap="round"/></svg>',
        '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#1f1608"/><path d="M8 64c2-13 11-19 24-19s22 6 24 19z" fill="#2a3442"/><path d="M26 46h12l-2 9h-8z" fill="#ffa826"/><path d="M19 31c0-11 5-17 13-17s13 6 13 17c0 9-6 16-13 16s-13-7-13-16z" fill="#b9794f"/><path d="M17 29c-2-13 5-21 15-21s17 8 15 21c-2-7-5-11-9-12-5 3-12 4-17 3-2 2-3 5-4 9z" fill="#f2f2f6"/><ellipse cx="26.5" cy="31" rx="2.2" ry="2.6" fill="#d99a12"/><ellipse cx="37.5" cy="31" rx="2.2" ry="2.6" fill="#d99a12"/><circle cx="26.5" cy="31" r="1" fill="#241405"/><circle cx="37.5" cy="31" r="1" fill="#241405"/><path d="M23 26.5l6-1M35 25.5l6 1" stroke="#e9e9ee" stroke-width="1.6" stroke-linecap="round"/><path d="M28 39.5c2.5 1.3 5.5 1.3 8 0" fill="none" stroke="#6e3d24" stroke-width="1.5" stroke-linecap="round"/><path d="M15 31c0-12 7-19 17-19s17 7 17 19" fill="none" stroke="#39424e" stroke-width="2.6"/><rect x="11.5" y="28" width="6" height="10" rx="2.5" fill="#ffa826"/><rect x="46.5" y="28" width="6" height="10" rx="2.5" fill="#ffa826"/><path d="M15 37c1 7 6 10 12 10" fill="none" stroke="#39424e" stroke-width="1.8"/><circle cx="28" cy="47" r="2" fill="#ffa826"/></svg>'
    ];
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const stage = () => document.getElementById('stage') || document.body;
    const PIC = [null, null], PICT = [0, 0]; let hero = null;
    let catcher = null, apiRef = null, running = false, frozen = false, prevT = 0;
    let el = null, Q = [], cur = null, said = {}, last = 0, zi = 0, lowT = 0, nClear = -1, startT = 0;

    function build() {
        const st = document.createElement('style');
        st.textContent = `
          #comm{position:absolute;z-index:15;left:58%;top:calc(max(14px,env(safe-area-inset-top)) + 52px);transform:translate(-50%,-10px);width:min(450px,48%);box-sizing:border-box;
            display:none;grid-template-columns:auto 1fr;gap:10px;align-items:center;padding:7px 12px 8px 7px;opacity:0;transition:opacity .22s,transform .22s;cursor:pointer;pointer-events:auto;
            background:linear-gradient(180deg,rgba(8,14,26,.9),rgba(5,9,18,.92));border:1px solid var(--c);border-inline-start:4px solid var(--c);
            clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))}
          #comm.on{display:grid}
          #stage.comm-on #tipbar,#stage.comm-on #toast{opacity:0!important;pointer-events:none!important}
          #comm-catch{position:absolute;inset:0;z-index:14;display:none;background:radial-gradient(ellipse at 50% 30%,rgba(4,8,16,.12),rgba(4,8,16,.5));cursor:pointer;touch-action:none}
          #comm-catch.on{display:block}
          #comm .go{position:absolute;inset-inline-end:12px;bottom:3px;font-size:10px;color:var(--c);opacity:0}
          #comm.full .go{opacity:1;animation:cmGo .7s ease-in-out infinite}
          @keyframes cmGo{50%{transform:translateY(3px)}}#comm.in{opacity:1;transform:translate(-50%,0)}
          #comm.s0{--c:#39d7ff}#comm.s1{--c:#ffa826}
          #comm.low{top:calc(max(14px,env(safe-area-inset-top)) + 98px)}
          #stage.is-portrait #comm{left:50%;top:calc(max(14px,env(safe-area-inset-top)) + 236px);width:92%}
          #comm .pf{position:relative;width:50px;height:50px;border:1px solid var(--c);overflow:hidden;background:#06101c}
          #comm .pf svg,#comm .pf img{display:block;width:100%;height:100%;object-fit:cover}
          #comm .pf::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.07) 0 1px,transparent 1px 3px);animation:cmScan 2.4s linear infinite}
          #comm .nm{display:flex;gap:8px;align-items:baseline;font:800 11px/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.18em;color:var(--c);margin-bottom:4px}
          #comm .nm small{font-weight:600;font-size:8px;letter-spacing:.2em;color:#8fa3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          #comm .nm i{width:6px;height:6px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c);animation:cmLed .9s ease-in-out infinite;flex:none}
          #comm .tx{font:600 clamp(12px,2.1vmin,15px)/1.45 var(--font,'Chakra Petch',system-ui,sans-serif);color:#eef4ff;min-height:2.9em}
          #comm[dir=rtl] .nm{letter-spacing:.04em}
          #stage.modal-on #comm,#stage.boss-intro #comm,#stage.winner-on #comm,#stage.in-hub #comm,#stage.in-menu #comm{opacity:0!important;visibility:hidden}
          @keyframes cmScan{to{transform:translateY(3px)}}
          @keyframes cmLed{50%{opacity:.3}}`;
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'comm'; el.setAttribute('role', 'status');
        el.innerHTML = '<div class="pf"></div><div><div class="nm"><i></i><span></span><small></small></div><div class="tx"></div></div><span class="go">▼</span>';
        catcher = document.createElement('div'); catcher.id = 'comm-catch';
        stage().appendChild(catcher); stage().appendChild(el);
        const tap = e => { if (!cur) return; e.preventDefault(); e.stopPropagation(); if (cur.c < cur.txt.length) { cur.c = cur.txt.length; el.querySelector('.tx').textContent = cur.txt; el.classList.add('full'); } else cur.w = 99; };   // first tap: the whole line at once (it used to stay cut where the typing was)
        catcher.addEventListener('pointerdown', tap); el.addEventListener('pointerdown', tap);
        window.addEventListener('keydown', e => { if (cur && !live && (e.code === 'Enter' || e.code === 'Space')) tap(e); }, true);
    }
    function say(id, urgent) {
        if (said[id]) return; said[id] = 1;
        if (!T.en[id]) return;
        if (urgent) Q.unshift({ id, z: -1 }); else Q.push({ id, z: zi });
    }
    function line(api) {
        const L = lang(), row = T[L][cur.id][cur.k], who = row[0];
        cur.txt = row[1]; cur.c = 0; cur.w = 0;
        el.dir = L === 'ar' ? 'rtl' : 'ltr'; el.className = 'on in s' + who + (document.getElementById('boss-bar') && !document.getElementById('boss-bar').hidden ? ' low' : '');
        if (!PIC[who] && !PICT[who]) { PICT[who] = 1; PIC[who] = portrait(who ? window.AxonGuideRef : hero); }   // the real face, photographed from the model (once)
        el.querySelector('.pf').innerHTML = PIC[who] ? `<img alt="" src="${PIC[who]}">` : FACE[who];
        el.querySelector('.nm span').textContent = who ? 'KENDEL' : T[L].you; el.querySelector('.nm small').textContent = who ? T[L].role : '';
        el.querySelector('.tx').textContent = '';
        if (cur.k) window.AxonSfx.next();
    }
    // every frame of the mission (level.js)
    function tick(api, player, layout, dt) {
        if (!el) build();
        if (performance.now() - last > 4000 && !running) startT = 0; last = performance.now(); hero = player;
        const st = stage().classList, hold = st.contains('modal-on') || st.contains('boss-intro') || st.contains('winner-on') || (startT += dt) < 1.2;   // a breath after the countdown before he speaks
        // ---- what is in front of the hero? ----
        const p = player.mesh.position, Z = layout.zones;
        while (zi < Z.length - 1 && p.z < Z[zi].z1) zi++; while (zi > 0 && p.z > Z[zi].z0) zi--;
        const z = Z[zi], plan = window.AxonSectors ? window.AxonSectors.PLAN : [], B = window.AxonBossRef;
        if (!player.dead) {
            if (z.kind === 'start') say('start');
            else if (z.kind === 'corridor') { const k = plan[z.stage - 1] || 0; if (z.stage === 1) say('patrol'); if (k) say(['', 'zhall', 'shaft', 'tower'][k]); if (z.stage === 5) say('half'); if (z.stage === layout.stages) say('door'); }
            else if (z.kind === 'arena' && p.z < z.z0 - 6) say('arena');
            else if (z.kind === 'gauntlet') say('pit');
            const nc = layout.arenas.filter(a => a.state === 'clear').length; if (nClear >= 0 && nc > nClear) say('saved'); nClear = nc;   // only a sector cleared now, not the ones restored from a checkpoint
            if (player.hp > 0 && player.hp < player.maxHp * 0.33 && !(B && B.intro)) { lowT += dt; if (lowT > 0.4) say('low', true); } else lowT = 0;
            if (B && B.active && !B.isDead && B.phase === 2) say('rage', true);
        }
        // ---- something to say: stop the game and talk (the talk runs on its own clock, see run) ----
        apiRef = api;
        while (Q.length && Q[0].z >= 0 && Math.abs(Q[0].z - zi) > 1) Q.shift();                 // not about a place you have already left behind
        if (!hold && !running && !cur && Q.length) { cur = { id: Q.shift().id, k: 0, gap: 0 }; open(); }
    }
    const held = () => { const st = stage().classList; return st.contains('modal-on') || st.contains('boss-intro') || st.contains('winner-on'); };
    let live = false;
    function open() {
        // co-op: a shared world cannot stop, so she talks over the fight (no pause, no tap screen — the hero keeps full control)
        live = !!(window.AxonCoop && window.AxonCoop.on);
        frozen = !live && !!(window.AxonUI && window.AxonUI.freeze && window.AxonUI.freeze(true));
        if (!live) catcher.classList.add('on'); stage().classList.add('comm-on'); window.AxonSfx.open(); line(apiRef); running = true; prevT = performance.now(); requestAnimationFrame(run);
    }
    function close() {
        window.AxonSfx.close(); running = false; cur = null; el.classList.remove('in', 'full'); catcher.classList.remove('on'); stage().classList.remove('comm-on'); setTimeout(() => { if (!cur) el.classList.remove('on'); }, 240);
        if (frozen && window.AxonUI && window.AxonUI.freeze) window.AxonUI.freeze(false); frozen = false;
    }
    // the talk, frame by frame, in real time (the game is frozen under it)
    function run(now) {
        if (!running || !cur) return;
        const dt = Math.min(0.1, Math.max(0, (now - prevT) / 1000)); prevT = now;
        requestAnimationFrame(run);
        if (held()) return;                                                                      // a card came up over it: wait
        if (cur.c < cur.txt.length) { const c0 = cur.c | 0; cur.c = Math.min(cur.txt.length, cur.c + dt * 44); if ((cur.c | 0) !== c0) { el.querySelector('.tx').textContent = cur.txt.slice(0, cur.c | 0); if (/\S/.test(cur.txt[(cur.c | 0) - 1] || '')) window.AxonSfx.type(T[lang()][cur.id][cur.k][0]); } if (cur.c >= cur.txt.length) el.classList.add('full'); return; }
        el.classList.add('full'); cur.w += dt;
        if (cur.w > 2.2 + cur.txt.length / 20) {
            if (cur.k + 1 < T[lang()][cur.id].length) { cur.k++; line(apiRef); }
            else if (Q.length) { cur = { id: Q.shift().id, k: 0, gap: 0 }; line(apiRef); }
            else close();
        }
    }

    // ---------- portraits: the head of a live model (Kendel in the HQ, the hero), photographed once ----------
    // The model is lent to a small scene of its own for one frame (its own lights, a second renderer that is
    // thrown away afterwards) and put back exactly where it was.
    function portrait(P) {
        if (!P || !P.mesh || !P.headGroup || !window.THREE) return null;
        const m = P.mesh, par = m.parent, vis = m.visible, ex = P.extra, exV = ex ? ex.visible : true, pos = m.position.clone(), rot = m.rotation.clone();
        const hid = []; let url = null, R = null;
        try {
            R = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(192, 192, false); R.outputEncoding = THREE.sRGBEncoding; R.setClearColor(P === hero ? 0x0b2236 : 0x2a1c0a, 1);
            const sc = new THREE.Scene(); sc.add(m); m.visible = true; if (ex) ex.visible = false; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
            for (const k of ['sword', 'chargeOrb', 'muzzle']) if (P[k] && P[k].visible) { P[k].visible = false; hid.push(P[k]); }
            const hx = P.headGroup.rotation.clone(); P.headGroup.rotation.set(0, 0, 0);
            sc.add(new THREE.HemisphereLight(0xffffff, 0x38404c, 1.15)); const d = new THREE.DirectionalLight(0xffffff, 1.25); d.position.set(2.5, 4, 6); sc.add(d); const r = new THREE.DirectionalLight(P === hero ? 0x39d7ff : 0xffa826, 0.9); r.position.set(-4, 3, -5); sc.add(r);
            sc.updateMatrixWorld(true);
            const h = P.headGroup.getWorldPosition(new THREE.Vector3()), s = m.scale.x || 1;
            const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50); cam.position.set(h.x + 0.36 * s, h.y + 0.16 * s, h.z + 1.5 * s); cam.lookAt(h.x, h.y + 0.1 * s, h.z);
            R.render(sc, cam); url = R.domElement.toDataURL('image/jpeg', 0.9);
            P.headGroup.rotation.copy(hx);
        } catch (e) { url = null; }
        hid.forEach(o => { o.visible = true; });
        m.position.copy(pos); m.rotation.copy(rot); m.visible = vis; if (ex) ex.visible = exV;
        if (par) par.add(m); else if (m.parent) m.parent.remove(m);
        if (R) { R.dispose(); try { R.forceContextLoss(); } catch (e) { } }
        return url;
    }

    // ---------- the guardian's picture for the mission list ----------
    (function () { const st = document.createElement('style'); st.textContent = `
          .hm-det .art.boss{height:90px;min-height:90px;display:flex;justify-content:center;align-items:flex-end;background:radial-gradient(circle at 50% 62%,rgba(255,42,69,.28),transparent 68%),linear-gradient(180deg,rgba(40,6,12,.5),transparent);position:relative;overflow:hidden}
          .hm-det .art.boss img{height:90px;width:90px;flex:none;object-fit:contain;display:block;filter:drop-shadow(0 0 10px rgba(255,42,69,.55))}
          .hm-det .art.boss b{position:absolute;inset-inline-start:8px;bottom:6px;font:800 10px/1.2 var(--font,system-ui);letter-spacing:.16em;color:#ff5c6e;text-align:start}
          .hm-det .art.boss b small{display:block;font-size:8px;letter-spacing:.3em;color:#b7c6d6;font-weight:600}
          .hm-tile .bossimg{position:absolute;top:4px;inset-inline-end:4px;width:46px;height:46px;max-width:46px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,42,69,.6));pointer-events:none}
          .hm-tile.hasboss > svg{display:none}
          #stage.is-portrait .hm-det .art.boss{display:flex;height:96px;min-height:96px}#stage.is-portrait .hm-det .art.boss img{height:96px;width:96px}`; document.head.appendChild(st); })();
    let bossPic = null, tried = false;
    function shoot(close) {
        const B = window.AxonBossRef; if (!B || !B.mesh || !window.THREE) return null;
        try {
            const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(close ? 192 : 320, close ? 192 : 320, false); R.outputEncoding = THREE.sRGBEncoding; R.setClearColor(close ? 0x2a060c : 0x000000, close ? 1 : 0);
            const sc = new THREE.Scene(), m = B.mesh.clone(true); m.position.set(0, 0, 0); m.rotation.set(0, 0.5, 0); m.visible = true; m.traverse(o => { o.visible = true; o.frustumCulled = false; }); sc.add(m);
            sc.add(new THREE.HemisphereLight(0xffe6d0, 0x301018, 1.1)); const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(4, 9, 8); sc.add(d); const r = new THREE.PointLight(0xff2a45, 2.2, 40); r.position.set(-6, 5, -6); sc.add(r);
            m.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(m), c = bx.getCenter(new THREE.Vector3()), s = bx.getSize(new THREE.Vector3()), dist = Math.max(s.x, s.y) * 1.25;
            const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200); if (close) { cam.position.set(c.x + dist * 0.22, c.y + s.y * 0.3, c.z + dist * 0.62); cam.lookAt(c.x, c.y + s.y * 0.24, c.z); }   // head and shoulders
            else { cam.position.set(c.x + dist * 0.35, c.y + s.y * 0.05, c.z + dist * 1.35); cam.lookAt(c.x, c.y + s.y * 0.04, c.z); }
            R.render(sc, cam); const url = R.domElement.toDataURL(close ? 'image/jpeg' : 'image/png', 0.9);
            R.dispose(); try { R.forceContextLoss(); } catch (e) { }
            return url;
        } catch (e) { return null; }
    }
    function missionArt() {
        const det = document.querySelector('.hm-det'); if (!det) return;
        const sel = document.querySelector('.hm-tile.sel'), art = det.querySelector('.art');
        if (!bossPic && !tried) { tried = true; bossPic = shoot(); }
        if (!bossPic) return;
        const L = lang(), t0 = document.querySelector('.hm-tile[data-m="0"]');
        if (t0 && !t0.querySelector('.bossimg')) { const im = document.createElement('img'); im.className = 'bossimg'; im.alt = 'SENTINEL-Ω'; im.src = bossPic; t0.appendChild(im); t0.classList.add('hasboss'); }
        if (art && sel && sel.dataset.m === '0' && !art.classList.contains('boss')) { art.classList.add('boss'); art.innerHTML = `<img alt="SENTINEL-Ω" src="${bossPic}"><b>SENTINEL-Ω<small>${T[L].boss}</small></b>`; }
    }
    setInterval(() => { try { missionArt(); } catch (e) { } }, 350);
    // faces for other talks (the boss intro in winner.js): 0 the hero, 1 Kendel, 2 the guardian
    function face(who) {
        if (who === 2) { if (!bossFace && !bossTried) { bossTried = true; bossFace = shoot(true); } return bossFace; }
        if (!PIC[who] && !PICT[who]) { PICT[who] = 1; PIC[who] = portrait(who ? window.AxonGuideRef : hero); }
        return PIC[who];
    }
    let bossFace = null, bossTried = false;
    return { tick, say, missionArt, face };
})();
