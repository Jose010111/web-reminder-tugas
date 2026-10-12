import { deleteFile, getFile, saveFile } from "./db.js";
import { getRoute, onRouteChange } from "./router.js";
import { checkReminders, requestNotificationPermission, setToastHandler, startReminderChecks } from "./reminder.js";
import { getState, getTheme, replaceBackup, saveState, setTheme } from "./store.js";
import { escapeHTML, formatSize, renderFilteredTasks, renderMaterials, renderPage } from "./ui.js";

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const toastRegion = document.querySelector("#toast-region");
let activePreviewUrl;

function toast(message, type = "info") {
  const item = document.createElement("div");
  item.className = `toast ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""}`;
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 5500);
}
setToastHandler(toast);

function persistState(state) {
  try {
    saveState(state);
    return true;
  } catch (error) {
    toast(error.message || "Perubahan tidak dapat disimpan.", "error");
    return false;
  }
}

async function storageUsage() {
  const state = getState();
  return state.materials.reduce((total, file) => total + (Number(file.size) || 0), 0);
}

function render() {
  const route = getRoute();
  const state = getState();
  storageUsage().then((bytes) => {
    if (getRoute().page === route.page && getRoute().id === route.id) {
      app.innerHTML = renderPage(route, state, bytes);
      if (route.page === "tugas") applyTaskFilters();
    }
  }).catch((error) => {
    console.error("Ukuran penyimpanan materi tidak dapat dihitung.", error);
    app.innerHTML = renderPage(route, state, 0);
  });
  document.querySelector("#primary-nav").classList.remove("is-open");
  document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
}

function applyTaskFilters() {
  const results = document.querySelector("#task-results");
  if (!results) return;
  results.innerHTML = renderFilteredTasks(getState(), {
    course: document.querySelector("#filter-course").value,
    status: document.querySelector("#filter-status").value,
    priority: document.querySelector("#filter-priority").value
  });
}

function closeModal() {
  if (activePreviewUrl) {
    URL.revokeObjectURL(activePreviewUrl);
    activePreviewUrl = null;
  }
  modalRoot.innerHTML = "";
}

function openModal(title, content, options = {}) {
  closeModal();
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close">
    <section class="modal ${options.wide ? "modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header"><h2 id="modal-title">${escapeHTML(title)}</h2><button class="icon-button" type="button" data-action="close-modal" aria-label="Tutup dialog">×</button></header>
      <div class="modal-body">${content}</div>
    </section>
  </div>`;
  modalRoot.querySelector(".modal").focus?.();
  modalRoot.querySelector("input, button, iframe")?.focus();
}

function toDateTimeLocal(date) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function openCourseForm(course = null) {
  const editing = Boolean(course);
  const colors = ["#ffe38a", "#ffc4b6", "#bcebd5", "#d8c9ff", "#bde2ff", "#ffd4e3"];
  openModal(editing ? "Ubah mata kuliah" : "Mata kuliah baru", `<form class="modal-form" data-form="course">
    <input type="hidden" name="id" value="${escapeHTML(course?.id || "")}">
    <label class="form-field">Nama mata kuliah<input name="name" required maxlength="80" placeholder="Contoh: Struktur Data" value="${escapeHTML(course?.name || "")}"></label>
    <div class="form-grid">
      <label class="form-field">Kode<input name="code" maxlength="20" placeholder="IF204" value="${escapeHTML(course?.code || "")}"></label>
      <label class="form-field">Dosen<input name="lecturer" maxlength="80" placeholder="Nama dosen" value="${escapeHTML(course?.lecturer || "")}"></label>
    </div>
    <div class="form-grid">
      <label class="form-field">Semester<input name="semester" maxlength="30" placeholder="Semester 3" value="${escapeHTML(course?.semester || "")}"></label>
      <label class="form-field">Emoji<input name="emoji" maxlength="8" value="${escapeHTML(course?.emoji || "📚")}" aria-label="Emoji mata kuliah"></label>
    </div>
    <label class="form-field">Warna catatan<span class="color-field"><input name="color" type="color" value="${escapeHTML(course?.color || colors[0])}"><span>Warna sticky note mata kuliah</span></span></label>
    <div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">${editing ? "Simpan perubahan" : "Tambah mata kuliah"}</button></div>
  </form>`);
}

function openTaskForm(task = null, courseId = "") {
  const state = getState();
  if (!state.courses.length) {
    toast("Tambahkan mata kuliah terlebih dahulu sebelum mencatat tugas.", "error");
    window.location.hash = "#/matkul";
    return;
  }
  const courseOptions = state.courses.map((course) => `<option value="${escapeHTML(course.id)}" ${(task?.courseId || courseId) === course.id ? "selected" : ""}>${escapeHTML(course.name)}</option>`).join("");
  const reminders = task?.reminders || ["1d", "3h", "1h"];
  const choices = [["1d", "1 hari sebelumnya"], ["3h", "3 jam sebelumnya"], ["1h", "1 jam sebelumnya"]];
  openModal(task ? "Ubah tugas" : "Catat tugas", `<form class="modal-form" data-form="task">
    <input type="hidden" name="id" value="${escapeHTML(task?.id || "")}">
    <label class="form-field">Judul tugas<input name="title" required maxlength="120" placeholder="Contoh: Makalah algoritma" value="${escapeHTML(task?.title || "")}"></label>
    <div class="form-grid">
      <label class="form-field">Mata kuliah<select name="courseId" required>${courseOptions}</select></label>
      <label class="form-field">Prioritas<select name="priority"><option value="rendah" ${task?.priority === "rendah" ? "selected" : ""}>Rendah</option><option value="sedang" ${!task || task.priority === "sedang" ? "selected" : ""}>Sedang</option><option value="tinggi" ${task?.priority === "tinggi" ? "selected" : ""}>Tinggi</option></select></label>
    </div>
    <label class="form-field">Deadline (tanggal &amp; jam)<input name="deadline" type="datetime-local" required value="${escapeHTML(toDateTimeLocal(task?.deadline))}"></label>
    <label class="form-field">Catatan<textarea name="notes" maxlength="1000" placeholder="Detail atau tautan penting">${escapeHTML(task?.notes || "")}</textarea></label>
    <fieldset class="form-field"><legend>Ingatkan saya</legend><div class="check-options">${choices.map(([key, label]) => `<label><input type="checkbox" name="reminders" value="${key}" ${reminders.includes(key) ? "checked" : ""}> ${label}</label>`).join("")}</div></fieldset>
    <div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">${task ? "Simpan perubahan" : "Simpan tugas"}</button></div>
  </form>`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCalendar(task) {
  const start = new Date(task.deadline);
  if (Number.isNaN(start.getTime())) {
    toast("Deadline tidak valid sehingga kalender tidak dapat diekspor.", "error");
    return;
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapeICS = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ingetin//Kuliah//ID", "BEGIN:VEVENT",
    `UID:${task.id}@ingetin.local`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeICS(task.title)}`, `DESCRIPTION:${escapeICS(task.notes || "Deadline tugas — ingetin")}`,
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  downloadBlob(new Blob([content], { type: "text/calendar;charset=utf-8" }), `ingetin-${task.title.replace(/[^\w-]+/g, "-").slice(0, 40) || "tugas"}.ics`);
  toast("File kalender berhasil dibuat.", "success");
}

