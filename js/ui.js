const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const formatDate = (date, withTime = false) => {
  if (!date) return "Belum ditentukan";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Tanggal tidak valid";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(parsed);
};

const formatSize = (bytes = 0) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function emptyState(title, description, action = "") {
  return `<div class="empty-state">
    <svg class="empty-art" viewBox="0 0 160 120" role="img" aria-label="Ilustrasi papan catatan kosong">
      <rect x="26" y="14" width="108" height="92" rx="5" fill="#ffcf5a" stroke="currentColor" stroke-width="4" transform="rotate(-5 80 60)"/>
      <path d="M50 43h58M48 61h45M52 79h35" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <path d="M121 88l15 15" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <circle cx="121" cy="88" r="9" fill="#ff8066" stroke="currentColor" stroke-width="4"/>
    </svg>
    <h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action}
  </div>`;
}

function courseCard(course, index = 0) {
  return `<article class="course-card" style="--note-color:${escapeHTML(course.color || "#ffe38a")};--tilt:${index % 2 ? "1.3deg" : "-1.2deg"}">
    <a class="course-card-link" href="#/matkul/${encodeURIComponent(course.id)}">
      <span class="course-emoji" aria-hidden="true">${escapeHTML(course.emoji || "📚")}</span>
      <span class="course-code">${escapeHTML(course.code || "MATKUL")}</span>
      <h3>${escapeHTML(course.name)}</h3>
      <p>${escapeHTML(course.lecturer || "Dosen belum diisi")}</p>
      <span class="course-semester">${escapeHTML(course.semester || "Semester —")}</span>
    </a>
    <div class="course-card-actions">
      <button class="small-button" type="button" data-action="edit-course" data-id="${escapeHTML(course.id)}">Ubah</button>
      <button class="small-button danger-text" type="button" data-action="delete-course" data-id="${escapeHTML(course.id)}">Hapus</button>
    </div>
  </article>`;
}

function taskRow(task, state, compact = false) {
  const course = state.courses.find((item) => item.id === task.courseId);
  const overdue = task.status !== "selesai" && new Date(task.deadline).getTime() < Date.now();
  return `<article class="task-row ${overdue ? "is-overdue" : ""} ${task.status === "selesai" ? "is-complete" : ""}">
    <label class="task-check"><input type="checkbox" data-action="toggle-task" data-id="${escapeHTML(task.id)}" ${task.status === "selesai" ? "checked" : ""} aria-label="Tandai ${escapeHTML(task.title)} sebagai ${task.status === "selesai" ? "belum selesai" : "selesai"}"><span></span></label>
    <div class="task-main">
      <h3>${escapeHTML(task.title)}</h3>
      <p>${escapeHTML(course?.name || "Mata kuliah dihapus")} <span aria-hidden="true">·</span> <time>${formatDate(task.deadline, true)}</time></p>
      ${task.notes ? `<p class="task-note">${escapeHTML(task.notes)}</p>` : ""}
    </div>
    <span class="priority priority-${escapeHTML(task.priority || "sedang")}">${escapeHTML(task.priority || "sedang")}</span>
    ${overdue ? '<span class="overdue-label">Terlambat</span>' : ""}
    ${compact ? "" : `<div class="task-actions">
      <button class="small-button" type="button" data-action="export-ics" data-id="${escapeHTML(task.id)}">Ekspor .ics</button>
      <button class="small-button" type="button" data-action="edit-task" data-id="${escapeHTML(task.id)}">Ubah</button>
      <button class="small-button danger-text" type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}">Hapus</button>
    </div>`}
  </article>`;
}

function pageHeader(eyebrow, title, description, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-description">${description}</p></div>${action}</div>`;
}

