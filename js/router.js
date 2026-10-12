const ROUTES = new Set(["/", "/dashboard", "/matkul", "/tugas", "/tentang", "/privasi", "/syarat", "/kontak"]);

export function getRoute() {
  const raw = window.location.hash.slice(1) || "/";
  const path = raw.split("?")[0].replace(/\/+$/, "") || "/";
  const match = path.match(/^\/matkul\/([^/]+)$/);
  if (match) return { page: "detail", id: decodeURIComponent(match[1]) };
  return { page: ROUTES.has(path) ? path.slice(1) || "home" : "404" };
}

export function onRouteChange(callback) {
  window.addEventListener("hashchange", callback);
}
