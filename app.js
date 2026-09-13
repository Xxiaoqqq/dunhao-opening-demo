const app = document.querySelector("#app");

const state = {
  step: 0,
  signalValue: 18,
  signalTuned: false,
  inspected: new Set(),
  funSeen: new Set(),
  inspectLine: "",
  activeInspect: "",
  deviceOpen: false,
  supportMode: "standard",
  firstThought: "",
  response: null,
  repairing: false,
  route: "",
};

let responseTimer = null;

const inspectionCopy = {
  roof: {
    title: "松动的屋顶",
    body: "屋顶右边缺了一角。顿号看了两秒：‘行，先修房子。看在瑞士卷的份上，破点就破点吧。’",
  },
  notice: {
    title: "泡软的招聘启事",
    body: "上面写着：‘提供独立住处，工作清闲，每周三供应瑞士卷。’ 房子这部分已经很可疑了。",
  },
  luggage: {
    title: "翻倒的行李",
    body: "侧袋里塞着冰袋和一盒瑞士卷。顿号：‘幸好这个我没完全指望他们。’",
  },
};

const curiosityCopy = {
  pebbles: {
    tag: "顺手发现",
    title: "拒绝排队的碎石",
    body: "门边三块碎石离得几乎一样远，第四块偏要滚出去一点。顿号盯了一会儿，决定尊重它。",
  },
  chair: {
    tag: "顺手发现",
    title: "不肯朝北的转椅",
    body: "椅背贴着纸：‘离开时请把转椅转回北方。’没有署名，椅子也没照做。",
  },
  anemometer: {
    tag: "顺手发现",
    title: "非常努力的风速杆",
    body: "风速杆转得很认真，屋里的仪表却一直显示 0。顿号：‘看来上班装样子的不止我一个。’",
  },
};

const routeLabels = {
  safe: "先看保险柜",
  keeper: "先问保管钥匙的人",
  bag: "先看灰布袋",
};

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function signalDots(count) {
  return [1, 2, 3]
    .map((index) => `<span class="signal-dot ${index <= count ? "is-on" : ""}"></span>`)
    .join("");
}

function microbar(progress, signal = 3) {
  return `
    <div class="microbar">
      <span class="brand-mark"><span class="comma">、</span><span>顿号<small>旧气象站通讯器</small></span></span>
      <span class="signal" aria-label="通讯信号 ${signal} 格">${signalDots(signal)}<span>${progress}</span></span>
    </div>
  `;
}

function sceneHotspots() {
  const buttons = [
    ["roof", "屋顶"],
    ["notice", "招聘启事"],
    ["luggage", "行李"],
  ];

  const curiosities = [
    ["pebbles", "碎石"],
    ["chair", "转椅"],
    ["anemometer", "风速杆"],
  ];

  return `
    <div class="scene-hotspots" aria-label="场景中可以查看的物件">
      ${buttons
        .map(([key, label]) => `
          <button
            class="scene-hotspot is-${key} ${state.inspected.has(key) ? "is-seen" : ""}"
            data-inspect="${key}"
            aria-label="查看${label}"
          >
            <span class="hotspot-ring"></span>
            <span class="hotspot-label">${state.inspected.has(key) ? "看过了" : label}</span>
          </button>
        `)
        .join("")}
      ${curiosities
        .map(([key, label]) => `
          <button
            class="scene-hotspot scene-curiosity is-${key} ${state.funSeen.has(key) ? "is-seen" : ""}"
            data-look="${key}"
            aria-label="随手看看${label}"
          >
            <span class="hotspot-ring"></span>
            <span class="hotspot-label">${state.funSeen.has(key) ? "看过了" : label}</span>
          </button>
        `)
        .join("")}
    </div>
  `;
}

function ambientMotion(type) {
  if (type === "opening") {
    return `
      <div class="cat-tail-motion" aria-hidden="true"><i></i><i></i></div>
    `;
  }

  return "";
}