export function renderPage(route, state, storageBytes) {
  if (route.page === "home") return renderHome(state);
  if (route.page === "dashboard") return renderDashboard(state);
  if (route.page === "matkul") return renderCourses(state);
  if (route.page === "detail") return renderCourseDetail(route.id, state, storageBytes);
  if (route.page === "tugas") return renderTasks(state);
  if (route.page === "tentang") return renderInfo("Tentang ingetin", "Teman kecil untuk kuliah yang lebih teratur", `<p>ingetin adalah papan pengumuman digital pribadi untuk menyimpan materi kuliah dan mengelola deadline tugas. Dibuat untuk membantu kegiatan kuliah tetap rapi tanpa akun dan tanpa layanan eksternal.</p><p>Materi dan catatanmu tersimpan di browser pada perangkat ini. Gunakan ekspor data secara berkala sebagai cadangan.</p>`);
  if (route.page === "privasi") return renderInfo("Kebijakan Privasi", "Privat dari awal", `<p>ingetin tidak mengirim data ke server. Data mata kuliah, tugas, preferensi tema, dan status reminder disimpan di localStorage browser; berkas materi disimpan di IndexedDB perangkat ini.</p><p>Data dapat dihapus dengan menghapus penyimpanan situs dari pengaturan browser. Ekspor JSON hanya mencakup metadata mata kuliah dan tugas, bukan berkas materi.</p><p>Notifikasi browser hanya diminta setelah kamu menekan tombol izin. Aplikasi tidak memakai analitik, pelacak, akun, atau cookie untuk iklan.</p>`);
  if (route.page === "syarat") return renderInfo("Syarat & Ketentuan", "Gunakan dengan nyaman", `<p>ingetin disediakan sebagai alat bantu pribadi. Kamu bertanggung jawab atas pencadangan data dan memastikan tanggal tugas yang dicatat sudah benar.</p><p>Pengingat berbasis browser hanya aktif selama tab ingetin terbuka dan browser mengizinkan notifikasi. Aplikasi ini bukan pengganti kalender atau sistem resmi kampus.</p><p>Jangan mengunggah berkas yang tidak berhak kamu simpan. Dengan menggunakan aplikasi, kamu memahami bahwa data berada di penyimpanan browser perangkatmu.</p>`);
  if (route.page === "kontak") return renderInfo("Kontak", "Ada yang ingin disampaikan?", `<p>Untuk pertanyaan atau masukan, hubungi:</p><p><a class="text-link" href="mailto:josemanik6@gmail.com">josemanik6@gmail.com</a></p>`);
  if (route.page === "404") return `<section class="not-found">${emptyState("Halaman ini tidak ditemukan", "Sepertinya catatan ini terselip. Yuk kembali ke halaman utama.", '<a class="button button-primary" href="#/">Kembali ke beranda</a>')}</section>`;
  return renderHome(state);
}

function renderHome(state) {
  return `<section class="hero">
    <div class="hero-copy"><p class="eyebrow">Papan pengumuman digitalmu</p><h1>Kuliah rapi,<br><span>kepala lebih lega.</span></h1>
      <p class="hero-description">Simpan materi kuliah, catat deadline, dan biarkan ingetin menjaga semuanya tetap di depan mata.</p>
      <div class="hero-actions"><a class="button button-primary" href="#/dashboard">Buka dashboard <span aria-hidden="true">↗</span></a><a class="button button-secondary" href="#/matkul">Atur mata kuliah</a></div>
      <p class="hand-note">dibuat untuk ritme kuliahmu ✳</p>
    </div>
    <div class="hero-board" aria-label="Pratinjau papan pengumuman">
      <div class="board-pin" aria-hidden="true"></div><p class="board-label">MINGGU INI</p>
      <div class="mini-note mini-yellow"><span>📐</span><b>Struktur Data</b><small>Materi bab 4</small></div>
      <div class="mini-note mini-pink"><span>⏰</span><b>Deadline!</b><small>Proyek kelompok · Jumat</small></div>
      <div class="mini-note mini-blue"><span>☑</span><b>Satu langkah kecil</b><small>tetaplah konsisten!</small></div>
    </div>
  </section>
  <section class="features-section"><div class="section-heading"><p class="eyebrow">Satu tempat, lebih tertata</p><h2>Semua urusan kuliahmu.</h2></div>
    <div class="feature-grid">
      <article class="feature-card"><span>📚</span><h3>Materi tersimpan</h3><p>Kelompokkan PDF dan presentasi sesuai mata kuliah, langsung di perangkatmu.</p></article>
      <article class="feature-card"><span>📌</span><h3>Deadline terlihat</h3><p>Catat prioritas, pantau tugas aktif, dan tandai yang sudah selesai.</p></article>
      <article class="feature-card"><span>🔔</span><h3>Pengingat bersahabat</h3><p>Atur pengingat dan ekspor deadline ke kalender sebagai cadangan.</p></article>
    </div>
    <div class="home-cta"><span class="hand-note">mulai dari satu mata kuliah aja ✍</span><a href="#/matkul" class="button button-primary">Tambah mata kuliah</a></div>
  </section>
  <section class="privacy-strip"><span aria-hidden="true">🔒</span><p><strong>Ruangmu tetap milikmu.</strong> Data dan file disimpan lokal di browser, tanpa akun dan tanpa server.</p><a href="#/privasi">Baca kebijakan privasi</a></section>`;
}

