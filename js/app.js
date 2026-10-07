(function () {
  'use strict';

  /* ---------- Copy prompt ---------- */
  var copyBtn = document.getElementById('copy-prompt');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var code = document.querySelector('#prompt-text code');
      var text = code ? code.textContent : '';
      var done = function () {
        copyBtn.textContent = 'Copied';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  }

  /* ---------- Upload mock-up ---------- */
  var input = document.getElementById('folder-input');
  var dropZone = document.getElementById('drop-zone');
  var status = document.getElementById('upload-status');
  var checklist = document.getElementById('checklist');
  var checklistList = document.getElementById('checklist-list');
  var actions = document.getElementById('upload-actions');
  var result = document.getElementById('submit-result');
  var mockSubmit = document.getElementById('mock-submit');

  // Required files for a FORRT reproduction (yml config + Anne's essentials + ReproCrowd outputs)
  var REQUIRED = [
    { name: 'myst.yml', label: '.yml config (myst.yml)' },
    { name: 'pixi.toml', label: 'pixi.toml' },
    { name: 'pixi.lock', label: 'pixi.lock' },
    { name: 'Snakefile', label: 'Snakefile' },
    { name: 'nanopubs/PUBLISHED.md', label: 'nanopubs/PUBLISHED.md' },
    { name: 'CITATION.cff', label: 'CITATION.cff' },
    { name: 'certificate.json', label: 'certificate.json' },
    { name: 'SIGN-OFF.md', label: 'SIGN-OFF.md' },
    { name: 'flora-entry.json', label: 'flora-entry.json' }
  ];

  function normalize(p) { return (p || '').replace(/\\/g, '/').toLowerCase(); }

  function handleFiles(fileList) {
    var paths = [];
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      paths.push((f.webkitRelativePath || f.name || '').replace(/\\/g, '/'));
    }
    var found = new Set(paths.map(normalize));
    var present = 0;
    checklistList.innerHTML = '';
    REQUIRED.forEach(function (req) {
      var li = document.createElement('li');
      var dot = document.createElement('span');
      var ok = found.has(normalize(req.name));
      dot.className = 'dot ' + (ok ? 'ok' : 'missing');
      li.appendChild(dot);
      li.appendChild(document.createTextNode(req.label + (ok ? '' : ' — missing')));
      checklistList.appendChild(li);
      if (ok) present++;
    });
    checklist.hidden = false;
    actions.hidden = false;
    result.hidden = true;
    status.textContent = 'Selected ' + paths.length + ' file(s). ' + present + '/' + REQUIRED.length + ' required files found.';
    if (present === REQUIRED.length) {
      status.textContent += ' Looks complete.';
    } else {
      status.textContent += ' Some required files are missing — the report may not be ready to publish.';
    }
  }

  if (input) {
    input.addEventListener('change', function (e) { handleFiles(e.target.files); });
  }
  if (dropZone && input) {
    ['dragenter', 'dragover'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });
    dropZone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });
  }
  if (mockSubmit) {
    mockSubmit.addEventListener('click', function () {
      result.hidden = false;
      result.className = 'submit-result ok';
      result.innerHTML = '<strong>Submitted (mock-up).</strong> In production this would open a pull request against a ReproCrowd repository for a human to review and sign. No data was sent anywhere.';
    });
  }

  /* ---------- Reproductions table ---------- */
  var tbody = document.getElementById('repro-tbody');
  var search = document.getElementById('search');
  var filter = document.getElementById('filter-outcome');
  var empty = document.getElementById('empty');
  var count = document.getElementById('count');

  var rows = [];

  function pill(outcome) {
    var cls = 'pill-muted';
    if (outcome === 'computationally reproducible') cls = 'pill-ok';
    else if (outcome === 'computational issues') cls = 'pill-warn';
    else if (outcome === 'technical failure') cls = 'pill-bad';
    return '<span class="pill ' + cls + '">' + outcome + '</span>';
  }

  function fmtDate(d) {
    if (!d) return '—';
    var parts = d.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : d;
  }

  function render(list) {
    tbody.innerHTML = '';
    list.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><a href="' + r.repo_url + '" target="_blank" rel="noopener">' + (r.title || 'Untitled') + '</a>' +
          '<br><span class="muted">' + (r.doi || '') + '</span></td>' +
        '<td>' + (r.field || '—') + '</td>' +
        '<td>' + pill(r.outcome) + '</td>' +
        '<td>' + (r.model || '—') + '<br><span class="muted">v' + (r.rule_version || '?') + '</span></td>' +
        '<td>' + (r.signature === 'signed' ? '✓' : '—') + '</td>' +
        '<td>' + fmtDate(r.date) + '</td>' +
        '<td><a href="' + r.repo_url + '" target="_blank" rel="noopener">Report</a></td>';
      tbody.appendChild(tr);
    });
    empty.hidden = list.length > 0;
    count.textContent = list.length + ' reproduction(s) shown.';
  }

  function applyFilters() {
    var q = (search ? search.value : '').toLowerCase().trim();
    var oc = filter ? filter.value : '';
    var list = rows.filter(function (r) {
      if (oc && r.outcome !== oc) return false;
      if (!q) return true;
      var hay = [r.title, r.doi, r.field, r.outcome, r.model].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    render(list);
  }

  function load() {
    fetch('./data/reproductions.json')
      .then(function (res) { return res.json(); })
      .then(function (data) { rows = Array.isArray(data) ? data : []; applyFilters(); })
      .catch(function () { count.textContent = 'Could not load reproductions.'; });
  }

  if (search) search.addEventListener('input', applyFilters);
  if (filter) filter.addEventListener('change', applyFilters);

  load();
})();