async function handleFileUpload(fileList) {
  const state = getState();
  const courseId = getRoute().id;
  const message = document.querySelector("#upload-message");
  if (!message) return;
  message.textContent = "";
  for (const file of Array.from(fileList)) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "ppt", "pptx"].includes(extension)) {
      message.textContent = `${file.name}: format tidak didukung. Pilih hanya PDF, PPT, atau PPTX.`;
      continue;
    }
    if (file.size > 25 * 1024 * 1024) {
      message.textContent = `${file.name}: ukuran ${formatSize(file.size)} melebihi batas 25 MB.`;
      continue;
    }
    const id = crypto.randomUUID();
    try {
      await saveFile(id, file);
      state.materials.push({ id, courseId, name: file.name, size: file.size, type: extension, uploadedAt: new Date().toISOString() });
      if (!persistState(state)) {
        try { await deleteFile(id); } catch (error) { console.error("Berkas tanpa metadata tidak dapat dibersihkan.", error); }
        return;
      }
    } catch (error) {
      console.error("Materi gagal disimpan.", error);
      message.textContent = error.message || `Materi ${file.name} gagal disimpan.`;
      continue;
    }
  }
  render();
  const refreshedMessage = document.querySelector("#upload-message");
  if (refreshedMessage && message.textContent) refreshedMessage.textContent = message.textContent;
  else if (fileList.length) toast("Unggahan materi selesai.", "success");
}

