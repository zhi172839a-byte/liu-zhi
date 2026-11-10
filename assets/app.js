/* ============================================================
   软件工具库 · 交互逻辑
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

  var KEY_FAV = "tb.favs";
  var KEY_THEME = "tb.theme";
  var KEY_CUSTOM = "tb.custom";

  var state = {
    view: "all", // all | fav | mine | 分类 id
    q: "",
    favs: new Set(readJSON(KEY_FAV) || []),
  };

  var customApps = readJSON(KEY_CUSTOM) || [];
  var APPS = [];

  /* ---------- 工具函数 ---------- */

  function readJSON(k) {
    try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; }
  }
  function writeJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function uid() {
    return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function saveCustom() { writeJSON(KEY_CUSTOM, customApps); }

  function rebuild() {
    APPS = DATA.apps
      .map(function (a) { return Object.assign({}, a, { _key: "b:" + a.cat + "::" + a.name, custom: false }); })
      .concat(customApps.map(function (a) {
        return Object.assign({}, a, { _key: "c:" + a.id, custom: true });
      }));
  }
  rebuild();

  /* ---------- 主题 ---------- */

  var savedTheme = localStorage.getItem(KEY_THEME);
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = savedTheme || (prefersDark ? "dark" : "light");

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
    if (state.view === "fav") list = list.filter(function (a) { return state.favs.has(a._key); });
    else if (state.view === "mine") list = list.filter(function (a) { return a.custom; });
    else if (state.view !== "all") list = list.filter(function (a) { return a.cat === state.view; });
    if (q) list = list.filter(function (a) { return matches(a, q); });
    return list;
  }

  /* ---------- 卡片 ---------- */

  var MAX_LINKS = 3;

  function cardHTML(app, index) {
    var c = CAT[app.cat] || { color: "#4f7cff", name: "未分类" };
    var fav = state.favs.has(app._key);
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
      ? '<button class="chip more" type="button" data-more="' + esc(app._key) + '" data-rest="' + rest.length + '" aria-expanded="false">+' + rest.length + " 个版本</button>"
      : "";

    var actions = app.custom
      ? '<button class="chip act" type="button" data-edit="' + esc(app._key) + '" title="编辑">✎ 编辑</button>' +
        '<button class="chip act danger" type="button" data-del="' + esc(app._key) + '" title="删除">✕ 删除</button>'
      : "";

    var tags = (app.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var catTag = '<span class="tag cat">' + esc(c.name) + "</span>";

    return (
      '<article class="card' + (rest.length ? " has-more" : "") + (app.custom ? " is-custom" : "") + '" data-key="' + esc(app._key) + '" style="--c:' + esc(c.color) + ';--i:' + Math.min(index, 12) + '">' +
        '<div class="card-top">' +
          '<div class="tile" aria-hidden="true">' + (app.icon || "📦") + "</div>" +
          '<div class="card-meta"><h3 title="' + esc(app.name) + '">' + esc(app.name) + "</h3>" +
            '<div class="tags">' + catTag + tags + "</div>" +
          "</div>" +
          '<button class="star' + (fav ? " on" : "") + '" type="button" data-fav="' + esc(app._key) + '" aria-pressed="' + fav + '" aria-label="收藏 ' + esc(app.name) + '" title="' + (fav ? "取消收藏" : "收藏") + '">★</button>' +
        "</div>" +
        '<p class="desc">' + esc(app.desc || "自己添加的软件") + "</p>" +
        '<div class="links">' + chips + extraChips + moreChip +
          '<button class="chip copy" type="button" data-copy="' + esc(links[0] ? links[0].url : "") + '" title="复制第一个下载链接">⧉ 复制</button>' +
          actions +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- 渲染 ---------- */

  function navItem(id, label, count, glyph, color) {
    var active = state.view === id ? " is-active" : "";
    var dot = glyph
      ? '<span class="nav-ico" style="color:' + color + '">' + glyph + "</span>"
      : '<span class="nav-dot" style="--c:' + color + '"></span>';
    return (
      '<button class="nav-item' + active + '" type="button" data-view="' + id + '">' +
        dot + '<span class="nav-label">' + esc(label) + "</span>" +
        '<span class="nav-count">' + count + "</span>" +
      "</button>"
    );
  }

  function renderNav() {
    var html = "";
    html += navItem("all", "全部软件", APPS.length, "▦", "#4f7cff");
    html += navItem("fav", "我的收藏", state.favs.size, "★", "#f5a524");
    if (customApps.length) html += navItem("mine", "我添加的", customApps.length, "＋", "#22c55e");
    html += '<div class="nav-sep"></div>';
    CATS.forEach(function (c) {
      html += navItem(c.id, c.name, countByCat(c.id), "", c.color);
    });
    navEl.innerHTML = html;
  }

  function emptyHTML(msg) {
    return (
      '<div class="empty"><div class="big">🔍</div><p>' + esc(msg) + "</p>" +
      '<p class="hint">试试 “压缩”“字体”“Blender”，或者点「＋ 添加软件」自己加一个</p></div>'
    );
  }

  function render() {
    if (state.view === "mine" && !customApps.length) state.view = "all";
    renderNav();

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
    } else if (state.view === "fav") {
      head = '<div class="result-head"><b>我的收藏</b> · ' + list.length + " 个</div>";
    } else if (state.view === "mine") {
      head = '<div class="result-head"><b>我添加的</b> · ' + list.length + " 个 <span class='muted'>（只存在这台电脑）</span></div>";
    } else {
      head = '<div class="result-head"><b>' + esc(CAT[state.view].name) + "</b> · " + list.length + " 个</div>";
    }

    content.innerHTML = head + (list.length
      ? '<div class="grid">' + list.map(cardHTML).join("") + "</div>"
      : emptyHTML(q ? "没找到匹配的软件" : "还没有收藏，点卡片右上角的 ★ 试试"));
  }

  /* ---------- 导航 / 卡片事件 ---------- */

  navEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view]");
    if (!btn) return;
    state.view = btn.dataset.view;
    render();
    if (window.innerWidth < 980) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  content.addEventListener("click", function (e) {
    var star = e.target.closest("[data-fav]");
    if (star) {
      var key = star.dataset.fav;
      if (state.favs.has(key)) state.favs.delete(key);
      else state.favs.add(key);
      writeJSON(KEY_FAV, Array.from(state.favs));
      render();
      return;
    }

    var copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) { copyText(copyBtn.dataset.copy); return; }

    var moreBtn = e.target.closest("[data-more]");
    if (moreBtn) {
      var card = moreBtn.closest(".card");
      var open = card.classList.toggle("open");
      moreBtn.setAttribute("aria-expanded", String(open));
      moreBtn.textContent = open ? "收起" : "+" + moreBtn.dataset.rest + " 个版本";
      return;
    }

    var editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      var id = editBtn.dataset.edit.replace(/^c:/, "");
      var target = customApps.filter(function (a) { return a.id === id; })[0];
      if (target) openModal(target);
      return;
    }

    var delBtn = e.target.closest("[data-del]");
    if (delBtn) {
      var did = delBtn.dataset.del.replace(/^c:/, "");
      var item = customApps.filter(function (a) { return a.id === did; })[0];
      if (!item) return;
      if (!window.confirm("删除「" + item.name + "」？只删自己添加的，原版 52 个不受影响。")) return;
      customApps = customApps.filter(function (a) { return a.id !== did; });
      saveCustom();
      rebuild();
      render();
      showToast("已删除：" + item.name);
    }
  });

  /* ---------- 搜索 ---------- */

  var timer;
  qEl.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.q = qEl.value;
      render();
      kbdHint.style.opacity = qEl.value ? "0" : "1";
    }, 70);
  });

  /* ---------- 弹窗 ---------- */

  var modal = document.getElementById("modal");
  var form = document.getElementById("appForm");
  var catSelect = document.getElementById("catSelect");
  var modalTitle = document.getElementById("modalTitle");
  var modalNote = document.getElementById("modalNote");
  var saveBtn = document.getElementById("saveBtn");
  var editingId = null;

  CATS.forEach(function (c) {
    var o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    catSelect.appendChild(o);
  });

  function openModal(app) {
    editingId = app ? app.id : null;
    modalTitle.textContent = app ? "编辑软件" : "添加软件";
    saveBtn.textContent = app ? "保存修改" : "保存";
    form.reset();

    if (app) {
      form.name.value = app.name || "";
      form.cat.value = app.cat || CATS[0].id;
      form.url.value = (app.links[0] || {}).url || "";
      form.desc.value = app.desc || "";
      form.icon.value = app.icon && app.icon !== "📦" ? app.icon : "";
      form.tags.value = (app.tags || []).join(", ");
      form.extra.value = (app.links.slice(1) || []).map(function (l) { return l.label + "|" + l.url; }).join("\n");
    } else {
      form.cat.value = CAT[state.view] ? state.view : CATS[0].id;
    }

    modalNote.textContent = customApps.length
      ? "你已添加 " + customApps.length + " 个软件，只保存在这台电脑的浏览器里。想带走就点「导出我的添加」。"
      : "添加的软件只存在这台电脑的浏览器里；换电脑或发给别人时，用「导出 / 导入」。";

    modal.hidden = false;
    document.body.classList.add("modal-open");
    setTimeout(function () { form.name.focus(); }, 40);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    editingId = null;
  }

  document.getElementById("addBtn").addEventListener("click", function () { openModal(null); });

  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) { closeModal(); return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing && modal.hidden) {
      e.preventDefault();
      qEl.focus();
      qEl.select();
    } else if (e.key === "Escape" && typing && modal.hidden) {
      qEl.value = "";
      state.q = "";
      render();
      qEl.blur();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var name = String(fd.get("name") || "").trim();
    var url = String(fd.get("url") || "").trim();
    if (!name || !url) return;

    var links = [{ label: "官网 / 主页", url: url }];
    String(fd.get("extra") || "").split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split("|");
      var u = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      var label = parts.length > 1 ? parts[0].trim() : "链接 " + (links.length + 1);
      if (/^https?:\/\//i.test(u)) links.push({ label: label, url: u });
    });

    var tags = String(fd.get("tags") || "").split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var item = {
      id: editingId || uid(),
      name: name,
      cat: String(fd.get("cat") || CATS[0].id),
      icon: String(fd.get("icon") || "").trim() || "📦",
      desc: String(fd.get("desc") || "").trim(),
      tags: tags,
      links: links,
    };

    if (editingId) {
      customApps = customApps.map(function (a) { return a.id === editingId ? item : a; });
      showToast("已保存：" + name);
    } else {
      customApps.push(item);
      showToast("已添加：" + name);
      state.view = "mine";
    }

    saveCustom();
    rebuild();
    render();
    closeModal();
  });

  /* ---------- 导出 / 导入 ---------- */

  document.getElementById("exportBtn").addEventListener("click", function () {
    if (!customApps.length) { showToast("还没有添加过软件"); return; }
    var blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), apps: customApps }, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "我的软件库-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    showToast("已导出 " + customApps.length + " 个");
  });

  var importFile = document.getElementById("importFile");
  document.getElementById("importBtn").addEventListener("click", function () { importFile.click(); });

  importFile.addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var j = JSON.parse(String(reader.result));
        var arr = Array.isArray(j) ? j : j.apps;
        if (!Array.isArray(arr)) throw new Error("bad");
        var n = 0;
        arr.forEach(function (raw) {
          if (!raw || !raw.name || !raw.links || !raw.links.length) return;
          var item = {
            id: raw.id || uid(),
            name: String(raw.name).slice(0, 40),
            cat: CAT[raw.cat] ? raw.cat : CATS[0].id,
            icon: raw.icon || "📦",
            desc: raw.desc || "",
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            links: raw.links.filter(function (l) { return l && l.url; }),
          };
          var i = customApps.findIndex(function (a) { return a.id === item.id; });
          if (i >= 0) customApps[i] = item;
          else customApps.push(item);
          n++;
        });
        saveCustom();
        rebuild();
        render();
        showToast("导入完成：" + n + " 个");
      } catch (err) {
        showToast("文件格式不对，应该是导出的 JSON");
      }
    };
    reader.readAsText(f, "utf-8");
    this.value = "";
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

  /* ---------- 统计 ---------- */

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

  var _render = render;
  render = function () { renderStats(); _render(); };

  render();
})();
