const STORAGE_KEY = "ingetin-metadata-v1";
const THEME_KEY = "ingetin-theme";

function emptyState() {
  return { courses: [], materials: [], tasks: [] };
}

export function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : []
    };
  } catch (error) {
    console.error("Data ingetin tidak dapat dibaca dari penyimpanan lokal.", error);
    return emptyState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Data ingetin tidak dapat disimpan.", error);
    throw new Error("Penyimpanan browser penuh atau tidak tersedia. Ekspor cadangan lalu kosongkan ruang.");
  }
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function replaceBackup(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.courses) || !Array.isArray(data.tasks)) {
    throw new Error("Format cadangan tidak valid. Pastikan berkas JSON berisi daftar courses dan tasks.");
  }
  const state = getState();
  const courseIds = new Set(data.courses.map((item) => item?.id).filter(Boolean));
  if (data.courses.some((item) => !item || typeof item.id !== "string" || typeof item.name !== "string") ||
      data.tasks.some((item) => !item || typeof item.id !== "string" || typeof item.title !== "string" || !courseIds.has(item.courseId))) {
    throw new Error("Isi cadangan tidak valid atau ada tugas dengan mata kuliah yang tidak tersedia.");
  }
  saveState({ ...state, courses: data.courses, tasks: data.tasks });
}