async function openMaterial(id, preview = false) {
  const state = getState();
  const metadata = state.materials.find((item) => item.id === id);
  if (!metadata) return toast("Materi tidak ditemukan.", "error");
  try {
    const blob = await getFile(id);
    if (!blob) return toast("Berkas materi tidak ditemukan di penyimpanan browser.", "error");
    const url = URL.createObjectURL(blob);
    if (preview && metadata.type === "pdf") {
      activePreviewUrl = url;
      openModal(`Pratinjau: ${metadata.name}`, `<iframe class="pdf-frame" src="${url}" title="Pratinjau berkas PDF ${escapeHTML(metadata.name)}"></iframe>`, { wide: true });
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = metadata.name;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    console.error("Materi gagal dibuka.", error);
    toast("Berkas tidak dapat dibuka. Coba muat ulang halaman.", "error");
  }
}

async function handleAction(action, element, clickEvent) {
  const id = element.dataset.id;
  const state = getState();
  if (action === "new-course") openCourseForm();
  else if (action === "edit-course") {
    const course = state.courses.find((item) => item.id === id);
    if (course) openCourseForm(course);
  } else if (action === "delete-course") {
    const course = state.courses.find((item) => item.id === id);
    if (!course || !window.confirm(`Hapus mata kuliah "${course.name}" beserta semua materi dan tugas di dalamnya? Tindakan ini tidak dapat dibatalkan.`)) return;
    const materialIds = state.materials.filter((file) => file.courseId === id).map((file) => file.id);
    state.courses = state.courses.filter((item) => item.id !== id);
    state.materials = state.materials.filter((item) => item.courseId !== id);
    state.tasks = state.tasks.filter((item) => item.courseId !== id);
    if (!persistState(state)) return;
    for (const fileId of materialIds) {
      try { await deleteFile(fileId); } catch (error) { console.error(`Berkas ${fileId} tidak dapat dihapus.`, error); toast("Sebagian berkas tidak dapat dihapus dari penyimpanan browser.", "error"); }
    }
    toast("Mata kuliah dan seluruh isinya dihapus.", "success");
    window.location.hash = "#/matkul";
    render();
  } else if (action === "new-task") openTaskForm(null, element.dataset.course || "");
  else if (action === "edit-task") {
    const task = state.tasks.find((item) => item.id === id);
    if (task) openTaskForm(task);
  } else if (action === "delete-task") {
    if (!window.confirm("Hapus tugas ini?")) return;
    state.tasks = state.tasks.filter((task) => task.id !== id);
    if (!persistState(state)) return;
    render(); toast("Tugas dihapus.", "success");
  } else if (action === "toggle-task") {
    const task = state.tasks.find((item) => item.id === id);
    if (task) {
      task.status = element.checked ? "selesai" : "belum";
      if (persistState(state)) render();
    }
  } else if (action === "request-notification") {
    try { await requestNotificationPermission(); } catch (error) { console.error("Permintaan izin notifikasi gagal.", error); toast("Permintaan izin notifikasi gagal.", "error"); }
  } else if (action === "export-ics") {
    const task = state.tasks.find((item) => item.id === id);
    if (task) exportCalendar(task);
  } else if (action === "export-json") {
    const data = { version: 1, exportedAt: new Date().toISOString(), courses: state.courses, tasks: state.tasks };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "ingetin-cadangan.json");
    toast("Cadangan dibuat. Perhatian: file materi tidak ikut diekspor.", "success");
  } else if (action === "import-json") {
    if (!window.confirm("Impor akan mengganti mata kuliah dan tugas yang ada saat ini. File materi tidak ikut diimpor; materi dari mata kuliah yang tidak ada di cadangan akan dihapus. Lanjutkan?")) return;
    document.querySelector("#import-file")?.click();
  } else if (action === "preview-file") await openMaterial(id, true);
  else if (action === "download-file") await openMaterial(id);
  else if (action === "rename-file") {
    const file = state.materials.find((item) => item.id === id);
    const name = file && window.prompt("Nama baru materi:", file.name);
    if (!file || name === null || name === undefined) return;
    const trimmed = name.trim();
    if (!trimmed) return toast("Nama materi tidak boleh kosong.", "error");
    file.name = trimmed;
    if (!persistState(state)) return;
    render(); toast("Nama materi diperbarui.", "success");
  } else if (action === "delete-file") {
    const file = state.materials.find((item) => item.id === id);
    if (!file || !window.confirm(`Hapus materi "${file.name}"?`)) return;
    state.materials = state.materials.filter((item) => item.id !== id);
    if (!persistState(state)) return;
    try { await deleteFile(id); } catch (error) { console.error("Berkas gagal dihapus dari IndexedDB.", error); toast("Metadata dihapus, tetapi berkas fisik tidak dapat dihapus.", "error"); }
    render(); toast("Materi dihapus.", "success");
  } else if (action === "close-modal") closeModal();
  else if (action === "backdrop-close" && clickEvent.target === element) closeModal();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleAction(target.dataset.action, target, event);
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const state = getState();
  if (form.dataset.form === "course") {
    const id = data.get("id") || crypto.randomUUID();
    const existing = state.courses.find((course) => course.id === id);
    const course = {
      id, name: String(data.get("name")).trim(), code: String(data.get("code") || "").trim(),
      lecturer: String(data.get("lecturer") || "").trim(), semester: String(data.get("semester") || "").trim(),
      emoji: String(data.get("emoji") || "📚").trim(), color: data.get("color") || "#ffe38a"
    };
    state.courses = existing ? state.courses.map((item) => item.id === id ? course : item) : [...state.courses, course];
    if (!persistState(state)) return;
    closeModal(); render(); toast(existing ? "Mata kuliah diperbarui." : "Mata kuliah ditambahkan.", "success");
  } else if (form.dataset.form === "task") {
    const id = data.get("id") || crypto.randomUUID();
    const existing = state.tasks.find((task) => task.id === id);
    const localDate = new Date(String(data.get("deadline")));
    if (Number.isNaN(localDate.getTime())) return toast("Masukkan tanggal dan jam deadline yang valid.", "error");
    const task = {
      id, title: String(data.get("title")).trim(), courseId: String(data.get("courseId")),
      deadline: localDate.toISOString(), priority: String(data.get("priority")),
      notes: String(data.get("notes") || "").trim(), status: existing?.status || "belum",
      reminders: data.getAll("reminders").map(String),
      sentReminders: existing?.sentReminders || []
    };
    state.tasks = existing ? state.tasks.map((item) => item.id === id ? task : item) : [...state.tasks, task];
    if (!persistState(state)) return;
    closeModal(); render(); checkReminders(); toast(existing ? "Tugas diperbarui." : "Tugas dicatat.", "success");
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.id === "material-input") {
    await handleFileUpload(target.files || []);
    target.value = "";
  } else if (target.id === "filter-course" || target.id === "filter-status" || target.id === "filter-priority") {
    applyTaskFilters();
  } else if (target.id === "import-file" && target.files?.[0]) {
    try {
      const imported = JSON.parse(await target.files[0].text());
      const oldMaterials = getState().materials;
      replaceBackup(imported);
      const importedCourseIds = new Set(imported.courses.map((course) => course.id));
      const removedMaterials = oldMaterials.filter((file) => !importedCourseIds.has(file.courseId));
      const updatedState = getState();
      updatedState.materials = updatedState.materials.filter((file) => importedCourseIds.has(file.courseId));
      if (!persistState(updatedState)) return;
      for (const file of removedMaterials) {
        try {
          await deleteFile(file.id);
        } catch (error) {
          console.error(`Berkas materi ${file.id} tidak dapat dibersihkan setelah impor.`, error);
          toast("Data berhasil diimpor, tetapi sebagian berkas materi lama tidak dapat dihapus.", "error");
        }
      }
      toast("Cadangan mata kuliah dan tugas berhasil diimpor. Materi untuk mata kuliah yang cocok tetap tersimpan.", "success");
      render();
    } catch (error) {
      console.error("Cadangan JSON tidak dapat diimpor.", error);
      toast(error.message || "Berkas JSON tidak valid.", "error");
    } finally {
      target.value = "";
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "material-search") {
    const query = event.target.value.trim().toLowerCase();
    const list = document.querySelector("#materials-list");
    if (!list) return;
    const files = getState().materials.filter((file) => file.courseId === getRoute().id && file.name.toLowerCase().includes(query));
    list.innerHTML = renderMaterials(files);
  }
});