function deviceStatus() {
  if (state.step === 0) {
    return {
      status: "正在呼叫",
      body: "指示灯反复亮起，听筒里只有杂音。它像是在等另一端的人接通。",
    };
  }

  if (state.step === 1) {
    return {
      status: "画面已接入 · 声音未校准",
      body: "画面已经传过来了，声音还埋在杂音里。调到清楚的位置，就能听见那只猫在说什么。",
    };
  }

  return {
    status: "双向连接已建立",
    body: "你能继续看见旧气象站，也能把自己的话传给顿号。",
  };
}

function deviceHotspot() {
  return `
    <button class="scene-device-hotspot" data-action="open-device" aria-label="放大查看通讯器">
      <span aria-hidden="true">＋</span>
      <small>通讯器</small>
    </button>
  `;
}

function deviceDialog() {
  const copy = deviceStatus();
  return `
    <div class="device-dialog" role="dialog" aria-modal="true" aria-label="通讯器状态">
      <button class="device-dialog-backdrop" data-action="close-device" aria-label="关闭通讯器特写"></button>
      <div class="device-dialog-panel">
        <button class="device-dialog-close" data-action="close-device" aria-label="关闭">×</button>
        <img src="./assets/communicator.png" alt="黄绿色旧通讯器和听筒" />
        <div class="device-dialog-copy">
          <span>通讯器</span>
          <strong>${escapeHtml(copy.status)}</strong>
          <p>${escapeHtml(copy.body)}</p>
        </div>
      </div>
    </div>
  `;
}

function scene(image, type, label, overlay = "") {
  const focusClass = state.activeInspect ? `focus-${state.activeInspect}` : "";
  return `
    <div class="scene-viewport is-${type} ${focusClass}">
      <img class="scene-image" src="${image}" alt="${label}" />
      <div class="scene-wash" aria-hidden="true"></div>
      ${ambientMotion(type)}
      ${type === "opening" ? deviceHotspot() : ""}
      ${overlay}
      ${state.step > 0 ? `<span class="stage-chip">食间岛 · 坡地</span>` : ""}
    </div>
  `;
}

function frame(
  content,
  {
    image = "./assets/opening.jpg",
    type = "opening",
    label = "旧气象站门前，顿号躺在行李和通讯器旁边",
    progress = "刚刚接通",
    signal = 3,
    opening = false,
    overlay = "",
  } = {},
) {
  return `
    <section class="experience">
      ${opening ? "" : microbar(progress, signal)}
      <div class="scene-card">
        ${scene(image, type, label, overlay)}
        <div class="story-panel ${opening ? "is-opening" : ""}">${content}</div>
      </div>
    </section>
    ${state.deviceOpen ? deviceDialog() : ""}
  `;
}

function interpretThought(text) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (/保险柜|撬|锁|柜/.test(clean)) {
    return {
      anchor: "保险柜有没有留下物理痕迹",
      body: "你先盯住了物理事实，这比“大家都说”硬得多。我们去看柜门、锁和使用记录；没有撬痕也不是结论，它只会排除一种拿法。",
      suggestedRoute: "safe",
    };
  }

  if (/钥匙|保管|谁能碰|谁拿得到/.test(clean)) {
    return {
      anchor: "钥匙到底是谁能碰到",
      body: "对，‘她负责保管’和‘只有她拿得到’是两件事。先把职责和实际接触条件拆开，嫌疑才不会被一句话锁死。",
      suggestedRoute: "keeper",
    };
  }

  if (/灰布袋|袋子|拿错|相似|一样/.test(clean)) {
    return {
      anchor: "丢失的袋子本身",
      body: "你没有先追人，而是先追东西。好。我们得确认袋子长什么样、旅店里有没有同款，以及大家说的究竟是不是同一只。",
      suggestedRoute: "bag",
    };
  }

  if (/离岛|逃|要走|动机|准备走/.test(clean)) {
    return {
      anchor: "离岛为什么会被当成嫌疑",
      body: "你抓到的是大家的推理捷径：准备离开，看起来很像动机。但处境不是行为证据。我们可以保留怀疑，同时去找袋子是否真的经过她的手。",
      suggestedRoute: "keeper",
    };
  }

  if (/偷|小偷|肯定|就是她|一定是/.test(clean)) {
    return {
      anchor: "你已经形成了一个嫌疑",
      body: "可以怀疑，我先不替你确认。她有钥匙、又准备离岛，这解释了为什么她显眼；接下来要补的是‘袋子怎样到了她手里’，否则中间还空着一段。",
      suggestedRoute: "keeper",
    };
  }

  if (/不知道|没想法|不会|随便|说不好/.test(clean)) {
    return {
      anchor: "现在还没有形成判断",
      body: "不知道也算有效回答。你不需要先猜中谁，只要挑一个能亲眼确认的东西。我们从保险柜开始，先让现场替你说一句话。",
      suggestedRoute: "safe",
    };
  }

  if (/紧张|害怕|不舒服|奇怪|不对劲|着急/.test(clean)) {
    return {
      anchor: "你先感觉到了不对劲",
      body: "这还不是结论，但不是废话。你感觉到的那处别扭可以先留着；到现场后，我们看看究竟是哪一个细节让它站得住。",
      suggestedRoute: "safe",
    };
  }

  const excerpt = clean.length > 34 ? `${clean.slice(0, 34)}……` : clean;
  return {
    anchor: `“${excerpt}”`,
    body: "我听到了，但先不把它压成一个标准答案。这里面至少有一件能验证的事：谁接触过、现场留下了什么，或者两只袋子是不是容易认错。你挑一处，我们一起把它查实。",
    suggestedRoute: "",
  };
}