function renderDashboard(state) {
  const activeTasks = state.tasks.filter((task) => task.status !== "selesai");
  const upcoming = activeTasks.filter((task) => new Date(task.deadline) >= new Date()).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
  const overdue = activeTasks.filter((task) => new Date(task.deadline) < new Date()).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const buttons = `<div class="heading-actions"><button class="button button-secondary" data-action="request-notification" type="button">🔔 Aktifkan notifikasi</button><button class="button button-primary" data-action="new-task" type="button">＋ Tambah tugas</button></div>`;
  return `<section class="page-wrap">${pageHeader("Ringkasan kuliah", "Dashboard", "Lihat apa yang perlu disiapkan berikutnya.", buttons)}
    <div class="stats-grid">
      <article class="stat-card stat-lilac"><span class="stat-icon">📚</span><p>Mata kuliah</p><strong>${state.courses.length}</strong></article>
      <article class="stat-card stat-yellow"><span class="stat-icon">📎</span><p>Materi tersimpan</p><strong>${state.materials.length}</strong></article>
      <article class="stat-card stat-pink"><span class="stat-icon">☑️</span><p>Tugas aktif</p><strong>${activeTasks.length}</strong></article>
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-heading"><h2>Deadline terdekat</h2><a href="#/tugas">Semua tugas ↗</a></div>
        ${upcoming.length ? `<div class="task-list">${upcoming.map((task) => taskRow(task, state, true)).join("")}</div>` : emptyState("Belum ada deadline dekat", "Tugas baru akan muncul di sini.")}
      </section>
      <section class="panel overdue-panel"><div class="panel-heading"><h2>Perlu perhatian</h2><span class="count-pill">${overdue.length}</span></div>
        ${overdue.length ? `<div class="task-list">${overdue.map((task) => taskRow(task, state, true)).join("")}</div>` : emptyState("Semua aman!", "Tidak ada tugas yang terlambat.")}
      </section>
    </div>
    <section class="reminder-notice"><strong>🔔 Pengingat hanya aktif saat tab terbuka.</strong><span>Ekspor tugas ke kalender (.ics) supaya tetap ada cadangan.</span></section>
    <section class="backup-panel"><div><h2>Cadangan data</h2><p>Ekspor atau impor mata kuliah dan tugas. File materi tidak ikut.</p></div><div class="inline-actions"><button class="button button-secondary" data-action="export-json" type="button">Ekspor JSON</button><button class="button button-secondary" data-action="import-json" type="button">Impor JSON</button><input id="import-file" type="file" accept="application/json,.json" hidden></div></section>
  </section>`;
}

function renderCourses(state) {
  const action = `<button class="button button-primary" data-action="new-course" type="button">＋ Tambah mata kuliah</button>`;
  return `<section class="page-wrap">${pageHeader("Papan catatanmu", "Mata kuliah", "Setiap kelas punya ruang dan warna sendiri.", action)}
    ${state.courses.length ? `<div class="courses-grid">${state.courses.map(courseCard).join("")}</div>` : emptyState("Papanmu masih kosong", "Tambahkan mata kuliah pertama agar materi dan tugas tersusun rapi.", '<button class="button button-primary" data-action="new-course" type="button">＋ Tambah mata kuliah</button>')}
  </section>`;
}

function renderCourseDetail(id, state, storageBytes) {
  const course = state.courses.find((item) => item.id === id);
  if (!course) return `<section class="page-wrap">${emptyState("Mata kuliah tidak ditemukan", "Mungkin sudah dihapus atau tautannya tidak berlaku.", '<a class="button button-primary" href="#/matkul">Lihat mata kuliah</a>')}</section>`;
  const files = state.materials.filter((item) => item.courseId === course.id);
  const tasks = state.tasks.filter((item) => item.courseId === course.id);
  const storageMB = (storageBytes / 1024 / 1024).toFixed(1);
  return `<section class="page-wrap detail-page">
    <a href="#/matkul" class="back-link">← Semua mata kuliah</a>
    <div class="course-detail-heading" style="--note-color:${escapeHTML(course.color || "#ffe38a")}"><span class="detail-emoji" aria-hidden="true">${escapeHTML(course.emoji || "📚")}</span>
      <div><p class="eyebrow">${escapeHTML(course.code || "")} · ${escapeHTML(course.semester || "Semester —")}</p><h1>${escapeHTML(course.name)}</h1><p>${escapeHTML(course.lecturer || "Dosen belum diisi")}</p></div>
      <div class="heading-actions"><button class="button button-secondary" data-action="edit-course" data-id="${escapeHTML(course.id)}" type="button">Ubah matkul</button><button class="button button-secondary danger-text" data-action="delete-course" data-id="${escapeHTML(course.id)}" type="button">Hapus</button></div>
    </div>
    <div class="detail-grid">
      <section class="panel material-panel"><div class="panel-heading"><div><p class="eyebrow">Arsip kelas</p><h2>Materi kuliah</h2></div><span class="storage-chip">${storageMB} MB terpakai</span></div>
        <label class="drop-zone" id="drop-zone"><input id="material-input" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple>
          <span class="upload-icon" aria-hidden="true">↑</span><strong>Tarik file ke sini atau <span>pilih dari perangkat</span></strong><small>PDF, PPT, PPTX · maksimal 25 MB per file</small>
        </label><p id="upload-message" class="form-message" aria-live="polite"></p>
        <label class="search-field">⌕ <input id="material-search" type="search" placeholder="Cari materi..." aria-label="Cari materi"></label>
        <div id="materials-list" class="materials-list">${renderMaterials(files)}</div>
      </section>
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">Yang harus dikerjakan</p><h2>Tugas kelas</h2></div><button class="small-button" data-action="new-task" data-course="${escapeHTML(course.id)}" type="button">＋ Tambah</button></div>
        ${tasks.length ? `<div class="task-list">${tasks.map((task) => taskRow(task, state)).join("")}</div>` : emptyState("Belum ada tugas", "Catat deadline kelas ini agar tidak terlewat.", `<button class="button button-primary" data-action="new-task" data-course="${escapeHTML(course.id)}" type="button">＋ Catat tugas</button>`)}
      </section>
    </div>
  </section>`;
}

