(function () {
  'use strict';

  /* ---------- Copy prompt ---------- */
  var copyBtn = document.getElementById('copy-prompt');
  if (copyBtn) {
    function copyText(text) {
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
    }
    copyBtn.addEventListener('click', function () {
      // The exact prompt is saved in prompt.txt; copy that, falling back to the inline text.
      fetch('./prompt.txt')
        .then(function (res) { return res.text(); })
        .then(function (text) { copyText(text.trim()); })
        .catch(function () {
          var code = document.querySelector('#prompt-text code');
          copyText(code ? code.textContent : '');
        });
    });
  }

  /* ---------- Upload, sign-off & submit ---------- */
  var input = document.getElementById('folder-input');
  var dropZone = document.getElementById('drop-zone');
  var status = document.getElementById('upload-status');
  var checklist = document.getElementById('checklist');
  var checklistList = document.getElementById('checklist-list');
  var actions = document.getElementById('upload-actions');
  var result = document.getElementById('submit-result');
  var submitBtn = document.getElementById('submit-btn');
  var downloadBtn = document.getElementById('download-btn');
  var selectedFiles = [];
  var topFolder = '';

  // Files needed for a ReproCrowd submission. Required = block submission; recommended = full reproducibility (optional).
  var REQUIRED = [
    { name: 'certificate.json', label: 'certificate.json', required: true },
    { name: 'certificate.md', label: 'certificate.md', required: true },
    { name: 'SIGN-OFF.md', label: 'SIGN-OFF.md', required: true },
    { name: 'flora-entry.json', label: 'flora-entry.json', required: true },
    { name: 'environment.json', label: 'environment.json (program inventory)', required: true },
    { name: 'myst.yml', label: '.yml config (myst.yml)', required: false },
    { name: 'pixi.toml', label: 'pixi.toml', required: false },
    { name: 'pixi.lock', label: 'pixi.lock', required: false },
    { name: 'Snakefile', label: 'Snakefile', required: false },
    { name: 'nanopubs/PUBLISHED.md', label: 'nanopubs/PUBLISHED.md', required: false },
    { name: 'CITATION.cff', label: 'CITATION.cff', required: false }
  ];

  var GITHUB_OWNER = 'LukasRoeseler';
  var GITHUB_REPO = 'reprocrowd';

  var signoff = document.getElementById('signoff');
  var signoffName = document.getElementById('signoff-name');
  var signoffOrcid = document.getElementById('signoff-orcid');
  var signoffRole = document.getElementById('signoff-role');
  var signoffAccept = document.getElementById('signoff-accept');

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function normalize(p) { return (p || '').replace(/\\/g, '/').toLowerCase(); }

  // Match a required path even when the whole folder is dropped (paths are prefixed with the folder name).
  function hasPath(found, name) {
    if (found.has(name)) return true;
    var suffix = '/' + name;
    return Array.from(found).some(function (p) { return p.endsWith(suffix); });
  }

  function handleFiles(fileList) {
    selectedFiles = [];
    topFolder = '';
    var paths = [];
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      var rel = (f.webkitRelativePath || f.name || '');
      paths.push(rel.replace(/\\/g, '/'));
      selectedFiles.push(f);
      if (!topFolder && rel) {
        var seg = rel.split(/[\\/]/)[0];
        if (seg) topFolder = seg;
      }
    }
    var found = new Set(paths.map(normalize));
    var requiredPresent = 0;
    var requiredTotal = 0;
    checklistList.innerHTML = '';
    REQUIRED.forEach(function (req) {
      var ok = hasPath(found, normalize(req.name));
      var li = document.createElement('li');
      var dot = document.createElement('span');
      dot.className = 'dot ' + (ok ? 'ok' : (req.required ? 'missing' : 'rec'));
      li.appendChild(dot);
      var text = req.label + (req.required ? '' : ' (recommended)');
      if (!ok && req.required) text += ' - missing';
      li.appendChild(document.createTextNode(text));
      checklistList.appendChild(li);
      if (req.required) { requiredTotal++; if (ok) requiredPresent++; }
    });
    checklist.hidden = false;
    var complete = requiredPresent === requiredTotal;
    signoff.hidden = !complete;
    actions.hidden = !complete;
    result.hidden = true;
    status.textContent = 'Selected ' + paths.length + ' file(s). ' + requiredPresent + '/' + requiredTotal + ' required files found.';
    if (complete) {
      status.textContent += ' Complete - sign off below to submit.';
    } else {
      status.textContent += ' Some required files are missing.';
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
  function slugFromTop() {
    var s = (topFolder || '').replace(/-certification$/i, '');
    return s || topFolder || '<slug>';
  }

  function downloadBundle() {
    if (!window.JSZip || !selectedFiles.length) {
      result.hidden = false;
      result.className = 'submit-result ok';
      result.innerHTML = '<strong>Almost there.</strong> Select the folder again, then click "Download bundle (.zip)".';
      return;
    }
    var zip = new JSZip();
    selectedFiles.forEach(function (f) {
      var rel = (f.webkitRelativePath || f.name || '');
      zip.file(rel, f);
    });
    zip.generateAsync({ type: 'blob' }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (slugFromTop() || 'reprocrowd-certification') + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }

  function issueUrl() {
    var slug = slugFromTop();
    var title = 'ReproCrowd certification: ' + slug;
    var body = 'Submit a ReproCrowd certification bundle.\n\n' +
      'Attach the zip of the `<slug>-certification` folder (use "Download bundle (.zip)").\n\n' +
      '- DOI:\n- Link to materials / data / code:\n- Engine / model / provider:\n- Repro standard version:\n- Outcome (computationally reproducible / computational issues / technical failure / computation not checked):';
    return 'https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO +
      '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadBundle);
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      var name = signoffName.value.trim();
      var orcid = signoffOrcid.value.trim();
      var role = signoffRole.value;
      var accepted = signoffAccept.checked;
      if (!name || !accepted) {
        result.hidden = false;
        result.className = 'submit-result ok';
        result.innerHTML = '<strong>Almost there.</strong> Enter your name and tick the acceptance box to sign off before submitting.';
        return;
      }
      result.hidden = false;
      result.className = 'submit-result ok';
      result.innerHTML =
        '<strong>Signed off by ' + escapeHtml(name) + ' (' + escapeHtml(role) +
        (orcid ? ' · ORCID ' + escapeHtml(orcid) : '') + ').</strong> ' +
        'The site is static and cannot write to GitHub for you. Pick a way to submit:' +
        '<p class="muted"><strong>No git? Easiest path.</strong> Download the bundle and attach it to a GitHub issue - ' +
        'the maintainer will merge it.</p>' +
        '<div class="btn-row">' +
        '<button class="btn" id="result-download">Download bundle (.zip)</button>' +
        '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + issueUrl() + '">Open a GitHub issue (attach the zip)</a>' +
        '</div>' +
        '<p class="muted"><strong>With git.</strong> If you have write access, push straight to main; ' +
        'otherwise fork, push to a branch named <code>repro/&lt;slug&gt;</code>, and open a pull request:</p>' +
        '<pre class="git-cmds"><code>' +
        'git clone https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '.git\n' +
        'cd ' + GITHUB_REPO + '\n' +
        'git checkout -b repro/&lt;slug&gt;\n' +
        '# copy your &lt;slug&gt;-certification folder in, e.g. into certifications/&lt;slug&gt;/\n' +
        'git add certifications/&lt;slug&gt;\n' +
        'git commit -m "Add ReproCrowd certification &lt;slug&gt;"\n' +
        'git push origin repro/&lt;slug&gt;</code></pre>' +
        '<p class="muted">Every submission lands under <code>certifications/&lt;slug&gt;/</code>. ' +
        'The commit (or the issue) is what saves the folder - there is nothing to upload via the site itself.</p>' +
        '<a class="btn" target="_blank" rel="noopener" href="https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '">Open the repository</a>';
      var rd = document.getElementById('result-download');
      if (rd) rd.addEventListener('click', downloadBundle);
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
    if (!d) return '-';
    var parts = d.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : d;
  }

  function programsSummary(programs) {
    if (!programs || !programs.length) return '-';
    var text = programs.map(function (p) { return p.name + ' ' + p.version; }).join(' · ');
    var detail = programs.map(function (p) {
      var pkgs = p.packages ? Object.keys(p.packages).map(function (k) { return k + ' ' + p.packages[k]; }).join(', ') : '';
      return p.name + ' ' + p.version + (p.lockfile ? ' (' + p.lockfile + ')' : '') + (pkgs ? ' - ' + pkgs : '');
    }).join('\n');
    var safe = detail.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return '<span class="muted" title="' + safe + '">' + text + '</span>';
  }

  function render(list) {
    tbody.innerHTML = '';
    list.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><a href="' + r.repo_url + '" target="_blank" rel="noopener">' + (r.title || 'Untitled') + '</a>' +
          '<br><span class="muted">' + (r.doi || '') + '</span></td>' +
        '<td>' + (r.field || '-') + '</td>' +
        '<td>' + pill(r.outcome) + '</td>' +
        '<td>' + (r.engine || '-') + '<br><span class="muted">' + (r.model || '') + '</span></td>' +
        '<td>' + (r.repro_standard_version || '-') + '</td>' +
        '<td>' + programsSummary(r.programs) + '</td>' +
        '<td>' + (r.signature === 'signed' ? (r.signed_by || '✓') : '-') + '</td>' +
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
      var hay = [r.title, r.doi, r.field, r.outcome, r.model, r.engine, r.repro_standard_version].join(' ').toLowerCase();
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