function beginResponse(mode, thought = "") {
  window.clearTimeout(responseTimer);
  state.supportMode = mode;
  state.firstThought = thought;

  if (mode === "free") {
    state.response = interpretThought(thought);
  } else if (mode === "help") {
    state.response = {
      anchor: "不需要先会推理",
      body: "巧了，岛上现在也没有资格审查。你只要说哪里奇怪，我负责把问题问清楚。要是线索太多，我一次只递给你一个。",
      suggestedRoute: "safe",
    };
  } else if (mode === "rest") {
    state.response = {
      anchor: "今天可以少想一点",
      body: "收到。我们不拼完整答案，只看一个最明显的地方。你随时可以停，案件不会因为你休息就判你输。",
      suggestedRoute: "safe",
    };
  } else {
    state.response = {
      anchor: "你还在线",
      body: "在就行。先不用站队，我们到现场挑一件能亲眼确认的东西。",
      suggestedRoute: "",
    };
  }

  state.step = 55;
  render();
  responseTimer = window.setTimeout(() => {
    state.step = 6;
    render();
  }, mode === "free" ? 1050 : 720);
}

function render() {
  if (state.step === 0) {
    app.innerHTML = frame(
      `<div class="action-area"><button class="primary connect-button" data-action="connect"><span>接通信号</span><span class="button-pulse" aria-hidden="true"></span></button></div>`,
      { opening: true },
    );
    return;
  }

  if (state.step === 1) {
    app.innerHTML = frame(`
      <div class="device-status" role="status">
        <span><i aria-hidden="true"></i>食间岛旧气象站 · 通讯器</span>
        <strong>画面已接入 · 声音未校准</strong>
      </div>
      <p class="speaker">通讯器</p>
      <p class="dialogue dialogue-enter">旧气象站这台通讯器居然还通着。<br />画面已经到了，声音还被杂音压着。把游标拖到最清楚的位置。</p>
      <div class="tuner" data-tuner style="--signal-level: ${state.signalValue}%">
        <div class="waveform" aria-hidden="true">
          ${Array.from({ length: 13 }, (_, index) => `<span style="--i:${index}"></span>`).join("")}
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value="${state.signalValue}"
          aria-label="调整通讯信号"
          data-signal-control
        />
        <div class="tuner-scale"><span>杂音</span><strong data-signal-copy>再往中间一点</strong><span>杂音</span></div>
      </div>
      <div class="action-area">
        <button class="primary" data-action="lock-signal" disabled>继续找声音</button>
      </div>
    `, { progress: "信号不稳", signal: 1 });
    return;
  }

  if (state.step === 2) {
    const observation = state.inspectLine
      ? `<div class="observation-card ${state.inspectLine.tag ? "is-curiosity" : ""}" role="status"><span>${escapeHtml(state.inspectLine.tag || "看到")}</span><strong>${escapeHtml(state.inspectLine.title)}</strong><p>${escapeHtml(state.inspectLine.body)}</p></div>`
      : `<p class="aside-line">画面里有三处可以碰一碰。你不必全部看完。</p>`;

    app.innerHTML = frame(`
      <div class="connection-context" role="status">
        <span><i aria-hidden="true"></i>双向连接已建立</span>
        <small>接下来你会通过这台通讯器看见现场，也能把话传给顿号。</small>
      </div>
      <p class="speaker">顿号</p>
      <p class="dialogue dialogue-enter">你能看见这边？好。先别断。<br />你看现场，我听你说。<br /><br />还有，我没晕。坐累了，躺着舒服一点。</p>
      ${observation}
      <div class="action-area">
        <div class="inspection-progress" aria-label="已经查看 ${state.inspected.size} 处">
          <span>随手看看</span>
          <span>${state.inspected.size} / 3</span>
        </div>
        <button class="primary" data-action="continue-arrival">有人从坡下跑来了</button>
      </div>
    `, {
      progress: "连接稳定",
      overlay: sceneHotspots(),
    });
    return;
  }

  if (state.step === 3) {
    app.innerHTML = frame(`
      <div class="dialogue-stack">
        <div class="speech-card is-human">
          <p class="speaker">失窃客人</p>
          <p class="dialogue">你就是今天新来的调查员？</p>
        </div>
        <div class="speech-card is-cat">
          <p class="speaker">顿号</p>
          <p class="dialogue">从手续上说，是。<br />从住宿条件上说，我可能活不到正式入职。</p>
        </div>
      </div>
      <div class="action-area">
        <button class="primary" data-action="hear-case">先说丢了什么</button>
      </div>
    `, {
      image: "./assets/guest.jpg",
      type: "guest",
      label: "一名客人匆忙走进气象站，顿号坐在行李箱上听他说话",
      progress: "有人来访",
    });
    return;
  }

  if (state.step === 4) {
    app.innerHTML = frame(`
      <div class="case-reveal">
        <p class="speaker">失窃客人</p>
        <p class="dialogue">旅店保险柜里丢了一只<strong class="ink-mark">灰布袋</strong>。<br />管钥匙的那个人今天正要离岛，现在所有人都说是她拿的。</p>
      </div>
      <div class="speech-card is-cat response-card">
        <p class="speaker">顿号</p>
        <p class="dialogue">所有人都说，不算证据。<br />但一个准备离岛的人、一只丢失的袋子，确实值得我先把屋顶放一放。</p>
      </div>
      <div class="action-area">
        <button class="primary" data-action="invite">我听明白了</button>
      </div>
    `, {
      image: "./assets/guest.jpg",
      type: "guest",
      label: "失窃客人讲述旅店保险柜里的灰布袋不见了",
      progress: "案件出现",
    });
    return;
  }

  if (state.step === 5) {
    app.innerHTML = frame(`
      <p class="speaker">顿号</p>
      <p class="dialogue">线上的，你还在吗？<br />你负责记住他们说了什么，我负责假装自己已经上班。</p>
      <div class="action-area">
        ${state.repairing ? "" : `
          <div class="choice-grid">
            <button class="choice" data-presence="ready"><strong>在，先去看看</strong><span>暂时不下判断</span></button>
            <button class="choice" data-presence="help"><strong>我不太会推理</strong><span>一次只接一条线索</span></button>
            <button class="choice" data-presence="rest"><strong>我今天不太想动脑</strong><span>从最明显的地方开始</span></button>
          </div>
        `}
        <div class="input-wrap ${state.repairing ? "is-repairing" : ""}">
          <div class="input-heading">
            <label for="first-thought">${state.repairing ? "哪里没说对？你可以补一句" : "也可以直接告诉顿号，你现在怎么想"}</label>
            <span data-count>0 / 160</span>
          </div>
          <div class="quick-prompts" aria-label="输入提示">
            <button data-seed="我想先确认保险柜有没有被撬过">我想先确认……</button>
            <button data-seed="为什么大家这么快就认定是管钥匙的人">让我奇怪的是……</button>
            <button data-seed="两只灰布袋会不会很像，可能有人拿错了">有没有可能……</button>
          </div>
          <textarea id="first-thought" maxlength="160" placeholder="不需要组织成完整推理，想到哪儿说到哪儿。">${state.repairing ? escapeHtml(state.firstThought) : ""}</textarea>
          <div class="input-actions">
            <span class="privacy-note">这版只在当前页面回应</span>
            <button class="secondary" data-action="submit-thought">${state.repairing ? "再说清一点" : "说给顿号听"}</button>
          </div>
        </div>
      </div>
    `, {
      image: "./assets/guest.jpg",
      type: "guest",
      label: "顿号转向通讯器，邀请线上的搭档一起调查",
      progress: state.repairing ? "再听一次" : "轮到你了",
    });
    return;
  }

  if (state.step === 55) {
    app.innerHTML = frame(`
      <div class="conversation">
        ${state.firstThought ? `
          <div class="chat-bubble is-user">
            <span>线上搭档</span>
            <p>${escapeHtml(state.firstThought)}</p>
          </div>
        ` : ""}
        <div class="chat-bubble is-dunhao is-listening">
          <span>顿号</span>
          <div class="typing" aria-label="顿号正在回应"><i></i><i></i><i></i></div>
        </div>
        <div class="message-relay" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <p class="listening-copy">顿号把你的话从头看了一遍。</p>
    `, {
      image: "./assets/guest.jpg",
      type: "guest",
      label: "顿号低头看着通讯器里的消息",
      progress: "正在回应",
    });
    return;
  }

  if (state.step === 6) {
    app.innerHTML = frame(`
      <div class="conversation">
        ${state.firstThought ? `
          <div class="chat-bubble is-user">
            <span>线上搭档</span>
            <p>${escapeHtml(state.firstThought)}</p>
          </div>
        ` : ""}
        <div class="chat-bubble is-dunhao">
          <span>顿号</span>
          <p>${escapeHtml(state.response.body)}</p>
        </div>
      </div>
      <div class="reply-check">
        <span>我抓住的是</span>
        <strong>${escapeHtml(state.response.anchor)}</strong>
      </div>
      <div class="action-area">
        ${state.supportMode === "free" ? `
          <div class="understanding-actions">
            <button class="primary" data-action="accept-reading">对，接着查</button>
            <button class="secondary" data-action="repair-reading">不完全是，我补一句</button>
          </div>
        ` : `
          <button class="primary" data-action="accept-reading">好，先挑一个地方</button>
        `}
      </div>
    `, {
      image: "./assets/guest.jpg",
      type: "guest",
      label: "顿号回应线上搭档刚才的想法",
      progress: "接住了",
    });
    return;
  }

  if (state.step === 7) {
    app.innerHTML = frame(`
      <p class="speaker">顿号</p>
      <p class="dialogue">那就把刚才的想法，变成第一步。</p>
      <p class="aside-line">没有标准答案。顺序会变，案件事实不会。</p>
      <div class="action-area">
        <div class="choice-grid route-grid">
          ${Object.entries(routeLabels).map(([key, label]) => `
            <button class="choice ${state.response?.suggestedRoute === key ? "is-suggested" : ""}" data-route="${key}">
              ${state.response?.suggestedRoute === key ? `<em>和刚才的想法相连</em>` : ""}
              <strong>${label}</strong>
              <span>${key === "safe" ? "先确认外部事实" : key === "keeper" ? "听她自己怎么说" : "弄清丢的到底是什么"}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `, {
      image: "./assets/guest.jpg",
      type: "guest",
      label: "顿号准备与线上搭档一起前往旅店调查",
      progress: "选择方向",
    });
    return;
  }

  const chosen = routeLabels[state.route] || state.route;
  app.innerHTML = frame(`
    <p class="speaker">调查方向已记下</p>
    <p class="dialogue">${escapeHtml(chosen)}</p>
    <div class="route-result">顿号把通讯器夹到行李上：<br />“走。旅店在坡下面。别急着相信最响的那个人。”</div>
    <div class="route-thread" aria-label="你的推理怎样进入调查">
      <span>你的原话</span><b>→</b><span>顿号理解</span><b>→</b><strong>第一步调查</strong>
      <i class="route-light" aria-hidden="true"></i>
    </div>
    <div class="action-area">
      <button class="primary" data-action="finish">到旅店去</button>
    </div>
    <p class="fine-print">前 90 秒交互切片到这里。下一阶段将从空保险柜开始。</p>
  `, {
    image: "./assets/guest.jpg",
    type: "guest",
    label: "顿号与客人准备离开气象站，前往旅店",
    progress: "委托成立",
  });
}

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-signal-control]")) {
    const value = Number(event.target.value);
    state.signalValue = value;
    state.signalTuned = value >= 42 && value <= 72;

    const tuner = document.querySelector("[data-tuner]");
    const copy = document.querySelector("[data-signal-copy]");
    const button = document.querySelector('[data-action="lock-signal"]');
    tuner?.style.setProperty("--signal-level", `${value}%`);
    tuner?.classList.toggle("is-locked", state.signalTuned);

    if (copy) {
      copy.textContent = state.signalTuned ? "这里，声音清楚了" : value < 42 ? "再往右一点" : "回来一点";
    }
    if (button) {
      button.disabled = !state.signalTuned;
      button.textContent = state.signalTuned ? "接入这段声音" : "继续调一调";
    }
  }

  if (event.target.id === "first-thought") {
    const count = document.querySelector("[data-count]");
    if (count) count.textContent = `${event.target.value.length} / 160`;
  }
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const inspect = button.dataset.inspect;
  const look = button.dataset.look;
  const presence = button.dataset.presence;
  const route = button.dataset.route;
  const seed = button.dataset.seed;

  if (inspect) {
    state.inspected.add(inspect);
    state.inspectLine = inspectionCopy[inspect];
    state.activeInspect = inspect;
    render();
    return;
  }

  if (look) {
    state.funSeen.add(look);
    state.inspectLine = curiosityCopy[look];
    state.activeInspect = "";
    render();
    return;
  }

  if (seed) {
    const input = document.querySelector("#first-thought");
    if (input) {
      input.value = seed;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    return;
  }

  if (presence) {
    state.repairing = false;
    beginResponse(presence);
    return;
  }

  if (route) {
    state.route = route;
    state.step = 8;
    render();
    return;
  }

  if (action === "open-device") {
    state.deviceOpen = true;
    render();
    return;
  }
  if (action === "close-device") {
    state.deviceOpen = false;
    render();
    return;
  }
  if (action === "connect") {
    state.deviceOpen = false;
    state.step = 1;
  }
  if (action === "lock-signal" && state.signalTuned) {
    state.deviceOpen = false;
    state.step = 2;
  }
  if (action === "continue-arrival") {
    state.activeInspect = "";
    state.step = 3;
  }
  if (action === "hear-case") state.step = 4;
  if (action === "invite") state.step = 5;
  if (action === "submit-thought") {
    const input = document.querySelector("#first-thought");
    const thought = input?.value.trim() || "";
    if (!thought) {
      input?.focus();
      input?.classList.add("needs-input");
      window.setTimeout(() => input?.classList.remove("needs-input"), 500);
      return;
    }
    state.repairing = false;
    beginResponse("free", thought);
    return;
  }
  if (action === "accept-reading") {
    state.step = 7;
  }
  if (action === "repair-reading") {
    state.repairing = true;
    state.step = 5;
  }
  if (action === "finish") {
    window.clearTimeout(responseTimer);
    state.step = 0;
    state.signalValue = 18;
    state.signalTuned = false;
    state.inspected.clear();
    state.funSeen.clear();
    state.inspectLine = "";
    state.activeInspect = "";
    state.deviceOpen = false;
    state.supportMode = "standard";
    state.firstThought = "";
    state.response = null;
    state.repairing = false;
    state.route = "";
  }

  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.deviceOpen) {
    state.deviceOpen = false;
    render();
  }
});

render();
