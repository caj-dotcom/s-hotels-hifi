/*
 * Sections dev tool: hide, show and reorder a page's sections in this browser.
 *
 * Setup, on every page that should have it:
 *   1. Put the page's sections side by side in one container marked
 *      data-sections, each with data-section="<id>" and data-label="<name>".
 *   2. Load this file at the end of the page:
 *      <script src="sections-devtool.js" defer></script>
 *
 * Turn it on by opening any page with ?dev=1 in the address. It stays on for
 * every page of the site in this browser until you open one with ?dev=0.
 * Visitors without the flag see the page exactly as written.
 *
 * Choices are saved in this browser only, one layout per page. "Copy layout"
 * copies the page's order and hidden list as JSON, which is how a layout
 * becomes the real one: reorder or delete the sections in the HTML to match.
 */
(function () {
  // Wireframe build: the tool shows by default. ?dev=0 hides it in this
  // browser until a page is opened with ?dev=1.
  var FLAG = 'sections-dev';
  var params = new URLSearchParams(location.search);
  var on = params.get('dev') !== '0';
  try {
    if (params.get('dev') === '1') localStorage.removeItem(FLAG);
    if (params.get('dev') === '0') localStorage.setItem(FLAG, 'off');
    on = localStorage.getItem(FLAG) !== 'off';
  } catch (e) {
    // Storage blocked: only ?dev=0 on this page view hides it.
  }
  if (!on) return;

  var root = document.querySelector('[data-sections]');
  if (!root) return;

  var KEY = 'sections-layout:' + location.pathname;
  var byId = {};
  var DEFAULT_ORDER = [];
  Array.prototype.forEach.call(root.children, function (el) {
    var id = el.getAttribute('data-section');
    if (!id || byId[id]) return;
    byId[id] = el;
    DEFAULT_ORDER.push(id);
  });
  if (!DEFAULT_ORDER.length) return;

  // Sections are re-inserted before this marker, so they stay where they were.
  var marker = document.createComment('sections-devtool');
  root.insertBefore(marker, byId[DEFAULT_ORDER[DEFAULT_ORDER.length - 1]].nextSibling);

  function labelOf(id) {
    return byId[id].getAttribute('data-label') || id;
  }

  function load() {
    var saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      saved = {};
    }
    var order = (saved.order || []).filter(function (id) {
      return byId[id];
    });
    // A section added to the HTML after a layout was saved lands after the
    // section it follows in the HTML, not at the bottom.
    DEFAULT_ORDER.forEach(function (id, i) {
      if (order.indexOf(id) !== -1) return;
      var before = i > 0 ? order.indexOf(DEFAULT_ORDER[i - 1]) : -1;
      order.splice(before + 1, 0, id);
    });
    var hidden = (saved.hidden || []).filter(function (id) {
      return byId[id];
    });
    return { order: order, hidden: hidden };
  }

  var state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // Storage blocked: the change applies for this page view only.
    }
  }

  function apply() {
    state.order.forEach(function (id) {
      root.insertBefore(byId[id], marker);
      if (state.hidden.indexOf(id) !== -1) byId[id].setAttribute('data-sections-off', '');
      else byId[id].removeAttribute('data-sections-off');
    });
  }

  var css = document.createElement('style');
  css.textContent = [
    '[data-sections-off]{display:none!important}',
    '.sdt{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font:13px/1.4 system-ui,-apple-system,sans-serif;color:#1a1a1a}',
    '.sdt button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}',
    '.sdt-panel{width:320px;max-height:70vh;overflow:auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12)}',
    '.sdt-head{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 6px}',
    '.sdt-head span{font-weight:500}',
    '.sdt-head button{padding:2px 8px;border-radius:6px;font-size:12px;color:#666}',
    '.sdt-head button:hover,.sdt-row:hover{background:#f4f4f4}',
    '.sdt-list{list-style:none;margin:0;padding:0}',
    '.sdt-row{display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:6px}',
    '.sdt-row.sdt-drag{background:#ececec}',
    '.sdt-grip{cursor:grab;color:#aaa;user-select:none;padding:0 2px}',
    '.sdt-name{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 4px;text-align:left}',
    '.sdt-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sdt-off .sdt-name span{color:#aaa;text-decoration:line-through}',
    '.sdt-sw{position:relative;flex:none;width:28px;height:16px;border-radius:8px;background:#1a1a1a}',
    '.sdt-sw:after{content:"";position:absolute;top:2px;left:14px;width:12px;height:12px;border-radius:6px;background:#fff;transition:left .15s ease-out}',
    '.sdt-off .sdt-sw{background:#ddd}',
    '.sdt-off .sdt-sw:after{left:2px}',
    '.sdt-move{padding:0 4px;color:#999;border-radius:4px}',
    '.sdt-move:disabled{opacity:.3;cursor:default}',
    '.sdt-pill{height:36px;padding:0 16px;border-radius:18px!important;background:#fff!important;border:1px solid #e5e5e5!important;box-shadow:0 2px 8px rgba(0,0,0,.1)}',
  ].join('\n');
  document.head.appendChild(css);

  var wrap = document.createElement('div');
  wrap.className = 'sdt';
  var panel = document.createElement('div');
  panel.className = 'sdt-panel';
  var head = document.createElement('div');
  head.className = 'sdt-head';
  var title = document.createElement('span');
  title.textContent = 'Sections';
  var tools = document.createElement('div');
  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy layout';
  var resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset';
  tools.appendChild(copyBtn);
  tools.appendChild(resetBtn);
  head.appendChild(title);
  head.appendChild(tools);
  var list = document.createElement('ul');
  list.className = 'sdt-list';
  panel.appendChild(head);
  panel.appendChild(list);
  var pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'sdt-pill';
  wrap.appendChild(panel);
  wrap.appendChild(pill);
  document.body.appendChild(wrap);

  var dragging = null;

  function commit() {
    save();
    apply();
    render();
  }

  function move(id, to) {
    var next = state.order.filter(function (x) {
      return x !== id;
    });
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
    state.order = next;
    commit();
  }

  function render() {
    list.textContent = '';
    state.order.forEach(function (id, index) {
      var off = state.hidden.indexOf(id) !== -1;
      var li = document.createElement('li');
      li.className = 'sdt-row' + (off ? ' sdt-off' : '');
      li.draggable = true;
      li.setAttribute('data-id', id);

      var grip = document.createElement('span');
      grip.className = 'sdt-grip';
      grip.setAttribute('aria-hidden', 'true');
      grip.textContent = '⠇';

      var name = document.createElement('button');
      name.type = 'button';
      name.className = 'sdt-name';
      name.setAttribute('role', 'switch');
      name.setAttribute('aria-checked', off ? 'false' : 'true');
      var text = document.createElement('span');
      text.textContent = labelOf(id);
      var sw = document.createElement('i');
      sw.className = 'sdt-sw';
      name.appendChild(text);
      name.appendChild(sw);
      name.addEventListener('click', function () {
        state.hidden = off
          ? state.hidden.filter(function (x) {
              return x !== id;
            })
          : state.hidden.concat(id);
        commit();
      });

      var up = document.createElement('button');
      up.type = 'button';
      up.className = 'sdt-move';
      up.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7.5 6 4.5l3 3"/></svg>';
      up.setAttribute('aria-label', 'Move ' + labelOf(id) + ' up');
      up.disabled = index === 0;
      up.addEventListener('click', function () {
        move(id, index - 1);
      });

      var down = document.createElement('button');
      down.type = 'button';
      down.className = 'sdt-move';
      down.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>';
      down.setAttribute('aria-label', 'Move ' + labelOf(id) + ' down');
      down.disabled = index === state.order.length - 1;
      down.addEventListener('click', function () {
        move(id, index + 1);
      });

      li.addEventListener('dragstart', function (e) {
        dragging = li;
        li.classList.add('sdt-drag');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (!dragging || dragging === li) return;
        var box = li.getBoundingClientRect();
        var after = e.clientY > box.top + box.height / 2;
        list.insertBefore(dragging, after ? li.nextSibling : li);
      });
      li.addEventListener('dragend', function () {
        dragging = null;
        state.order = Array.prototype.map.call(list.children, function (row) {
          return row.getAttribute('data-id');
        });
        commit();
      });

      li.appendChild(grip);
      li.appendChild(name);
      li.appendChild(up);
      li.appendChild(down);
      list.appendChild(li);
    });
    pill.textContent = 'Sections · ' + (state.order.length - state.hidden.length) + '/' + state.order.length;
  }

  list.addEventListener('drop', function (e) {
    e.preventDefault();
  });

  pill.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
  });

  copyBtn.addEventListener('click', function () {
    var text = JSON.stringify({ page: location.pathname, order: state.order, hidden: state.hidden }, null, 2);
    var done = function () {
      copyBtn.textContent = 'Copied';
      setTimeout(function () {
        copyBtn.textContent = 'Copy layout';
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        copyBtn.textContent = 'Copy blocked';
      });
    } else {
      copyBtn.textContent = 'Copy blocked';
    }
  });

  resetBtn.addEventListener('click', function () {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      // Nothing saved to remove.
    }
    state = load();
    commit();
  });

  apply();
  render();
})();
