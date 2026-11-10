/* ============================================================
   软件工具库 · 交互逻辑
   - 大字搜索：关键词 + 同义词 + 用途（"清理C盘"这类）+ 错字容错
   - 二级分类：6 个分组，下面挂子分类
   ============================================================ */
(function () {
  "use strict";

  var DATA = window.TOOLBOX;
  var content = document.getElementById("content");
  var navEl = document.getElementById("nav");
  var toastEl = document.getElementById("toast");
  var qEl = document.getElementById("q");
  var kbdHint = document.getElementById("kbdHint");
  var qClear = document.getElementById("qClear");
  var hotEl = document.getElementById("hot");
  var searchbox = document.getElementById("searchbox");
  var themeBtn = document.getElementById("themeBtn");
  var sheetEl = document.getElementById("sheet");

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 980px)").matches;
  }

  if (!DATA) {
    content.innerHTML = '<div class="empty"><div class="big">😕</div><p>数据没加载出来，检查 assets/data.js 是否在。</p></div>';
    return;
  }

  var CATS = DATA.cats;
  var GROUPS = DATA.groups || [];
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });
  var APPS = DATA.apps;

  var state = { view: "all", q: "" };
  var openGroups = {};   // 分组是否展开，默认全部收起

  try {
    var initialQ = new URLSearchParams(window.location.search).get("q");
    if (initialQ) { state.q = initialQ; qEl.value = initialQ; }
  } catch (e) {}

  /* ---------- 基础工具 ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\s\-_.·、，,（）()【】\[\]]+/g, "");
  }

  function lev(a, b) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 2) return 99;
    var prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      for (j = 1; j <= lb; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }

  function isSubseq(needle, hay) {
    var i = 0;
    for (var j = 0; j < hay.length && i < needle.length; j++) {
      if (hay.charAt(j) === needle.charAt(i)) i++;
    }
    return i === needle.length && needle.length >= 3;
  }

  /* ---------- 同义词（按用途） ---------- */

  var ALIAS = {
    "截图": ["sharex", "snipaste", "截图录屏"], "截屏": ["sharex", "snipaste"],
    "录屏": ["obs", "screentogif"], "gif": ["screentogif"], "ocr": ["sharex"],
    "压缩": ["7-zip"], "解压": ["7-zip"], "rar": ["7-zip"], "压缩包": ["7-zip"],
    "播放": ["vlc", "potplayer", "mpv"], "播放器": ["vlc", "potplayer", "mpv"],
    "视频": ["vlc", "potplayer", "mpv", "shotcut", "kdenlive"],
    "电影": ["vlc", "potplayer", "mpv"], "音乐": ["musicbee", "audacity", "ardour"],
    "剪辑": ["shotcut", "kdenlive"], "下载": ["qbittorrent", "download", "localsend", "syncthing"],
    "磁力": ["qbittorrent", "bt"], "bt": ["qbittorrent"],
    "传输": ["localsend", "syncthing"], "手机": ["localsend"], "同步": ["syncthing"],
    "pdf": ["pdf"], "文档": ["libreoffice", "onlyoffice", "pandoc"],
    "办公": ["libreoffice", "onlyoffice"], "表格": ["libreoffice"],
    "字体": ["思源"], "杀毒": ["火绒"], "安全": ["火绒", "veracrypt", "bitwarden"],
    "密码": ["bitwarden", "keepassxc"], "加密": ["veracrypt", "keepassxc"],
    "清理": ["bleachbit", "dism", "wiztree"], "卸载": ["geek", "hibit"],
    "启动项": ["autoruns"], "进程": ["process explorer"],
    "看图": ["imageglass", "faststone"], "图片": ["gimp", "krita", "imageglass"],
    "修图": ["gimp", "krita"], "画图": ["inkscape", "krita", "draw.io"],
    "建模": ["blender"], "3d": ["blender"],
    "论文": ["zotero", "tex", "latex", "jabref"], "文献": ["zotero", "jabref", "calibre"],
    "笔记": ["obsidian"], "latex": ["tex", "miktex", "texstudio", "lyx"], "排版": ["tex", "typst", "scribus"],
    "远程": ["rustdesk"], "搜索": ["everything"], "u盘": ["ventoy"], "启动盘": ["ventoy"],
    "剪贴板": ["ditto"], "监控": ["trafficmonitor"], "网速": ["trafficmonitor"],
    "代码": ["vs code", "git"], "编程": ["vs code", "git"], "git": ["git", "github desktop"],
    "ai": ["cherry studio", "chatbox"], "聊天": ["cherry studio", "chatbox"],
    "备份": ["dism"], "系统": ["dism"],
    "huorong": ["火绒"], "siyuan": ["思源"], "jietu": ["sharex", "snipaste"],
    "screenshot": ["sharex", "snipaste"], "player": ["vlc", "potplayer", "mpv"],
    "music": ["musicbee"], "password": ["bitwarden", "keepassxc"], "antivirus": ["火绒"]
  };

  /* ---------- 用途（场景）匹配 ---------- */

  var USE_CASES = [
    { k: ["清理c盘", "c盘满", "c盘红", "磁盘满", "空间不够", "清理垃圾", "清垃圾", "垃圾文件"], a: ["wiztree", "dism++", "bleachbit"] },
    { k: ["手机传文件", "传文件到电脑", "手机电脑", "局域网传", "互传", "发文件到手机"], a: ["localsend", "syncthing"] },
    { k: ["pdf合并", "合并pdf", "合并多个pdf", "pdf拆分", "拆分pdf", "抽页"], a: ["pdfsam", "pdf24", "stirling"] },
    { k: ["pdf转word", "pdf转换", "pdf压缩", "压缩pdf", "pdf加水印"], a: ["pdf24", "stirling", "sumatra"] },
    { k: ["视频转gif", "做gif", "录gif", "动图"], a: ["screentogif"] },
    { k: ["识别文字", "提取文字", "图片转文字", "截图识字", "ocr"], a: ["sharex", "snipaste"] },
    { k: ["开机慢", "开机变慢", "开机启动", "开机自动启动", "启动项太多"], a: ["autoruns", "dism++"] },
    { k: ["装系统", "重装系统", "u盘装系统", "做启动盘", "系统盘"], a: ["ventoy"] },
    { k: ["远程帮人", "远程控制", "远程协助", "远程修电脑", "帮人修电脑"], a: ["rustdesk"] },
    { k: ["看视频", "看电影", "播放视频", "看片"], a: ["vlc", "potplayer", "mpv"] },
    { k: ["剪视频", "视频剪辑", "剪辑视频", "做视频"], a: ["shotcut", "kdenlive"] },
    { k: ["p图", "修图", "改图", "抠图"], a: ["gimp", "krita"] },
    { k: ["画图", "矢量图", "做logo", "画图标"], a: ["inkscape", "krita", "draw.io"] },
    { k: ["写论文", "文献管理", "引用文献", "参考文献"], a: ["zotero", "jabref"] },
    { k: ["公式", "排版论文", "写公式"], a: ["tex live", "miktex", "texstudio"] },
    { k: ["记密码", "密码太多", "密码管理", "密码忘了"], a: ["bitwarden", "keepassxc"] },
    { k: ["加密文件", "加密u盘", "文件加密"], a: ["veracrypt"] },
    { k: ["杀毒", "病毒", "中毒", "电脑中病毒"], a: ["火绒"] },
    { k: ["找文件", "搜索文件", "文件在哪", "快速搜索"], a: ["everything"] },
    { k: ["解压", "压缩文件", "打包", "解压缩"], a: ["7-zip"] },
    { k: ["缺dll", "缺少dll", "运行库", "游戏打不开", "软件打不开"], a: ["vc++", "directx", ".net"] },
    { k: ["下载bt", "磁力", "种子下载", "bt下载"], a: ["qbittorrent"] },
    { k: ["看pdf", "打开pdf", "pdf阅读"], a: ["sumatrapdf", "pdf24"] },
    { k: ["做笔记", "记笔记", "笔记软件"], a: ["obsidian"] },
    { k: ["写代码", "代码编辑器", "编程"], a: ["vs code"] },
    { k: ["录音", "降噪", "剪辑音频", "音频编辑"], a: ["audacity", "ardour"] },
    { k: ["建模", "3d建模", "渲染"], a: ["blender"] },
    { k: ["看图", "看图片", "图片浏览"], a: ["imageglass", "faststone"] },
    { k: ["剪贴板历史", "复制粘贴", "粘贴记录"], a: ["ditto"] },
    { k: ["办公", "word", "excel", "ppt", "写文档", "做表格"], a: ["libreoffice", "onlyoffice"] },
    { k: ["ai对话", "聊天ai", "大模型", "ai客户端"], a: ["cherry studio", "chatbox"] },
    { k: ["截图标注", "截图工具", "截图软件"], a: ["snipaste", "sharex"] },
    { k: ["录屏软件", "录屏幕", "录制屏幕"], a: ["obs", "screentogif"] },
    { k: ["网速监控", "看网速", "cpu监控"], a: ["trafficmonitor"] },
    { k: ["文件同步", "多设备同步"], a: ["syncthing"] },
    { k: ["卸载软件", "卸载不掉", "残留"], a: ["geek", "hibit"] },
    { k: ["隐私", "关广告", "遥测"], a: ["o&o", "shutup10"] },
    { k: ["性能分析", "进程管理", "任务管理器"], a: ["process explorer"] }
  ];

  function usecaseTerms(qn) {
    var out = [];
    for (var i = 0; i < USE_CASES.length; i++) {
      var uc = USE_CASES[i];
      for (var j = 0; j < uc.k.length; j++) {
        var k = norm(uc.k[j]);
        if (k && (qn.indexOf(k) > -1 || (qn.length >= 2 && k.indexOf(qn) === 0))) {
          out = out.concat(uc.a);
          break;
        }
      }
    }
    return out;
  }

  /* ---------- 打分 ---------- */

  function scoreApp(app, tokens) {
    var nameLower = (app.name || "").toLowerCase();
    var nameNorm = norm(app.name);
    var desc = (app.desc || "").toLowerCase();
    var tags = (app.tags || []).map(function (t) { return String(t).toLowerCase(); });
    var catIds = app.cats || [];
    var catNames = catIds.map(function (cid) { return (CAT[cid] || {}).name || ""; });
    var catLower = catNames.join(" ").toLowerCase();
    var kws = [];
    catIds.forEach(function (cid) {
      ((CAT[cid] || {}).kws || []).forEach(function (k) { kws.push(String(k).toLowerCase()); });
    });
    var linkLabels = (app.links || []).map(function (l) { return (l.label || "").toLowerCase(); });
    var hay = nameLower + " " + desc + " " + tags.join(" ") + " " + catLower + " " + kws.join(" ") + " " + linkLabels.join(" ");

    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], tn = norm(t), s = 0, j;

      if (nameLower === t) s = 120;
      else if (tn && nameNorm === tn) s = 115;
      else if (nameLower.indexOf(t) === 0) s = 100;
      else if (tn && nameNorm.indexOf(tn) === 0) s = 95;
      else if (nameLower.indexOf(t) > -1) s = 85;
      else if (tn && nameNorm.indexOf(tn) > -1) s = 80;
      else if (tags.indexOf(t) > -1) s = 70;
      else if (tags.some(function (x) { return x.indexOf(t) > -1; })) s = 60;
      else if (catLower.indexOf(t) > -1) s = 55;
      else if (kws.some(function (k) { return k.indexOf(t) > -1; })) s = 50;
      else if (desc.indexOf(t) > -1) s = 40;
      else if (linkLabels.some(function (l) { return l.indexOf(t) > -1; })) s = 30;
      else if (ALIAS[t] && ALIAS[t].some(function (x) { return hay.indexOf(x) > -1; })) s = 45;
      else if (t.length >= 3 && lev(nameNorm, tn) <= (t.length > 6 ? 2 : 1)) s = 25;
      else if (t.length >= 3 && isSubseq(tn, nameNorm)) s = 20;

      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function search(q) {
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    var qn = norm(q);
    var terms = usecaseTerms(qn);
    var out = [];

    for (var i = 0; i < APPS.length; i++) {
      var app = APPS[i];
      var s = scoreApp(app, tokens);
      var u = 0;
      if (terms.length) {
        var nameLower = (app.name || "").toLowerCase();
        var nameNorm = norm(app.name);
        for (var k = 0; k < terms.length; k++) {
          var term = terms[k].toLowerCase();
          if (nameLower.indexOf(term) > -1 || nameNorm.indexOf(norm(term)) > -1) u += 60;
        }
      }
      if (s > 0 || u > 0) out.push({ app: app, s: s + u });
    }
    out.sort(function (a, b) { return b.s - a.s || a.app.name.localeCompare(b.app.name); });
    return out;
  }

  /* ---------- 主题 ---------- */

  var KEY_THEME = "tb.theme";
  var saved = localStorage.getItem(KEY_THEME);
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");

  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY_THEME, next);
  });

  /* ---------- 卡片 ---------- */

  var MAX_LINKS = 3;

  function hl(text, q) {
    var t = String(text == null ? "" : text);
    if (!q) return esc(t);
    var lower = t.toLowerCase(), qi = lower.indexOf(q.toLowerCase());
    if (qi < 0) return esc(t);
    return esc(t.slice(0, qi)) + "<mark>" + esc(t.slice(qi, qi + q.length)) + "</mark>" + esc(t.slice(qi + q.length));
  }

  function cardHTML(app, index, q) {
    var cats = app.cats || [];
    var c = CAT[cats[0]] || { color: "#4f7cff" };
    var links = app.links || [];
    var shown = links.slice(0, MAX_LINKS);
    var rest = links.slice(MAX_LINKS);

    var chips = shown.map(function (l, i) {
      var cls = "chip arrow" + (i === 0 ? " primary" : "");
      return '<a class="' + cls + '" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(l.url) + '"><span>' + esc(l.label) + "</span></a>";
    }).join("");

    var extraChips = rest.map(function (l) {
      return '<a class="chip extra arrow" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(l.url) + '"><span>' + esc(l.label) + "</span></a>";
    }).join("");

    var moreChip = rest.length
      ? '<button class="chip more" type="button" data-more="1" data-rest="' + rest.length + '" aria-expanded="false">+' + rest.length + " 个版本</button>"
      : "";

    var tags = (app.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var hotTag = app.hot ? '<span class="tag hot">🔥 热门</span>' : "";
    var catTags = cats.slice(0, 2).map(function (cid) {
      return CAT[cid] ? '<span class="tag cat">' + esc(CAT[cid].name) + "</span>" : "";
    }).join("");

    return (
      '<article class="card" style="--c:' + esc(c.color) + ';--i:' + Math.min(index, 12) + '">' +
        '<div class="card-top">' +
          '<div class="tile" aria-hidden="true">' + (app.icon || "📦") + "</div>" +
          '<div class="card-meta"><h3 title="' + esc(app.name) + '">' + hl(app.name, q) + "</h3>" +
            '<div class="tags">' + catTags + hotTag + tags + "</div>" +
          "</div>" +
        "</div>" +
        '<p class="desc">' + hl(app.desc || "", q) + "</p>" +
        '<div class="links">' + chips + extraChips + moreChip +
          '<button class="chip copy" type="button" data-copy="' + esc(links[0] ? links[0].url : "") + '" title="复制第一个下载链接">⧉ 复制</button>' +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- 渲染 ---------- */

  /* 手机：图标宫格 */
  function cellHTML(app) {
    var cats = app.cats || [];
    var c = CAT[cats[0]] || { color: "#4f7cff" };
    return '<button class="appcell" type="button" data-app="' + esc(app.name) + '" style="--c:' + esc(c.color) + '">' +
      '<span class="cell-icon">' + (app.icon || "📦") + (app.hot ? '<span class="cell-hot">🔥</span>' : "") + "</span>" +
      '<span class="cell-name">' + esc(app.name) + "</span>" +
    "</button>";
  }

  function listHTML(items, q) {
    if (isMobile()) {
      return '<div class="appgrid">' + items.map(cellHTML).join("") + "</div>";
    }
    return '<div class="grid">' + items.map(function (a, i) { return cardHTML(a, i, q); }).join("") + "</div>";
  }

  /* 手机：底部详情面板 */
  function openSheet(app) {
    var cats = (app.cats || []).map(function (cid) { return CAT[cid]; }).filter(Boolean);
    var accent = (cats[0] || {}).color || "#4f7cff";
    var links = (app.links || []).map(function (l) {
      return '<a class="sheet-link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="sl-label">' + esc(l.label) + "</span>" +
        '<span class="sl-url">' + esc(l.url.replace(/^https?:\/\//, "").slice(0, 42)) + "</span>" +
        '<span class="sl-go">↗</span></a>';
    }).join("");

    sheetEl.innerHTML =
      '<div class="sheet-card" role="dialog" aria-modal="true">' +
        '<div class="sheet-grab"></div>' +
        '<button class="sheet-x" type="button" data-sheet-close aria-label="关闭">✕</button>' +
        '<div class="sheet-head">' +
          '<div class="sheet-icon" style="--c:' + esc(accent) + '">' + (app.icon || "📦") + "</div>" +
          "<div>" +
            "<h3>" + esc(app.name) + "</h3>" +
            '<p class="sheet-cats">' + cats.map(function (c) { return esc(c.name); }).join(" · ") + "</p>" +
          "</div>" +
        "</div>" +
        '<p class="sheet-desc">' + esc(app.desc || "") + "</p>" +
        '<div class="sheet-tags">' + (app.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
        '<div class="sheet-links">' + links + "</div>" +
        '<button class="sheet-copy" type="button" data-copy="' + esc((app.links[0] || {}).url || "") + '">⧉ 复制链接</button>' +
      "</div>";
    sheetEl.hidden = false;
    document.body.classList.add("sheet-open");
  }

  function closeSheet() {
    sheetEl.hidden = true;
    document.body.classList.remove("sheet-open");
  }

  function navItem(id, label, count, color, tip, cls) {
    var active = state.view === id ? " is-active" : "";
    return (
      '<button class="nav-item' + (cls ? " " + cls : "") + active + '" type="button" data-view="' + id + '"' + (tip ? ' title="' + esc(tip) + '"' : "") + ">" +
        '<span class="nav-dot" style="--c:' + color + '"></span>' +
        '<span class="nav-label">' + esc(label) + "</span>" +
        '<span class="nav-count">' + count + "</span>" +
      "</button>"
    );
  }

  function countByCat(id) {
    var n = 0;
    for (var i = 0; i < APPS.length; i++) if ((APPS[i].cats || []).indexOf(id) > -1) n++;
    return n;
  }

  function groupById(id) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i];
    return null;
  }

  function renderNav() {
    var html = navItem("all", "全部软件", APPS.length, "#4f7cff", "所有软件");
    html += '<div class="nav-sep"></div>';
    GROUPS.forEach(function (g) {
      var n = 0;
      g.cats.forEach(function (cid) { n += countByCat(cid); });
      html += '<div class="nav-group">';
      html += navItem("g:" + g.id, g.name, n, g.color, g.desc, "group");
      html += '<div class="nav-subs">';
      g.cats.forEach(function (cid) {
        var c = CAT[cid];
        if (!c) return;
        html += navItem(cid, c.name, countByCat(cid), c.color, c.desc, "sub");
      });
      html += "</div></div>";
    });
    navEl.innerHTML = html;
  }

  function emptyHTML(msg, hint) {
    return (
      '<div class="empty"><div class="big">🔍</div><p>' + esc(msg) + "</p>" +
      '<p class="hint">' + (hint || "试试 “清理C盘”“截图”“PDF合并”“剪视频”") + "</p></div>"
    );
  }

  function renderStats() {
    var linkCount = APPS.reduce(function (n, a) { return n + (a.links || []).length; }, 0);
    document.getElementById("stats").innerHTML =
      '<span class="stat"><b>' + APPS.length + "</b> 款软件</span>" +
      '<span class="stat"><b>' + linkCount + "</b> 个官方链接</span>" +
      '<span class="stat"><b>' + GROUPS.length + "</b> 大类 / " + CATS.length + " 小类</span>";
    document.getElementById("footApps").textContent = APPS.length;
    document.getElementById("footLinks").textContent = linkCount;
  }

  function byCatThenName(g) {
    return function (a, b) {
      var ca = 99, cb = 99, i;
      for (i = 0; i < (a.cats || []).length; i++) { var ia = g.cats.indexOf(a.cats[i]); if (ia > -1 && ia < ca) ca = ia; }
      for (i = 0; i < (b.cats || []).length; i++) { var ib = g.cats.indexOf(b.cats[i]); if (ib > -1 && ib < cb) cb = ib; }
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name);
    };
  }

  function render() {
    renderNav();
    renderStats();

    var q = state.q.trim();

    if (q) {
      var hits = search(q);
      content.innerHTML =
        '<div class="result-head">找到 <b>' + hits.length + "</b> 个 · “<b>" + esc(q) + "</b>”</div>" +
        (hits.length
          ? listHTML(hits.map(function (o) { return o.app; }), q)
          : emptyHTML("没找到 “" + q + "”", "换个说法试试：清理C盘 / 截图 / 合并PDF / 剪视频 / 杀毒"));
      return;
    }

    if (state.view === "all") {
      var anyOpen = GROUPS.some(function (g) { return !!openGroups[g.id]; });
      var bar =
        '<div class="toolbar">' +
          "<span>共 <b>" + GROUPS.length + "</b> 类 · <b>" + APPS.length + "</b> 款软件，点分类展开</span>" +
          '<button type="button" class="tb-btn" data-expand="' + (anyOpen ? "none" : "all") + '">' +
            (anyOpen ? "全部收起" : "全部展开") +
          "</button>" +
        "</div>";

      content.innerHTML = bar + GROUPS.map(function (g) {
        var items = APPS.filter(function (a) {
          return (a.cats || []).some(function (cid) { return g.cats.indexOf(cid) > -1; });
        });
        if (!items.length) return "";
        items.sort(byCatThenName(g));
        var open = !!openGroups[g.id];
        var kws = g.cats.map(function (cid) {
          return CAT[cid] ? '<span class="kw">' + esc(CAT[cid].name) + "</span>" : "";
        }).join("");
        return (
          '<section class="section' + (open ? "" : " collapsed") + '" style="--c:' + g.color + '" data-group="' + g.id + '">' +
            '<button class="section-head" type="button" data-toggle="' + g.id + '" aria-expanded="' + (open ? "true" : "false") + '">' +
              "<h2>" + esc(g.name) + "</h2>" +
              '<span class="kws">' + kws + "</span>" +
              '<span class="sec-count">' + items.length + "</span>" +
              '<span class="chev" aria-hidden="true">▾</span>' +
            "</button>" +
            (open ? listHTML(items) : "") +
          "</section>");
      }).join("");
      return;
    }

    if (state.view.indexOf("g:") === 0) {
      var g = groupById(state.view.slice(2));
      if (!g) return;
      var apps = APPS.filter(function (a) {
        return (a.cats || []).some(function (cid) { return g.cats.indexOf(cid) > -1; });
      }).sort(byCatThenName(g));
      content.innerHTML =
        '<div class="result-head"><b>' + esc(g.name) + "</b> · " + apps.length + " 个</div>" +
        listHTML(apps);
      return;
    }

    var list = APPS.filter(function (a) { return (a.cats || []).indexOf(state.view) > -1; });
    content.innerHTML =
      '<div class="result-head"><b>' + esc(CAT[state.view] ? CAT[state.view].name : "") + "</b> · " + list.length + " 个</div>" +
      (list.length
        ? listHTML(list)
        : emptyHTML("这个分类还没有软件"));
  }

  /* ---------- 热门关键词 ---------- */

  var HOT = ["清理C盘", "截图", "播放", "PDF合并", "手机传文件", "剪视频", "杀毒", "密码", "看图", "远程"];

  hotEl.innerHTML = '<span class="hot-label">试试：</span>' +
    HOT.map(function (k) { return '<button class="hot-chip" type="button" data-hot="' + esc(k) + '">' + esc(k) + "</button>"; }).join("");

  hotEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-hot]");
    if (!b) return;
    qEl.value = b.dataset.hot;
    state.q = qEl.value;
    render();
    toggleClear();
    qEl.focus();
  });

  /* ---------- 事件 ---------- */

  navEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view]");
    if (!btn) return;
    state.view = btn.dataset.view;
    state.q = "";
    qEl.value = "";
    toggleClear();
    render();
    if (window.innerWidth < 980) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  content.addEventListener("click", function (e) {
    var cellBtn = e.target.closest("[data-app]");
    if (cellBtn) {
      var nm = cellBtn.getAttribute("data-app");
      for (var ci = 0; ci < APPS.length; ci++) {
        if (APPS[ci].name === nm) { openSheet(APPS[ci]); break; }
      }
      return;
    }

    var tgBtn = e.target.closest("[data-toggle]");
    if (tgBtn) {
      var gid = tgBtn.dataset.toggle;
      openGroups[gid] = !openGroups[gid];
      render();
      var opened = document.querySelector('[data-toggle="' + gid + '"]');
      if (opened) opened.focus({ preventScroll: true });
      return;
    }

    var exBtn = e.target.closest("[data-expand]");
    if (exBtn) {
      var all = exBtn.dataset.expand === "all";
      GROUPS.forEach(function (g) { openGroups[g.id] = all; });
      render();
      return;
    }

    var moreBtn = e.target.closest("[data-more]");
    if (moreBtn) {
      var card = moreBtn.closest(".card");
      var open = card.classList.toggle("open");
      moreBtn.setAttribute("aria-expanded", String(open));
      moreBtn.textContent = open ? "收起" : "+" + moreBtn.dataset.rest + " 个版本";
    }
  });

  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) copyText(c.getAttribute("data-copy"));
  });

  var fcBtn = document.getElementById("fcBtn");
  var fcPop = document.getElementById("fcPop");
  if (fcBtn && fcPop) {
    fcBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      fcPop.hidden = !fcPop.hidden;
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".float-contact")) fcPop.hidden = true;
    });
  }

  if (sheetEl) {
    sheetEl.addEventListener("click", function (e) {
      if (e.target === sheetEl || e.target.closest("[data-sheet-close]")) closeSheet();
    });
  }

  function toggleClear() {
    qClear.hidden = !qEl.value;
    kbdHint.style.opacity = qEl.value ? "0" : "1";
  }

  var timer;
  qEl.addEventListener("input", function () {
    toggleClear();
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.q = qEl.value;
      render();
    }, 60);
  });

  qClear.addEventListener("click", function () {
    qEl.value = "";
    state.q = "";
    toggleClear();
    render();
    qEl.focus();
  });

  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "Escape" && sheetEl && !sheetEl.hidden) { closeSheet(); return; }
    if (e.key === "/" && !typing) {
      e.preventDefault();
      searchbox.scrollIntoView({ behavior: "smooth", block: "center" });
      qEl.focus();
      qEl.select();
    } else if (e.key === "Escape" && typing) {
      qEl.value = "";
      state.q = "";
      toggleClear();
      render();
      qEl.blur();
    }
  });

  /* ---------- 复制 ---------- */

  function copyText(text) {
    if (!text) return;
    var done = function () { showToast("已复制：" + shorten(text)); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); cb(); } catch (e) { showToast("复制失败，请手动复制"); }
    document.body.removeChild(ta);
  }

  function shorten(url) {
    return url.replace(/^https?:\/\//, "").slice(0, 46) + (url.length > 54 ? "…" : "");
  }

  var toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1900);
  }

  /* ---------- 顶栏吸附 ---------- */

  var topbar = document.querySelector(".topbar");
  window.addEventListener("scroll", function () {
    topbar.classList.toggle("is-stuck", window.scrollY > 8);
  }, { passive: true });

  /* 窗口尺寸跨断点时重渲染（桌面卡片 ↔ 手机宫格） */
  var lastMobile = isMobile();
  window.addEventListener("resize", function () {
    var m = isMobile();
    if (m !== lastMobile) { lastMobile = m; render(); }
  });

  render();
  toggleClear();
})();