function renderMaterials(files) {
  if (!files.length) return emptyState("Belum ada materi", "Unggah catatan atau slide pertamamu.");
  return files.map((file) => `<article class="material-row" data-material-name="${escapeHTML(file.name.toLowerCase())}">
    <span class="file-icon ${file.type === "pdf" ? "pdf-icon" : "ppt-icon"}" aria-hidden="true">${file.type.toUpperCase()}</span>
    <div class="material-info"><h3>${escapeHTML(file.name)}</h3><p>${formatSize(file.size)} <span aria-hidden="true">·</span> ${formatDate(file.uploadedAt)}</p></div>
    <div class="material-actions">${file.type === "pdf" ? `<button class="small-button" data-action="preview-file" data-id="${escapeHTML(file.id)}" aria-label="Pratinjau ${escapeHTML(file.name)}">Lihat</button>` : ""}
      <button class="small-button" data-action="download-file" data-id="${escapeHTML(file.id)}" aria-label="Unduh ${escapeHTML(file.name)}">Unduh</button>
      <button class="small-button" data-action="rename-file" data-id="${escapeHTML(file.id)}" aria-label="Ganti nama ${escapeHTML(file.name)}">Ubah nama</button>
      <button class="small-button danger-text" data-action="delete-file" data-id="${escapeHTML(file.id)}" aria-label="Hapus ${escapeHTML(file.name)}">Hapus</button>
    </div></article>`).join("");
}

function renderTasks(state) {
  const active = state.tasks.filter((task) => task.status !== "selesai").sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const action = `<button class="button button-primary" data-action="new-task" type="button">＋ Tambah tugas</button>`;
  return `<section class="page-wrap">${pageHeader("Daftar pekerjaan", "Tugas", "Satu per satu, semua bisa dibereskan.", action)}
    <section class="panel filter-panel"><label>Mata kuliah<select id="filter-course"><option value="">Semua mata kuliah</option>${state.courses.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join("")}</select></label>
    <label>Status<select id="filter-status"><option value="">Semua status</option><option value="belum">Belum selesai</option><option value="selesai">Selesai</option></select></label>
    <label>Prioritas<select id="filter-priority"><option value="">Semua prioritas</option><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select></label></section>
    <section id="task-results" class="panel task-results">${renderTaskResults(state)}</section>
    <section class="reminder-notice"><strong>🔔 Pengingat hanya aktif saat tab terbuka.</strong><span>Atur pengingat tiap tugas atau ekspor deadline ke kalender (.ics).</span><button class="small-button" data-action="request-notification" type="button">Minta izin notifikasi</button></section>
  </section>`;
}

function renderTaskResults(state, filters = {}) {
  const tasks = state.tasks.filter((task) =>
    (!filters.course || task.courseId === filters.course) &&
    (!filters.status || task.status === filters.status) &&
    (!filters.priority || task.priority === filters.priority)
  ).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  return tasks.length ? `<div class="task-list">${tasks.map((task) => taskRow(task, state)).join("")}</div>` : emptyState("Tugas tidak ditemukan", "Coba ubah filter atau tambahkan tugas baru.");
}

function renderInfo(title, subtitle, body) {
  return `<section class="page-wrap info-page"><p class="eyebrow">ingetin · ruang kuliahmu</p><h1>${title}</h1><p class="info-subtitle">${subtitle}</p><article class="panel info-content">${body}</article><a class="back-link" href="#/">← Kembali ke beranda</a></section>`;
}

export function renderFilteredTasks(state, filters) {
  return renderTaskResults(state, filters);
}

export { escapeHTML, formatDate, formatSize, renderMaterials };
