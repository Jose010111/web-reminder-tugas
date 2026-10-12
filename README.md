# ingetin

ingetin adalah papan pengumuman digital pribadi untuk mahasiswa. Kelompokkan mata kuliah, simpan materi PDF/PPT/PPTX di perangkat, catat deadline dan pengingat, serta ekspor tugas ke kalender.

## Fitur

- Data mata kuliah dan tugas tersimpan di `localStorage`; file materi disimpan sebagai Blob di IndexedDB.
- Unggah materi PDF, PPT, atau PPTX hingga 25 MB per file, pratinjau PDF, unduh, ganti nama, dan hapus.
- Filter tugas, penanda deadline terlambat, pengingat browser/toast, dan ekspor kalender `.ics`.
- Ekspor/impor JSON untuk metadata mata kuliah dan tugas. **File materi tidak termasuk dalam cadangan.**
- Mode gelap dan tampilan responsif.

## Menjalankan secara lokal

1. Buka folder proyek di terminal.
2. Jalankan server statis lokal, misalnya dengan Python yang sudah tersedia:

   ```sh
   python -m http.server 8000
   ```

3. Buka `http://localhost:8000` di browser.

Jangan membuka `index.html` langsung melalui `file://`: modul ES dan IndexedDB memerlukan origin server lokal. Tidak ada proses build atau dependency yang perlu dipasang.

## Deploy ke GitHub Pages

1. Buat repository GitHub dan unggah seluruh berkas proyek.
2. Di **Settings → Pages**, pilih **Deploy from a branch**, pilih branch utama dan folder root (`/`), lalu simpan.
3. Tunggu GitHub Pages menerbitkan situs, lalu buka URL yang ditampilkan di pengaturan Pages.

Semua rute aplikasi memakai hash (`#/dashboard`, `#/matkul`, dan seterusnya), jadi navigasi tetap berfungsi pada hosting statis. Data tersimpan per browser/perangkat dan tidak disinkronkan ke situs yang di-deploy.
