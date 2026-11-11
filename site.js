/* S Hotels Jamaica — small shared behaviour. No framework. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Header turns solid once the hero is behind it */
  var header = $(".site-header");
  var hero = $(".hero");
  function onScroll() {
    if (!header) return;
    var limit = hero ? hero.offsetHeight - 140 : 40;
    header.classList.toggle("is-solid", window.scrollY > limit);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var menuBtn = $(".menu-btn");
  var menu = $("#menu");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
    if (menu) menu.setAttribute("aria-hidden", String(!open));
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  }

  /* Hotel dropdown (Our Hotels › / Kingston › / Montego Bay ›) */
  $$(".hotel-menu").forEach(function (wrap) {
    var btn = $("button", wrap);
    var panel = $(".hotel-panel", wrap);
    function set(open) { btn.setAttribute("aria-expanded", String(open)); panel.hidden = !open; }
    btn.addEventListener("click", function (e) { e.stopPropagation(); set(panel.hidden); });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* Hero: plays the hotel film when a video source exists, otherwise a slow reel of stills */
  var video = $(".hero-media video");
  var slides = $$(".hero-media img");
  if (video && video.querySelector("source[src]")) {
    video.classList.add("is-on");
    if (reduce) video.pause();
  } else if (slides.length) {
    var i = 0;
    var show = function (n) { slides.forEach(function (s, k) { s.classList.toggle("is-on", k === n); }); };
    show(0);
    if (!reduce && slides.length > 1) setInterval(function () { i = (i + 1) % slides.length; show(i); }, 6500);
  }

  /* Reveal on scroll */
  var items = $$(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* Sliders: arrows, progress line, end states */
  $$("[data-rail]").forEach(function (rail) {
    var id = rail.id;
    var bar = id ? $('[data-progress="' + id + '"] i') : null;
    var btns = id ? $$('[aria-controls="' + id + '"][data-dir]') : [];
    function step() {
      var kids = Array.prototype.filter.call(rail.children, function (c) { return getComputedStyle(c).position !== "sticky"; });
      var first = kids[0];
      if (!first) return rail.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function update() {
      var max = rail.scrollWidth - rail.clientWidth;
      if (bar) {
        var w = rail.scrollWidth ? Math.min(100, (rail.clientWidth / rail.scrollWidth) * 100) : 100;
        bar.style.width = w + "%";
        bar.style.transform = "translateX(" + (max > 0 ? (rail.scrollLeft / max) * ((100 - w) / w) * 100 : 0) + "%)";
      }
      btns.forEach(function (b) {
        var dir = Number(b.dataset.dir);
        b.disabled = dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max - 2;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { rail.scrollBy({ left: Number(b.dataset.dir) * step(), behavior: reduce ? "auto" : "smooth" }); });
    });
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* Tabs (parent Experiences: Montego Bay / Kingston) */
  $$("[role=tablist]").forEach(function (list) {
    var tabs = $$("[role=tab]", list);
    var link = list.dataset.link ? $(list.dataset.link) : null;
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !on;
      });
      if (link && tab.dataset.href) { link.href = tab.dataset.href; link.textContent = tab.dataset.label || link.textContent; }
    }
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); tabs[(k + 1) % tabs.length].focus(); select(tabs[(k + 1) % tabs.length]); }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); tabs[(k - 1 + tabs.length) % tabs.length].focus(); select(tabs[(k - 1 + tabs.length) % tabs.length]); }
      });
    });
  });

  /* Disclosure buttons (Compare hotels) */
  $$("[data-toggle]").forEach(function (b) {
    var target = $("#" + b.getAttribute("aria-controls"));
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      target.hidden = !open;
      var t = b.querySelector("[data-label]");
      if (t) t.textContent = open ? b.dataset.close : b.dataset.open;
      if (open) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });
  });

  /* Montego Bay experiences: the arrow brings the next image into the big frame */
  $$("[data-xp]").forEach(function (box) {
    var list = $$("[data-xp-list] li", box).map(function (li) { return li.dataset.img; });
    var big = $("[data-xp-big]", box), next = $("[data-xp-next]", box), go = $("[data-xp-go]", box);
    if (list.length < 2 || !big || !next || !go) return;
    var swaps = $$(".xp-swap", box), n = 0;
    function paint() { big.src = list[n]; next.src = list[(n + 1) % list.length]; }
    go.addEventListener("click", function () {
      n = (n + 1) % list.length;
      if (reduce) { paint(); return; }
      swaps.forEach(function (s) { s.classList.add("fading"); });
      setTimeout(function () { paint(); swaps.forEach(function (s) { s.classList.remove("fading"); }); }, 420);
    });
  });

  /* Booking dates in the wireframe format, e.g. 12 NOV 26 - 13 NOV 26 */
  var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function fmt(d) { return d.getDate() + " " + MON[d.getMonth()] + " " + String(d.getFullYear()).slice(2); }
  $$("[data-dates]").forEach(function (el) {
    var d1 = new Date(); d1.setDate(d1.getDate() + 1);
    var d2 = new Date(); d2.setDate(d2.getDate() + 2);
    el.value = fmt(d1) + " - " + fmt(d2);
  });

  /* Booking: the real search hands off to the hotel's own engine */
  $$(".booking form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $("[role=status]", form.parentElement);
      var hotel = $("[name=hotel]", form);
      if (hotel && hotel.tagName === "SELECT" && !hotel.value) {
        if (status) status.textContent = "Choose Montego Bay or Kingston first.";
        hotel.focus();
        return;
      }
      if (status) status.textContent = "Prototype: this opens the " + hotel.value + " booking engine.";
    });
  });

  /* Newsletter: nothing leaves the page in this prototype */
  $$("form.signup").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $(".form-status", form);
      if (status) status.textContent = "Thank you. On the live site this joins the list you picked.";
    });
  });
})();