document.addEventListener("dragover", (event) => {
  if (event.target.closest("#drop-zone")) { event.preventDefault(); document.querySelector("#drop-zone")?.classList.add("is-dragging"); }
});
document.addEventListener("dragleave", (event) => {
  if (event.target.closest("#drop-zone")) document.querySelector("#drop-zone")?.classList.remove("is-dragging");
});
document.addEventListener("drop", async (event) => {
  const zone = event.target.closest("#drop-zone");
  if (!zone) return;
  event.preventDefault(); zone.classList.remove("is-dragging");
  await handleFileUpload(event.dataTransfer?.files || []);
});

document.querySelector(".menu-toggle").addEventListener("click", (event) => {
  const nav = document.querySelector("#primary-nav");
  const open = nav.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.querySelector("#theme-toggle").addEventListener("click", () => {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next); applyTheme(); render();
});
document.querySelector(".banner-close").addEventListener("click", () => {
  document.querySelector("#storage-banner").hidden = true;
  localStorage.setItem("ingetin-banner-dismissed", "true");
});
function applyTheme() {
  const dark = getTheme() === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const button = document.querySelector("#theme-toggle");
  button.setAttribute("aria-label", dark ? "Aktifkan mode terang" : "Aktifkan mode gelap");
  button.innerHTML = `<span aria-hidden="true">${dark ? "☀" : "☾"}</span>`;
}

window.addEventListener("keydown", (event) => { if (event.key === "Escape" && modalRoot.innerHTML) closeModal(); });
onRouteChange(() => { closeModal(); render(); });
document.querySelector("#current-year").textContent = String(new Date().getFullYear());
if (localStorage.getItem("ingetin-banner-dismissed") === "true") document.querySelector("#storage-banner").hidden = true;
applyTheme();
render();
startReminderChecks();
