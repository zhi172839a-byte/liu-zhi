/* ============================================================
   软件工具库 · 交互逻辑（纯展示版：无添加、无收藏）
   ============================================================ */
(function () {
  "use strict";

  var DATA = window.TOOLBOX;
  var content = document.getElementById("content");
  var navEl = document.getElementById("nav");
  var toastEl = document.getElementById("toast");
  var qEl = document.getElementById("q");
  var kbdHint = document.getElementById("kbdHint");
  var themeBtn = document.getElementById("themeBtn");

  if (!DATA) {
    content.innerHTML = '<div class="empty"><div class="big">😕</div><p>数据没加载出来，检查 assets/data.js 是否在。</p></div>';
    return;
  }

  var CATS = DATA.cats;
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });
  var APPS = DATA.apps;

  var state = { view: "all", q: "" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
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

  /* ---------- 筛选 ---------- */

  function countByCat(id) {
    return APPS.filter(function (a) { return a.cat === id; }).length;
  }

  function matches(app, q) {
    var c = CAT[app.cat] || { name: "" };
    var hay = (app.name + " " + (app.desc || "") + " " + (app.tags || []).join(" ") + " " + c.name).toLowerCase();
    if (hay.indexOf(q) !== -1) return true;
    return (app.links || []).some(function (l) {
      return (l.label + " " + l.url).toLowerCase().indexOf(q) !== -1;
    });
  }

  function currentList() {
    var q = state.q.trim().toLowerCase();
    var list = APPS;
    if (state.view !== "all") list = list.filter(function (a) { return a.cat === state.view; });
    if (q) list = list.filter(function (a) { return matches(a, q); });
    return list;
  }

  /* ---------- 卡片 ---------- */

  var MAX_LINKS = 3;

  function cardHTML(app, index) {
    var c = CAT[app.cat] || { color: "#4f7cff", name: "未分类" };
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
      ? '<button class="chip more" type="button" data-more="' + esc(app.cat + "::" + app.name) + '" data-rest="' + rest.length + '" aria-expanded="false">+' + rest.length + " 个版本</button>"
      : "";

    var tags = (app.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var catTag = '<span class="tag cat">' + esc(c.name) + "</span>";

    return (
      '<article class="card" data-key="' + esc(app.cat + "::" + app.name) + '" style="--c:' + esc(c.color) + ';--i:' + Math.min(index, 12) + '">' +
        '<div class="card-top">' +
          '<div class="tile" aria-hidden="true">' + (app.icon || "📦") + "</div>" +
          '<div class="card-meta"><h3 title="' + esc(app.name) + '">' + esc(app.name) + "</h3>" +
            '<div class="tags">' + catTag + tags + "</div>" +
          "</div>" +
        "</div>" +
        '<p class="desc">' + esc(app.desc || "") + "</p>" +
        '<div class="links">' + chips + extraChips + moreChip +
          '<button class="chip copy" type="button" data-copy="' + esc(links[0] ? links[0].url : "") + '" title="复制第一个下载链接">⧉ 复制</button>' +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- 渲染 ---------- */

  function navItem(id, label, count, color) {
    var active = state.view === id ? " is-active" : "";
    return (
      '<button class="nav-item' + active + '" type="button" data-view="' + id + '">' +
        '<span class="nav-dot" style="--c:' + color + '"></span>' +
        '<span class="nav-label">' + esc(label) + "</span>" +
        '<span class="nav-count">' + count + "</span>" +
      "</button>"
    );
  }

  function renderNav() {
    var html = navItem("all", "全部软件", APPS.length, "#4f7cff");
    html += '<div class="nav-sep"></div>';
    CATS.forEach(function (c) {
      html += navItem(c.id, c.name, countByCat(c.id), c.color);
    });
    navEl.innerHTML = html;
  }

  function emptyHTML(msg) {
    return (
      '<div class="empty"><div class="big">🔍</div><p>' + esc(msg) + "</p>" +
      '<p class="hint">试试 “压缩”“字体”“Blender”，或者点左边的分类</p></div>'
    );
  }

  function renderStats() {
    var linkCount = APPS.reduce(function (n, a) { return n + (a.links || []).length; }, 0);
    document.getElementById("stats").innerHTML =
      '<span class="stat"><b>' + APPS.length + "</b> 款软件</span>" +
      '<span class="stat"><b>' + linkCount + "</b> 个官方链接</span>" +
      '<span class="stat"><b>' + CATS.length + "</b> 个分类</span>" +
      '<span class="stat">全部免费 / 开源 · 无需破解</span>';
    document.getElementById("footApps").textContent = APPS.length;
    document.getElementById("footLinks").textContent = linkCount;
  }

  function render() {
    renderNav();
    renderStats();

    var list = currentList();
    var q = state.q.trim();

    if (state.view === "all" && !q) {
      var sections = CATS.map(function (c) {
        var items = list.filter(function (a) { return a.cat === c.id; });
        if (!items.length) return "";
        return (
          '<section class="section" style="--c:' + c.color + '">' +
            '<div class="section-head"><h2>' + esc(c.name) + "</h2>" +
              '<span class="sec-desc">' + esc(c.desc) + "</span>" +
              '<span class="sec-count">' + items.length + "</span>" +
            "</div>" +
            '<div class="grid">' + items.map(cardHTML).join("") + "</div>" +
          "</section>"
        );
      }).join("");
      content.innerHTML = sections || emptyHTML("这个分类还没有软件");
      return;
    }

    var head;
    if (q) {
      head = '<div class="result-head">搜索 “<b>' + esc(q) + '</b>” · 找到 <b>' + list.length + "</b> 个</div>";
    } else {
      head = '<div class="result-head"><b>' + esc(CAT[state.view].name) + "</b> · " + list.length + " 个</div>";
    }

    content.innerHTML = head + (list.length
      ? '<div class="grid">' + list.map(cardHTML).join("") + "</div>"
      : emptyHTML(q ? "没找到匹配的软件" : "这个分类还没有软件"));
  }

  /* ---------- 事件 ---------- */

  navEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view]");
    if (!btn) return;
    state.view = btn.dataset.view;
    render();
    if (window.innerWidth < 980) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  content.addEventListener("click", function (e) {
    var moreBtn = e.target.closest("[data-more]");
    if (moreBtn) {
      var card = moreBtn.closest(".card");
      var open = card.classList.toggle("open");
      moreBtn.setAttribute("aria-expanded", String(open));
      moreBtn.textContent = open ? "收起" : "+" + moreBtn.dataset.rest + " 个版本";
    }
  });

  /* 全局复制（顶栏/页脚/悬浮按钮的号码、微信也能用） */
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) copyText(c.getAttribute("data-copy"));
  });

  /* 悬浮「有事找我」 */
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

  var timer;
  qEl.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.q = qEl.value;
      render();
      kbdHint.style.opacity = qEl.value ? "0" : "1";
    }, 70);
  });

  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) {
      e.preventDefault();
      qEl.focus();
      qEl.select();
    } else if (e.key === "Escape" && typing) {
      qEl.value = "";
      state.q = "";
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

  render();
})();
