/* My Digital Library by Robiul Hosen — Phase 1
   Client-side only. All book data comes from data/books.json (real catalog).
   No fake data: missing fields show "তথ্য নেই". Reviews are public via
   GitHub Discussions (Giscus) — one discussion thread per book. */
(function () {
  "use strict";

  var view = document.getElementById("view");
  var BOOKS = [];
  var PER_PAGE = 12;
  var state = { q: "", title: "", author: "", category: "", language: "", year: "",
                sort: "az", page: 1 };
  var NA = "তথ্য নেই";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* Download-button label from the real file type + size. Plain .txt
     files open inside the browser instead of downloading, so they are
     honestly labelled "টেক্সট পড়ুন", not "ডাউনলোড". */
  function fmtSize(bytes) {
    if (!bytes) return "";
    var mb = bytes / 1048576;
    var txt = mb >= 1
      ? mb.toLocaleString("bn-BD", { maximumFractionDigits: 1 }) + " MB"
      : Math.max(1, Math.round(bytes / 1024)).toLocaleString("bn-BD") + " KB";
    return " (" + txt + ")";
  }
  function dlLabel(b) {
    var fmt = b.downloadFormat || "";
    if (fmt === "PDF") return "PDF ডাউনলোড ⬇" + fmtSize(b.downloadSize);
    if (fmt === "EPUB") return "EPUB ডাউনলোড ⬇" + fmtSize(b.downloadSize);
    if (fmt === "TXT") return "টেক্সট পড়ুন ↗";
    return "PDF / টেক্সট ডাউনলোড ⬇";
  }
  /* Card price: removed 2026-11-21 at the owner's request — the OCR-extracted
     printed prices were mostly wrong, so no price is shown anywhere. */
  function cardPrice(b) {
    return "";
  }
  function firstLetter(t) {
    t = (t || "").trim();
    return t ? t.charAt(0) : "?";
  }
  function langLabel(l) {
    return l === "Bengali" ? "বাংলা" : l === "English" ? "English" : (l || NA);
  }
  function byId(id) { return BOOKS.find(function (b) { return b.id === id; }); }

  /* ---------- share (no account needed) ----------
     Phone: the native share sheet (Facebook, Instagram, WhatsApp and
     everything installed). Desktop/other browsers: a small panel with
     direct share links + copy link. Instagram has no web share link,
     so it is reached through the phone's native sheet or copy link. */
  function siteUrl() { return location.origin + location.pathname + "#/"; }
  function bookUrl(b) { return location.origin + location.pathname + "#/book/" + encodeURIComponent(b.id); }
  function sharePanelHtml(title, text, url) {
    var u = encodeURIComponent(url);
    var t = encodeURIComponent(title + " — " + text);
    return '<div class="share-panel" hidden>' +
      '<a class="share-opt" href="https://www.facebook.com/sharer/sharer.php?u=' + u + '" target="_blank" rel="noopener">ফেসবুক</a>' +
      '<a class="share-opt" href="https://wa.me/?text=' + t + "%20" + u + '" target="_blank" rel="noopener">হোয়াটসঅ্যাপ</a>' +
      '<a class="share-opt" href="https://t.me/share/url?url=' + u + "&text=" + t + '" target="_blank" rel="noopener">টেলিগ্রাম</a>' +
      '<a class="share-opt" href="https://twitter.com/intent/tweet?text=' + t + "&url=" + u + '" target="_blank" rel="noopener">এক্স (X)</a>' +
      '<button class="share-opt" type="button" data-copy="' + esc(url) + '">লিংক কপি করুন</button>' +
      '<p class="small muted">ইনস্টাগ্রামে শেয়ার করতে লিংক কপি করে ইনস্টাগ্রাম অ্যাপে পেস্ট করুন, অথবা ফোনের শেয়ার মেনু থেকে ইনস্টাগ্রাম বেছে নিন।</p></div>';
  }
  function doShare(title, text, url, panel) {
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
    } else if (panel) {
      panel.hidden = !panel.hidden;
    }
  }

  /* ---------- bookmarks (saved on the phone, no login) ---------- */
  var FAV_KEY = "mdl-favs";
  function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function isFav(id) { return getFavs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var favs = getFavs();
    var i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
    return i === -1;
  }

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById("themeBtn");
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("mdl-theme", t); } catch (e) {}
    themeBtn.textContent = t === "dark" ? "☀️ লাইট" : "🌙 ডার্ক";
  }
  try {
    var saved = localStorage.getItem("mdl-theme");
    if (saved) setTheme(saved); else setTheme("light");
  } catch (e) { setTheme("light"); }
  themeBtn.addEventListener("click", function () {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  document.getElementById("menuBtn").addEventListener("click", function () {
    document.getElementById("topnav").classList.toggle("open");
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- data ---------- */
  function loadBooks() {
    return fetch("data/books.json").then(function (r) {
      if (!r.ok) throw new Error("books.json লোড হয়নি");
      return r.json();
    }).then(function (data) {
      BOOKS = data;
      route();
    }).catch(function () {
      view.innerHTML = '<p class="empty">দুঃখিত, বইয়ের তালিকা লোড করা যায়নি। পরে আবার চেষ্টা করুন।</p>';
    });
  }

  /* ---------- shared pieces ---------- */
  function coverHtml(b, big) {
    var cls = "cover" + (big ? " big" : "") + (b.coverUrl ? " has-img" : "");
    var img = b.coverUrl
      ? '<img class="cover-img" src="' + esc(b.coverUrl) + '" alt="' + esc(b.title) + ' বইয়ের প্রচ্ছদ" loading="lazy" onerror="this.remove()">'
      : "";
    return '<div class="' + cls + '">' + img +
      '<span class="letter">' + esc(firstLetter(b.title)) + "</span>" +
      '<span class="cover-lang">' + esc(langLabel(b.language)) + "</span></div>";
  }
  function cardHtml(b) {
    var tags = '<span class="tag">' + esc(langLabel(b.language)) + "</span>" +
      '<span class="tag">' + esc(b.category || "অন্যান্য") + "</span>" +
      (b.downloadUrl
        ? '<span class="tag free">ফ্রি ডাউনলোড</span>'
        : '<span class="tag nodl">শুধু অনলাইনে পড়ুন</span>');
    return '<article class="book-card" data-book="' + esc(b.id) + '">' +
      (b.topRank ? '<span class="rank-badge">' + b.topRank.toLocaleString("bn-BD") + "</span>" : "") +
      '<button class="fav-btn' + (isFav(b.id) ? " on" : "") + '" data-fav="' + esc(b.id) + '" aria-label="পছন্দের বই">' + (isFav(b.id) ? "★" : "☆") + "</button>" +
      coverHtml(b) +
      '<div class="book-body"><h3>' + esc(b.title) + "</h3>" +
      '<p class="author">' + esc(b.author || NA) + "</p>" +
      cardPrice(b) +
      '<div class="book-meta">' + tags + "</div></div></article>";
  }
  function gridHtml(list) {
    if (!list.length) return '<p class="empty">কোনো বই পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজুন।</p>';
    return '<div class="book-grid">' + list.map(cardHtml).join("") + "</div>";
  }
  function adSlotHtml() {
    return '<div class="ad-slot ad-tib"><span>ADVERTISEMENT</span>' +
      '<a href="https://www.facebook.com/61560391032591" target="_blank" rel="noopener">' +
      '<img src="assets/tib-perfumes-logo.png" alt="Tīb Perfumes">' +
      '<span class="ad-tib-text"><b>খাঁটি আতর — Tīb Perfumes</b>' +
      '<br>৩ মিলি আতর মাত্র ১২০৳ থেকে · অর্ডার করতে ক্লিক করুন</span></a></div>';
  }
  function heroHtml() {
    return '<section class="hero" style="margin:0 -16px;padding-left:16px;padding-right:16px;">' +
      '<span class="eyebrow">A WORLD OF KNOWLEDGE, ONE LIBRARY</span>' +
      "<h1>জ্ঞান অন্বেষণের<br><em>নতুন ঠিকানা</em></h1>" +
      "<p>বাংলা থেকে বিশ্বসাহিত্য — বই খুঁজুন, বই সম্পর্কে জানুন এবং বৈধ উৎস থেকে পড়ুন বা ডাউনলোড করুন।</p>" +
      '<form class="search-big" id="heroSearch">' +
      '<input id="heroQ" type="search" placeholder="বইয়ের নাম, লেখক বা বিষয় লিখুন..." autocomplete="off">' +
      '<button class="btn btn-primary" type="submit">খুঁজুন</button></form>' +
      '<div class="hero-share"><button class="btn btn-ghost" id="shareSiteBtn" type="button">লাইব্রেরি শেয়ার করুন ↗</button></div>' +
      '<div id="siteSharePanel"></div>' +
      '<button class="adv-toggle" id="advToggle" type="button">উন্নত অনুসন্ধান (Advanced Search) ⌄</button>' +
      '<div class="filters adv-panel" id="advPanel">' +
      '<div><label>বইয়ের নাম</label><input id="fTitle" type="text" placeholder="শিরোনাম"></div>' +
      '<div><label>লেখক</label><input id="fAuthor" type="text" placeholder="লেখকের নাম"></div>' +
      '<div><label>বিভাগ</label><select id="fCategory"></select></div>' +
      '<div><label>ভাষা</label><select id="fLanguage"></select></div>' +
      '<div><label>প্রকাশের বছর</label><input id="fYear" type="number" min="1000" max="2026" placeholder="যেমন ১৯৪১"></div>' +
      '<div><label>&nbsp;</label><button class="btn btn-navy" id="advGo" type="button">অনুসন্ধান করুন</button></div>' +
      "</div></section>";
  }

  /* ---------- home ---------- */
  function renderHome() {
    var total = BOOKS.length;
    var bn = BOOKS.filter(function (b) { return b.language === "Bengali"; }).length;
    var en = BOOKS.filter(function (b) { return b.language === "English"; }).length;
    var free = BOOKS.filter(function (b) { return b.downloadUrl; }).length;
    var top = BOOKS.filter(function (b) { return b.topRank; }).sort(function (a, b) { return a.topRank - b.topRank; }).slice(0, 12);
    var featured = BOOKS.filter(function (b) { return b.featured; }).slice(0, 12);
    var recent = BOOKS.slice().sort(function (a, b) { return b.addedOrder - a.addedOrder; }).slice(0, 12);
    var counts = {};
    BOOKS.forEach(function (b) {
      var a = (b.author || "").trim();
      if (a && a !== NA) counts[a] = (counts[a] || 0) + 1;
    });
    var authors = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 10);
    var cats = categoryCounts();

    var h = heroHtml() + adSlotHtml();
    h += '<section class="block"><div class="stats">' +
      '<div class="stat"><b>' + total.toLocaleString("bn-BD") + '</b><span>মোট বই</span></div>' +
      '<div class="stat"><b>' + bn.toLocaleString("bn-BD") + '</b><span>বাংলা বই</span></div>' +
      '<div class="stat"><b>' + en.toLocaleString("bn-BD") + '</b><span>ইংরেজি বই</span></div>' +
      '<div class="stat"><b>' + free.toLocaleString("bn-BD") + '</b><span>ফ্রি ডাউনলোডযোগ্য</span></div>' +
      "</div></section>";

    h += '<section class="block"><div class="section-head"><h2>টপ বই</h2><a class="link" href="#/books?sort=top">সব দেখুন →</a></div><p class="muted">সবচেয়ে বেশি ডাউনলোড হওয়া বই — ১ নম্বর সবচেয়ে জনপ্রিয়।</p>' + gridHtml(top) + "</section>";
    h += '<section class="block"><div class="section-head"><h2>বিশেষভাবে নির্বাচিত বই</h2><a class="link" href="#/books">সব বই দেখুন →</a></div>' + gridHtml(featured) + "</section>";
    h += '<section class="block"><div class="section-head"><h2>সম্প্রতি যুক্ত বই</h2><a class="link" href="#/books?sort=newest">সব দেখুন →</a></div>' + gridHtml(recent) + "</section>";
    var favs = BOOKS.filter(function (b) { return isFav(b.id); });
    if (favs.length) {
      h += '<section class="block"><div class="section-head"><h2>পছন্দের বই</h2></div><p class="muted">আপনার ফোনে সংরক্ষিত — লগইন লাগে না।</p>' + gridHtml(favs) + "</section>";
    }
    h += '<section class="block"><div class="section-head"><h2>জনপ্রিয় লেখক</h2><a class="link" href="#/authors">সব লেখক →</a></div><div class="author-list">' +
      authors.map(function (a) {
        return '<div class="author-item" data-author="' + esc(a) + '"><b>' + esc(a) + "</b><span>" + counts[a].toLocaleString("bn-BD") + "টি বই</span></div>";
      }).join("") + "</div></section>";
    h += '<section class="block"><div class="section-head"><h2>বিভাগ</h2><a class="link" href="#/categories">সব বিভাগ →</a></div><div class="chip-grid">' +
      cats.map(function (c) {
        return '<button class="chip" data-cat="' + esc(c.name) + '">' + esc(c.name) + " <small>(" + c.n.toLocaleString("bn-BD") + ")</small></button>";
      }).join("") + "</div></section>";
    h += '<section class="block"><div class="section-head"><h2>ভাষা</h2></div><div class="chip-grid">' +
      '<button class="chip" data-lang="Bengali">বাংলা <small>(' + bn.toLocaleString("bn-BD") + ")</small></button>" +
      '<button class="chip" data-lang="English">English <small>(' + en.toLocaleString("bn-BD") + ")</small></button>" +
      "</div></section>";
    h += '<section class="block"><div class="section-head"><h2>ফ্রি ও বৈধ বই</h2></div>' +
      "<p>এই লাইব্রেরির <b>" + free.toLocaleString("bn-BD") + "টি</b> বই Internet Archive ও Standard Ebooks থেকে বৈধভাবে ফ্রি ডাউনলোড করা যায়। কপিরাইটযুক্ত বইয়ের ক্ষেত্রে শুধু অনুমোদিত পড়া, ধার বা কেনার লিংক দেওয়া হয় — PDF দেওয়া হয় না।</p></section>";

    view.innerHTML = h;
    bindHome();
  }

  function categoryCounts() {
    var order = ["Bangladesh Studies", "Chattogram Studies", "Chandanaish Studies",
      "World History", "Bangladesh History", "Islamic Studies", "Religion & Philosophy",
      "Political Science", "International Relations", "Economics", "Sociology",
      "Literature", "Poetry", "Novels", "Short Stories", "Biography & Autobiography",
      "Science", "Technology", "Computer Science", "Mathematics", "Physics", "Chemistry",
      "Biology", "Geography", "Environment", "Education", "Psychology", "Law",
      "Business & Management", "Agriculture", "Arts & Culture", "Travel & Exploration",
      "Children's Books", "Reference Books", "Research Papers", "Academic Textbooks", "অন্যান্য"];
    var counts = {};
    BOOKS.forEach(function (b) { var c = b.category || "অন্যান্য"; counts[c] = (counts[c] || 0) + 1; });
    return order.filter(function (c) { return counts[c]; })
      .map(function (c) { return { name: c, n: counts[c] }; });
  }

  function bindHome() {
    var hs = document.getElementById("heroSearch");
    if (hs) hs.addEventListener("submit", function (e) {
      e.preventDefault();
      state = { q: document.getElementById("heroQ").value.trim(), title: "", author: "",
                category: "", language: "", year: "", sort: "az", page: 1 };
      location.hash = "#/books";
    });
    var shareBtn = document.getElementById("shareSiteBtn");
    var shareBox = document.getElementById("siteSharePanel");
    if (shareBtn && shareBox) {
      shareBox.innerHTML = sharePanelHtml("ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", "বাংলা ও বিশ্বের বই — ফ্রি পড়ুন ও ডাউনলোড করুন", siteUrl());
      shareBtn.addEventListener("click", function () {
        doShare("ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", "বাংলা ও বিশ্বের বই — ফ্রি পড়ুন ও ডাউনলোড করুন", siteUrl(), shareBox.querySelector(".share-panel"));
      });
    }
    var t = document.getElementById("advToggle");
    var p = document.getElementById("advPanel");
    if (t && p) {
      fillSelect(document.getElementById("fCategory"), categoryCounts().map(function (c) { return c.name; }), "সব বিভাগ");
      fillSelect(document.getElementById("fLanguage"), ["Bengali", "English"], "সব ভাষা");
      t.addEventListener("click", function () { p.classList.toggle("open"); });
      document.getElementById("advGo").addEventListener("click", function () {
        state = { q: "", title: document.getElementById("fTitle").value.trim(),
                  author: document.getElementById("fAuthor").value.trim(),
                  category: document.getElementById("fCategory").value,
                  language: document.getElementById("fLanguage").value,
                  year: document.getElementById("fYear").value.trim(),
                  sort: "az", page: 1 };
        location.hash = "#/books";
      });
    }
  }
  function fillSelect(sel, values, allLabel) {
    if (!sel) return;
    sel.innerHTML = '<option value="">' + esc(allLabel) + "</option>" +
      values.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(v === "Bengali" ? "বাংলা" : v) + "</option>";
      }).join("");
  }

  /* ---------- browse ---------- */
  function applyFilters() {
    var list = BOOKS.slice();
    var q = state.q.toLowerCase();
    if (q) list = list.filter(function (b) {
      return ((b.title || "") + " " + (b.author || "") + " " + (b.category || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (state.title) list = list.filter(function (b) { return (b.title || "").toLowerCase().indexOf(state.title.toLowerCase()) !== -1; });
    if (state.author) list = list.filter(function (b) { return (b.author || "").toLowerCase().indexOf(state.author.toLowerCase()) !== -1; });
    if (state.category) list = list.filter(function (b) { return b.category === state.category; });
    if (state.language) list = list.filter(function (b) { return b.language === state.language; });
    if (state.year) list = list.filter(function (b) { return String(b.year || "") === String(state.year); });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === "az") return (a.title || "").localeCompare(b.title || "", "bn");
      if (s === "za") return (b.title || "").localeCompare(a.title || "", "bn");
      if (s === "newest") return (b.year || 0) - (a.year || 0) || (b.addedOrder - a.addedOrder);
      if (s === "oldest") return (a.year || 99999) - (b.year || 99999) || (a.addedOrder - b.addedOrder);
      if (s === "author") return (a.author || "").localeCompare(b.author || "", "bn");
      if (s === "top") return (a.topRank || 999) - (b.topRank || 999) || (a.title || "").localeCompare(b.title || "", "bn");
      if (s === "language") return (a.language || "").localeCompare(b.language || "");
      if (s === "category") return (a.category || "").localeCompare(b.category || "", "bn");
      return 0;
    });
    return list;
  }

  function renderBooks() {
    var list = applyFilters();
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    var cats = categoryCounts();

    var h = '<section class="block"><h2>সব বই</h2>' +
      '<p class="muted">মোট ' + BOOKS.length.toLocaleString("bn-BD") + 'টি বই — নাম, লেখক, বিভাগ, ভাষা বা বছর দিয়ে খুঁজুন।</p>' +
      '<div class="filters">' +
      '<div class="full"><label>খুঁজুন (নাম / লেখক / বিষয়)</label><input id="bQ" type="search" value="' + esc(state.q) + '" placeholder="যেমন: রবীন্দ্রনাথ, কুরআন, ইতিহাস"></div>' +
      '<div><label>বিভাগ</label><select id="bCat"></select></div>' +
      '<div><label>ভাষা</label><select id="bLang"></select></div>' +
      '<div><label>সাজান</label><select id="bSort">' +
        '<option value="az">A–Z (নাম অনুযায়ী)</option>' +
        '<option value="za">Z–A</option>' +
        '<option value="newest">নতুন আগে</option>' +
        '<option value="oldest">পুরনো আগে</option>' +
        '<option value="author">লেখক অনুযায়ী</option>' +
        '<option value="top">টপ র‍্যাংকিং অনুযায়ী</option>' +
        '<option value="language">ভাষা অনুযায়ী</option>' +
        '<option value="category">বিভাগ অনুযায়ী</option>' +
      "</select></div>" +
      '<div><label>বছর</label><input id="bYear" type="number" min="1000" max="2026" value="' + esc(state.year) + '" placeholder="যেমন ১৯৪১"></div>' +
      "</div>" +
      '<p class="result-info">' + list.length.toLocaleString("bn-BD") + 'টি বই পাওয়া গেছে · পৃষ্ঠা ' + state.page.toLocaleString("bn-BD") + " / " + pages.toLocaleString("bn-BD") + "</p>" +
      gridHtml(slice) +
      '<div class="pagination">' +
      '<button class="btn btn-ghost btn-sm" id="prevPg" ' + (state.page <= 1 ? "disabled" : "") + ">← আগের পৃষ্ঠা</button>" +
      "<span>পৃষ্ঠা " + state.page + " / " + pages + "</span>" +
      '<button class="btn btn-ghost btn-sm" id="nextPg" ' + (state.page >= pages ? "disabled" : "") + ">পরের পৃষ্ঠা →</button>" +
      "</div>" +
      adSlotHtml() +
      "</section>";
    view.innerHTML = h;

    fillSelect(document.getElementById("bCat"), cats.map(function (c) { return c.name; }), "সব বিভাগ");
    fillSelect(document.getElementById("bLang"), ["Bengali", "English"], "সব ভাষা");
    document.getElementById("bCat").value = state.category;
    document.getElementById("bLang").value = state.language;
    document.getElementById("bSort").value = state.sort;
    var deb;
    document.getElementById("bQ").addEventListener("input", function (e) {
      clearTimeout(deb);
      deb = setTimeout(function () { state.q = e.target.value.trim(); state.page = 1; renderBooks(); }, 300);
    });
    document.getElementById("bCat").addEventListener("change", function (e) { state.category = e.target.value; state.page = 1; renderBooks(); });
    document.getElementById("bLang").addEventListener("change", function (e) { state.language = e.target.value; state.page = 1; renderBooks(); });
    document.getElementById("bSort").addEventListener("change", function (e) { state.sort = e.target.value; state.page = 1; renderBooks(); });
    document.getElementById("bYear").addEventListener("change", function (e) { state.year = e.target.value.trim(); state.page = 1; renderBooks(); });
    var pv = document.getElementById("prevPg"), nx = document.getElementById("nextPg");
    if (pv) pv.addEventListener("click", function () { if (state.page > 1) { state.page--; renderBooks(); window.scrollTo(0, 0); } });
    if (nx) nx.addEventListener("click", function () { state.page++; renderBooks(); window.scrollTo(0, 0); });
  }

  /* Giscus (GitHub Discussions) config for public per-book reviews. */
  var GISCUS = {
    repo: "hosenrobiul43-ship-it/my-digital-library",
    repoId: "R_kgDOV2avLg",
    category: "General",
    categoryId: "DIC_kwDOV2avLs4DLo87"
  };
  function loadGiscus(bookId) {
    var box = document.querySelector(".giscus");
    if (!box) return;
    var s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.setAttribute("data-repo", GISCUS.repo);
    s.setAttribute("data-repo-id", GISCUS.repoId);
    s.setAttribute("data-category", GISCUS.category);
    s.setAttribute("data-category-id", GISCUS.categoryId);
    s.setAttribute("data-mapping", "specific");
    s.setAttribute("data-term", "book-" + bookId);
    s.setAttribute("data-strict", "0");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-emit-metadata", "0");
    s.setAttribute("data-input-position", "bottom");
    s.setAttribute("data-theme", "preferred_color_scheme");
    s.setAttribute("data-lang", "bn");
    s.setAttribute("crossorigin", "anonymous");
    s.async = true;
    box.appendChild(s);
  }

  function renderBook(id) {
    var b = byId(id);
    if (!b) { view.innerHTML = '<p class="empty">এই বইটি পাওয়া যায়নি।</p>'; return; }
    function linkOrNA(url, label) {
      return url
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || url) + "</a>"
        : NA;
    }
    var avail = b.availability === "free-download"
      ? "অনলাইনে পড়া ও ফ্রি ডাউনলোড করা যায়"
      : "অনলাইনে পড়া যায় (উৎসের নিয়ম অনুযায়ী)";
    /* Full A–Z details. Every value is real data from the source; anything
       unknown shows "তথ্য নেই" — nothing is guessed. No price is shown:
       the OCR-extracted printed prices were mostly wrong, so prices were
       removed entirely on 2026-11-21. */
    var rows = [
      ["বইয়ের আইডি", esc(b.sourceId || b.id)],
      ["বইয়ের নাম", esc(b.title)],
      ["বিকল্প শিরোনাম", esc(b.altTitle) || NA],
      ["লেখক", esc(b.author) || NA],
      ["সম্পাদক", esc(b.editor) || NA],
      ["অনুবাদক", esc(b.translator) || NA],
      ["প্রকাশক", esc(b.publisher) || NA],
      ["প্রকাশের বছর", b.year ? String(b.year) : NA],
      ["ISBN", esc(b.isbn) || NA],
      ["ভাষা", esc(langLabel(b.language))],
      ["দেশ", esc(b.country) || NA],
      ["বিষয়", esc(b.subject) || NA],
      ["বিভাগ", esc(b.category || "অন্যান্য")],
      ["উপবিভাগ", esc(b.subcategory) || NA],
      ["বিবরণ", esc(b.description) || NA],
      ["পৃষ্ঠা সংখ্যা", b.pageCount ? b.pageCount.toLocaleString("bn-BD") + " পৃষ্ঠা" : NA],
      ["সংস্করণ", esc(b.edition) || NA],
      ["মূল উৎস", esc(b.source) || NA],
      ["পড়ার লিংক", linkOrNA(b.readUrl, "অনলাইনে পড়ুন ↗")],
      ["ডাউনলোড লিংক", b.downloadUrl ? linkOrNA(b.downloadUrl, "ডাউনলোড করুন ⬇") : "ফ্রি ডাউনলোড ফাইল যাচাই করা যায়নি"],
      ["কেনার লিংক", b.buyLink ? linkOrNA(b.buyLink, "কিনুন ↗") : NA],
      ["কপিরাইট অবস্থা", b.copyright === "public-domain" ? "পাবলিক ডোমেইন / বিনামূল্যে পাওয়া যায়" : NA],
      ["প্রাপ্যতা", avail]
    ];
    var h = '<button class="back-link" id="backBtn">← ফিরে যান</button>' +
      '<div class="details">' + coverHtml(b, true) +
      "<h2>" + esc(b.title) + "</h2>" +
      '<p class="muted">লেখক: ' + esc(b.author || NA) + "</p>" +
      "<dl>" + rows.map(function (r) {
        return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>";
      }).join("") + "</dl>" +
      '<div class="actions">' +
      '<a class="btn btn-navy" href="' + esc(b.readUrl) + '" target="_blank" rel="noopener">অনলাইনে পড়ুন ↗</a>' +
      (b.downloadUrl
        ? '<a class="btn btn-primary" href="' + esc(b.downloadUrl) + '" download>' + esc(dlLabel(b)) + "</a>"
        : "") +
      '<a class="btn btn-ghost" href="' + esc(b.readUrl) + '" target="_blank" rel="noopener">মূল উৎস দেখুন ↗</a>' +
      '<button class="btn btn-ghost" id="shareBtn" type="button">শেয়ার করুন ↗</button>' +
      '<button class="btn btn-ghost" id="favBtn" data-fav="' + esc(b.id) + '" type="button">' + (isFav(b.id) ? "★ পছন্দের বইয়ে আছে" : "☆ পছন্দের বইয়ে রাখুন") + "</button>" +
      "</div>" +
      sharePanelHtml(b.title, "ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", bookUrl(b)) +
      (b.downloadUrl ? "" :
        '<div class="notice">এই বইয়ের ফ্রি ডাউনলোড ফাইল এই মুহূর্তে যাচাই করা যায়নি, তাই ডাউনলোড বোতাম দেখানো হয়নি। উপরের “অনলাইনে পড়ুন” লিংক থেকে উৎসের নিয়ম অনুযায়ী পড়তে পারবেন।</div>') +
      '<div class="reviews"><h3>পাঠকের মতামত (রিভিউ)</h3>' +
      '<p class="small muted">এখানে লেখা মতামত সবার দেখার জন্য প্রকাশ্যে থাকবে (GitHub Discussions)। রিভিউ দিতে একটি GitHub অ্যাকাউন্ট লাগবে।</p>' +
      '<div class="giscus"></div></div></div>';
    view.innerHTML = h;
    document.getElementById("backBtn").addEventListener("click", function () { history.back(); });
    var dShareBtn = document.getElementById("shareBtn");
    if (dShareBtn) dShareBtn.addEventListener("click", function () {
      doShare(b.title, "ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন — " + (b.author || ""), bookUrl(b), document.querySelector(".share-panel"));
    });
    loadGiscus(b.id);
    window.scrollTo(0, 0);
  }

  /* ---------- simple pages ---------- */
  function renderCategories() {
    var cats = categoryCounts();
    view.innerHTML = '<section class="block"><h2>বিভাগ</h2><p class="muted">বিভাগে ক্লিক করলে ওই বিভাগের বই দেখতে পাবেন।</p><div class="chip-grid">' +
      cats.map(function (c) {
        return '<button class="chip" data-cat="' + esc(c.name) + '">' + esc(c.name) + " <small>(" + c.n.toLocaleString("bn-BD") + ")</small></button>";
      }).join("") + "</div></section>";
  }
  function renderAuthors() {
    var counts = {};
    BOOKS.forEach(function (b) {
      var a = (b.author || "").trim();
      if (a && a !== NA) counts[a] = (counts[a] || 0) + 1;
    });
    var authors = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    view.innerHTML = '<section class="block"><h2>লেখক</h2><p class="muted">' + authors.length.toLocaleString("bn-BD") + " জন লেখক — নামে ক্লিক করলে তাঁদের বই দেখতে পাবেন।</p><div class=\"author-list\">" +
      authors.map(function (a) {
        return '<div class="author-item" data-author="' + esc(a) + '"><b>' + esc(a) + "</b><span>" + counts[a].toLocaleString("bn-BD") + "টি বই</span></div>";
      }).join("") + "</div></section>";
  }
  function infoPage(title, bodyHtml) {
    view.innerHTML = '<div class="info-page"><h2>' + esc(title) + "</h2>" + bodyHtml + "</div>";
    window.scrollTo(0, 0);
  }
  function renderAbout() {
    infoPage("আমাদের সম্পর্কে",
      "<p><b>My Digital Library by Robiul Hosen</b> — সবার জন্য উন্মুক্ত একটি ডিজিটাল লাইব্রেরি। এখানে বাংলা ও বিশ্বের বইয়ের তথ্য, বৈধ পড়া ও ডাউনলোডের লিংক এক জায়গায় পাওয়া যায়।</p>" +
      "<p>আমাদের লক্ষ্য: ধাপে ধাপে বাংলাদেশের নামকরা বই, বিশ্বসাহিত্য, ইতিহাস, দর্শন, বিজ্ঞান, ধর্ম ও গবেষণার বইয়ের একটি বড় সংগ্রহ তৈরি করা — সব বই বাংলায়, যাতে সবাই পড়তে পারে।</p>" +
      "<p>বইয়ের তথ্য সংগ্রহ করা হয় Internet Archive, Project Gutenberg ও Standard Ebooks-এর মতো বৈধ উন্মুক্ত উৎস থেকে। কপিরাইটযুক্ত বইয়ের PDF এখানে দেওয়া হয় না।</p>");
  }
  function renderPrivacy() {
    infoPage("গোপনীয়তা নীতি",
      "<p>এই ওয়েবসাইট আপনার কোনো অ্যাকাউন্ট, পাসওয়ার্ড বা ব্যক্তিগত তথ্য সংগ্রহ করে না।</p>" +
      "<p>রিভিউ লেখার সময় আপনি যে নাম ও মতামত দেন, তা GitHub Discussions-এর মাধ্যমে সবার দেখার জন্য প্রকাশ্যে থাকে। রিভিউ দিতে একটি GitHub অ্যাকাউন্ট লাগবে।</p>");
  }
  function renderTerms() {
    infoPage("ব্যবহারের শর্তাবলি",
      "<p>এই লাইব্রেরির বইয়ের তথ্য ও লিংক শুধু পড়া ও শেখার জন্য। বইয়ের ফাইলগুলো সংশ্লিষ্ট উৎসের (Internet Archive / Standard Ebooks) নিয়ম মেনে ব্যবহার করবেন।</p>" +
      "<p>এখান থেকে পাওয়া কোনো বই বাণিজ্যিকভাবে বিক্রি বা পুনঃপ্রকাশ করা যাবে না।</p>" +
      "<p>রিভিউ লেখার সময় ভদ্র ভাষা ব্যবহার করুন; আপত্তিকর মন্তব্য মুছে ফেলা হতে পারে।</p>");
  }
  function renderCopyright() {
    infoPage("কপিরাইট নীতি",
      "<p>এই সাইটে শুধু পাবলিক ডোমেইন বা বিনামূল্যে বৈধভাবে পাওয়া যায় এমন বইয়ের ডাউনলোড লিংক দেওয়া হয়।</p>" +
      "<p>কপিরাইটযুক্ত বইয়ের ক্ষেত্রে ডাউনলোড বোতাম দেখানো হয় না — শুধু অনুমোদিত পড়া, ধার বা কেনার লিংক দেওয়া হয়।</p>" +
      "<p>কোনো বইয়ের কপিরাইট নিয়ে আপত্তি থাকলে যোগাযোগ পাতা থেকে জানান — যাচাই করে লিংক সরিয়ে নেওয়া হবে।</p>");
  }
  function renderContact() {
    infoPage("যোগাযোগ",
      "<p>লাইব্রেরি সম্পর্কে মতামত, বইয়ের অনুরোধ বা ভুল তথ্য জানাতে Facebook পেজে বার্তা পাঠান।</p>" +
      "<p>Facebook: <b>রবিউল</b> (facebook.com — Robiul Hosen)</p>" +
      "<p>নতুন বইয়ের অনুরোধ করলে আমরা বৈধ উৎস যাচাই করে তালিকায় যুক্ত করার চেষ্টা করব।</p>");
  }

  /* ---------- router ---------- */
  function route() {
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\/?/, "").split("/");
    var page = parts[0] || "";
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === (page === "" ? "home" : page));
    });
    if (page === "") renderHome();
    else if (page === "books") {
      var q = new URLSearchParams(hash.split("?")[1] || "");
      if (q.get("sort")) state.sort = q.get("sort");
      renderBooks();
    }
    else if (page === "book") renderBook(decodeURIComponent(parts[1] || ""));
    else if (page === "category") {
      state = { q: "", title: "", author: "", category: decodeURIComponent(parts[1] || ""),
                language: "", year: "", sort: "az", page: 1 };
      renderBooks();
    }
    else if (page === "author") {
      state = { q: "", title: "", author: decodeURIComponent(parts[1] || ""),
                category: "", language: "", year: "", sort: "az", page: 1 };
      renderBooks();
    }
    else if (page === "categories") renderCategories();
    else if (page === "authors") renderAuthors();
    else if (page === "about") renderAbout();
    else if (page === "privacy") renderPrivacy();
    else if (page === "terms") renderTerms();
    else if (page === "copyright") renderCopyright();
    else if (page === "contact") renderContact();
    else renderHome();
    var nav = document.getElementById("topnav");
    if (nav) nav.classList.remove("open");
  }

  /* ---------- global clicks (delegation) ---------- */
  document.addEventListener("click", function (e) {
    var cp = e.target.closest("[data-copy]");
    if (cp) {
      var url = cp.getAttribute("data-copy");
      var done = function () {
        cp.textContent = "কপি হয়েছে ✓";
        setTimeout(function () { cp.textContent = "লিংক কপি করুন"; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else {
        var ta = document.createElement("textarea");
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta); done();
      }
      return;
    }
    var fv = e.target.closest("[data-fav]");
    if (fv) {
      var added = toggleFav(fv.getAttribute("data-fav"));
      if (fv.id === "favBtn") fv.textContent = added ? "★ পছন্দের বইয়ে আছে" : "☆ পছন্দের বইয়ে রাখুন";
      else { fv.textContent = added ? "★" : "☆"; fv.classList.toggle("on", added); }
      return;
    }
    var card = e.target.closest("[data-book]");
    if (card) { location.hash = "#/book/" + encodeURIComponent(card.getAttribute("data-book")); return; }
    var cat = e.target.closest("[data-cat]");
    if (cat) { location.hash = "#/category/" + encodeURIComponent(cat.getAttribute("data-cat")); return; }
    var au = e.target.closest("[data-author]");
    if (au) { location.hash = "#/author/" + encodeURIComponent(au.getAttribute("data-author")); return; }
    var lg = e.target.closest("[data-lang]");
    if (lg) {
      state = { q: "", title: "", author: "", category: "", language: lg.getAttribute("data-lang"), year: "", sort: "az", page: 1 };
      location.hash = "#/books";
      return;
    }
  });
  window.addEventListener("hashchange", route);

  loadBooks();
})();
