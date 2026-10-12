import { getState, saveState } from "./store.js";

let timerId;
let notify;

export function setToastHandler(handler) {
  notify = handler;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    notify?.("Browser ini tidak mendukung notifikasi. Pengingat dalam halaman tetap aktif selama tab terbuka.", "info");
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    notify?.("Izin notifikasi aktif. Pengingat berjalan selama tab ingetin terbuka.", "success");
    return true;
  }
  notify?.("Izin notifikasi tidak diberikan. Pengingat akan tampil sebagai toast saat tab terbuka.", "info");
  return false;
}

export function checkReminders() {
  const state = getState();
  const now = Date.now();
  const offsets = [
    { key: "1h", ms: 60 * 60 * 1000, label: "1 jam" },
    { key: "3h", ms: 3 * 60 * 60 * 1000, label: "3 jam" },
    { key: "1d", ms: 24 * 60 * 60 * 1000, label: "1 hari" }
  ];
  let changed = false;
  const dueReminders = [];
  state.tasks.forEach((task) => {
    if (task.status === "selesai" || !task.deadline) return;
    const remaining = new Date(task.deadline).getTime() - now;
    if (remaining <= 0) return;
    task.sentReminders ||= [];
    const overdueChoices = offsets.filter((offset) =>
      (task.reminders || []).includes(offset.key) &&
      !task.sentReminders.includes(offset.key) &&
      remaining <= offset.ms
    );
    if (!overdueChoices.length) return;
    const offset = overdueChoices[0];
    overdueChoices.forEach((missed) => task.sentReminders.push(missed.key));
    changed = true;
    dueReminders.push({ taskId: task.id, key: offset.key, message: `Pengingat ${offset.label}: "${task.title}" segera dikumpulkan.` });
  });
  if (changed) {
    try {
      saveState(state);
    } catch (error) {
      console.error("Status pengingat tidak dapat disimpan.", error);
      notify?.("Pengingat belum dapat dipastikan hanya tampil sekali karena penyimpanan browser gagal.", "error");
      return;
    }
  }
  dueReminders.forEach(({ taskId, key, message }) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("ingetin — deadline tugas", { body: message, tag: `${taskId}-${key}` });
      } catch (error) {
        console.error("Notifikasi browser gagal ditampilkan.", error);
        notify?.(message, "reminder");
      }
    } else {
      notify?.(message, "reminder");
    }
  });
}

export function startReminderChecks() {
  checkReminders();
  if (!timerId) timerId = window.setInterval(checkReminders, 30000);
}
