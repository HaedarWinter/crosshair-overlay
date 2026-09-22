# PRD: Crosshair Overlay (Crosshair-Only) v2.0

**Status:** Draft, siap dieksekusi agent
**Platform target:** Windows 10/11 x64 (distribusi .exe)
**Stack:** Electron (tetap), settings UI vanilla HTML/CSS/JS bergaya shadcn/ui
**Referensi visual:** `design-ref/` (export Stitch, hanya referensi, lihat Bagian 6)

---

## 1. Problem Statement

Project saat ini adalah satu app Electron yang menumpuk banyak fitur: crosshair, iPhone Handcam, Keyboard & Mouse Overlay, PNG Tuber, Moonwalk Macro, dan Performance Profiles. Untuk teman yang hanya butuh crosshair, app ini terlalu besar, punya dependency native (`uiohook`) yang mempersulit build Windows, meminta izin yang tidak relevan, dan UI settings-nya tidak konsisten. Beberapa opsi crosshair (radial gradient, anchor point, rotation) jarang berguna untuk crosshair game yang butuh kontras jelas.

Jika tidak dirapikan, app sulit dibagikan sebagai .exe, sulit di-maintain, dan pengguna baru bingung dengan fitur yang tidak mereka perlukan.

---

## 2. Goals

1. **Fokus satu fungsi.** App hanya berisi crosshair overlay. Nol sisa kode, dependency, atau hotkey fitur lain.
2. **Mudah dibagikan.** Teman bisa mengunduh satu installer atau portable .exe dan langsung memakainya, tanpa Node.js dan tanpa internet.
3. **Tetap ringan.** Crosshair statis memakai CPU idle mendekati 0% dan tidak ada loop render kontinu.
4. **UI konsisten dan bersih.** Settings window mengikuti gaya shadcn/ui (zinc, dense, 1px border, transisi halus) tanpa elemen dekoratif atau teks palsu.
5. **Bisa dites di berbagai latar.** Pengguna dapat mengganti wallpaper di settings untuk mengecek visibilitas crosshair di latar terang, gelap, dan ramai.

## 3. Non-Goals

| Di luar scope | Alasan |
|---|---|
| Handcam, Keyboard/Mouse Overlay, PNG Tuber, Moonwalk Macro | Dipisah dari produk ini. Bukan kebutuhan pengguna target. |
| Performance Profiles (Ultra Low/Balanced/Visual) | Hanya ada satu mode: ringan. Tidak perlu pilihan. |
| Radial gradient, anchor point, rotation | Jarang berguna, menambah kompleksitas UI dan kode. (Rotation bisa dikembalikan, lihat Open Questions.) |
| Reaksi ke state game (recoil bloom, movement spread) | Overlay tidak punya akses ke state game. Tidak bisa diimplementasikan. |
| Exclusive Fullscreen hook / injeksi ke DirectX/Vulkan | Berisiko terkait anti-cheat dan di luar pendekatan overlay window. Hanya Borderless/Windowed. |
| Multi-profil, import/export kode crosshair, auto-update, build macOS/Linux | Fase berikutnya. Hindari scope creep di v2.0. |

---

## 4. User Stories

**Pemain game (pengguna utama)**
- Sebagai pemain, saya ingin crosshair muncul tepat di tengah layar di atas game borderless, agar bidikan saya terbantu tanpa mengganggu input.
- Sebagai pemain, saya ingin mengatur bentuk, ukuran, ketebalan, gap, warna, dan outline, agar crosshair terlihat jelas di map yang saya mainkan.
- Sebagai pemain, saya ingin menyalakan atau mematikan crosshair dengan satu hotkey, agar tidak perlu keluar dari game.
- Sebagai pemain dengan lebih dari satu monitor, saya ingin memilih monitor tujuan, agar crosshair muncul di layar game.
- Sebagai pemain, saya ingin menggeser crosshair dengan offset X/Y, agar sesuai dengan posisi bidikan game tertentu.
- Sebagai pemain, saya ingin mengganti wallpaper preview (preset atau gambar sendiri), agar bisa mengecek apakah warna crosshair terlihat di latar terang, gelap, maupun ramai.

**Teman penerima app**
- Sebagai teman yang menerima file, saya ingin menjalankan .exe tanpa instalasi tambahan, agar tidak perlu paham Node.js.
- Sebagai teman, saya ingin tahu kenapa Windows menampilkan peringatan SmartScreen, agar saya yakin file ini aman untuk dijalankan (dijelaskan di README).

**Edge case**
- Sebagai pengguna lama, saya ingin file settings lama tetap terbaca tanpa crash walau ada key fitur yang sudah dihapus.
- Sebagai pengguna, saya ingin wallpaper yang hilang atau rusak otomatis diganti preset default, agar UI tidak kosong.
- Sebagai pengguna dengan monitor yang dicabut, saya ingin crosshair otomatis pindah ke monitor utama.

---

## 5. Requirements

### P0: Wajib ada

**P0-1. Pemisahan fitur (crosshair-only)**
Hapus handcam, keyboard overlay, PNG tuber, moonwalk macro, performance profiles, radial gradient, anchor point, rotation, beserta file, IPC handler, hotkey, dependency, dan entitlement/permission yang hanya dipakai oleh fitur tersebut.
- [ ] `grep -ri "handcam\|uiohook\|tuber\|moonwalk\|keyboard-overlay"` pada source dan `package.json` hasilnya 0.
- [ ] `npm ls` tidak menampilkan native module.
- [ ] App tidak meminta izin Camera, Microphone, atau Accessibility.

**P0-2. Fitur crosshair yang dipertahankan**
| Fitur | Spesifikasi |
|---|---|
| Shape | Cross, Dot, Circle, T-Shape |
| Size / Thickness / Gap | Slider + input numerik (px) |
| Opacity | 0-100% |
| Arms | Toggle Top/Left/Right/Bottom independen |
| Color | Swatch + popover picker + input HEX |
| Outline | On/off, warna, lebar |
| Center dot | On/off, ukuran |
| Offset X / Y | -200 sampai 200 px dari pusat monitor terpilih, tombol "Center" |
| Monitor | Pilih display yang terhubung, fallback ke primary |
| Hotkey | F8 toggle overlay, F7 toggle settings, keduanya bisa di-rebind |
- [ ] Setiap perubahan tampil di overlay dan preview tanpa restart.
- [ ] Rebind hotkey menolak tombol yang sama untuk dua aksi.
- [ ] Preview dan overlay memakai **satu fungsi draw yang sama** (tidak ada duplikasi logika).

**P0-3. Perilaku performa (dipertahankan dari versi lama)**
- [ ] Canvas overlay hanya digambar ulang saat setting atau bounds monitor berubah. Tidak ada `requestAnimationFrame` loop saat statis.
- [ ] Window overlay menyesuaikan ukuran ke dimensi crosshair (termasuk outline dan offset).
- [ ] Mouse click-through aktif (`setIgnoreMouseEvents`), always-on-top.
- [ ] Penulisan settings ke disk di-debounce 500ms.
- [ ] Overlay window **tidak pernah** memuat wallpaper.
- [ ] Idle CPU crosshair statis mendekati 0% (dicek manual di Task Manager).

**P0-4. Settings window baru (shadcn-style)**
Window 880x560 frameless, titlebar kustom (minimize, close). Layout: kolom kiri Preview (340px), kolom kanan Tabs **Crosshair / Position / Appearance**. Detail di Bagian 6.
- [ ] Tidak ada sidebar, badge versi, avatar, atau status palsu.
- [ ] Semua kontrol memakai grid dua kolom yang sejajar.
- [ ] Nol request jaringan saat runtime (font, ikon, gambar semuanya lokal).
- [ ] Transisi mengikuti spesifikasi Bagian 6 dan mati pada `prefers-reduced-motion`.

**P0-5. Wallpaper yang bisa diganti**
- Setting: `wallpaper { source, blur: 0-24, dim: 0-80 }`.
- 6 preset di `assets/wallpapers/*.webp` (maks 200KB, 1600x1000): gelap, lapangan terang, langit terang, kota ramai, interior gelap, hitam polos. Jika agent tidak bisa membuat gambar, buat placeholder procedural dan laporkan.
- Upload gambar sendiri: `dialog.showOpenDialog` (png/jpg/webp, maks 10MB), di-downscale maks 1920px, disalin ke `userData/wallpapers/`. Simpan hanya nama file di settings, bukan base64.
- Wallpaper dipakai sebagai background window dan backdrop Preview, dengan crossfade 300ms.
- [ ] Given wallpaper dipilih, When app di-restart, Then wallpaper yang sama tampil.
- [ ] Given file wallpaper hilang, When app dibuka, Then preset default dipakai tanpa error.
- [ ] Given file bukan gambar atau lebih dari 10MB, When diunggah, Then ditolak dengan pesan singkat.
- [ ] Gambar dari export Stitch **tidak** dibundel (lisensi tidak jelas).

**P0-6. Migrasi settings**
- Tambah field `schemaVersion: 2`.
- Loader membuang key yang tidak dikenal, mengisi key yang hilang dengan default, dan tidak pernah crash pada JSON rusak (fallback ke default).
- Binding hotkey lama (F9, F10) diabaikan. F7 = settings, F8 = overlay.
- Nama folder config tetap `crosshair-overlay` agar settings lama terbaca.
- [ ] Settings lama dari versi 1.x dimuat tanpa error dan nilai crosshair-nya tetap.

**P0-7. Packaging Windows**
- electron-builder: NSIS installer + portable .exe, x64, asar aktif.
- `build/icon.ico` (placeholder jika belum ada, laporkan).
- `files` whitelist mengecualikan `design-ref/`, `DESIGN.md`, `docs`, `PRD`.
- Script `dist:win`. Jika mesin bukan Windows, jangan build lokal: buat `.github/workflows/build-win.yml` (`windows-latest`, upload artifact).
- README baru khusus crosshair (maks 60 baris) berisi cara pakai, hotkey, tips borderless windowed, dan catatan SmartScreen (unsigned: *More info -> Run anyway*).
- [ ] .exe berjalan di PC Windows bersih tanpa Node.js dan tanpa internet.

### P1: Nice-to-have (fast follow)
- Preset crosshair bawaan (mis. 4-5 gaya umum) di tab Crosshair.
- Ukuran wallpaper upload otomatis dirapikan agar penyimpanan tidak membengkak (batas jumlah file di `userData/wallpapers/`).
- Tooltip singkat pada kontrol yang butuh penjelasan (Gap, Arms).
- Pesan kosong/error yang jelas untuk upload wallpaper gagal.

### P2: Pertimbangan masa depan (arsitektur jangan menghalangi)
- Multi-profil dan import/export kode crosshair (skema settings dibuat rapi dan ber-versi).
- Code signing untuk menghilangkan peringatan SmartScreen.
- Auto-update.
- Build macOS (kode tetap cross-platform, hanya file mac-only dihapus).
- Rotation (jika ternyata dibutuhkan, lihat Open Questions).

---

## 6. Spesifikasi Desain (ringkas)

Referensi: folder `design-ref/` (screenshot + `DESIGN.md` dari Stitch). **Pakai hanya screenshot dan `obsidian_precision/DESIGN.md` sebagai referensi visual.** Jangan salin markup `code.html` (memakai Tailwind CDN, Material Symbols, dan gambar remote).

**Token (zinc, dark only):** base `#09090b`, surface `#18181b`, hover `#27272a`, border `rgba(39,39,42,.6)`, primary `#fafafa`, muted `#a1a1aa`, meta `#71717a`. Abaikan token bergaya Material di front matter `DESIGN.md` referensi.
**Tipografi:** Geist (woff2 lokal, fallback `system-ui`, tidak pernah serif). Body 13px, label 12px medium, section title 11px uppercase. Angka `tabular-nums`. Mono hanya untuk Kbd.
**Bentuk:** radius 8px kartu/input, 6px kontrol kecil. Grid 4px. Tanpa gradient, glow, shadow (kecuali popover), emoji.
**Ikon:** SVG lucide inline (tanpa CDN atau paket npm runtime).

**Perubahan wajib terhadap referensi Stitch (design deltas):**
1. Tanpa sidebar, badge versi, avatar, status "Active Overlay", dan Profiles.
2. Tanpa teks/telemetri palsu: latency, render pipe, FOV, luminance, target ID, resolusi/Hz, "REALTIME", "HUD RENDER", "AA compliant", "VALORANT-SPEC".
3. Hapus: Firing Error Spread, Movement Error, Hardware Acceleration, Window Mode, kartu "Inverted Outer Halo", "Center locking", "Test Mode".
4. Offset X/Y hanya di tab Position.
5. Label polos: Size, Thickness, Gap, Opacity, Arms, Color, Outline, Center dot, Offset X, Offset Y, Monitor, Hotkey, Blur, Dim. Helper text maksimal 6 kata atau dihilangkan.
6. Slider minimal 140px dengan input numerik rata kanan. Semua baris memakai grid dua kolom yang sama.
7. Preview hanya berisi: wallpaper + crosshair + zoom (1x/2x/4x) + switch "Show overlay" dengan Kbd F8.
8. Saat overlay off: kontrol crosshair 40% opacity dan `pointer-events: none`.

**Transisi:** 150ms ease-out default. Tab: fade + geser 4px (180ms) dengan indikator geser. Baris kondisional (Outline, Center dot) expand 200ms. Wallpaper crossfade 300ms. Tombol hotkey saat menunggu tombol: border berdenyut halus. Preview crosshair update **instan**. Semua mati pada `prefers-reduced-motion`.

---

## 7. Arsitektur Target

```
Electron Main (main.js)
├── Overlay Window   overlay.html + overlay.js   -> canvas statis, click-through
├── Settings Window  settings.html/.css/.js      -> UI shadcn-style, IPC throttled
├── shared/draw-crosshair.js                     -> satu fungsi draw untuk overlay + preview
└── settings-store.js                            -> load/migrate/debounced save (schemaVersion 2)
```

Skema settings v2 (ringkas): `schemaVersion, overlayEnabled, shape, size, thickness, gap, opacity, color, arms{top,left,right,bottom}, outline{enabled,width,color}, centerDot{enabled,size}, offset{x,y}, monitorId, hotkeys{toggleOverlay,toggleSettings}, wallpaper{source,blur,dim}`.

Catatan: struktur file di atas adalah target, bukan aturan mutlak. Agent boleh menyesuaikan dengan struktur yang sudah ada selama logika draw tetap satu sumber dan overlay tidak memuat wallpaper.

---

## 8. Success Metrics

**Leading (hari-minggu setelah rilis)**
| Metrik | Target | Cara ukur |
|---|---|---|
| Waktu dari unduh sampai crosshair tampil | <= 2 menit | Uji manual di PC Windows bersih |
| Idle CPU crosshair statis | ~0% (di bawah 1%) | Task Manager selama 60 detik |
| Sisa kode fitur lama | 0 hasil grep | Checklist P0-1 |
| Settings lama termuat tanpa error | 100% dari sampel | Uji dengan file settings 1.x |
| Penerima yang berhasil menjalankan tanpa bantuan | 5 dari 5 teman | Uji langsung |

**Lagging (minggu-bulan)**
- Teman masih memakai app setelah 2-4 minggu.
- Jumlah pertanyaan/masalah instalasi yang masuk (target: turun ke mendekati 0 setelah README diperbaiki).
- Ukuran installer wajar untuk app Electron (target awal <= 120MB, dicek setelah build pertama).

Target di atas adalah hipotesis awal, bukan patokan yang sudah divalidasi.

---

## 9. Open Questions

| # | Pertanyaan | Untuk | Blocking? | Default jika tidak dijawab |
|---|---|---|---|---|
| 1 | Rotation dibuang atau dipertahankan? | Owner | Tidak | Dibuang |
| 2 | Perlu build macOS untuk teman lain? | Owner | Tidak | Tidak (Windows saja) |
| 3 | Apakah perlu code signing untuk menghindari SmartScreen? | Owner | Tidak | Tidak, cukup catatan README |
| 4 | Sumber gambar preset wallpaper (foto sendiri / CC0 / procedural)? | Owner | Tidak | Procedural placeholder |
| 5 | Apakah F7/F8 bentrok dengan game yang dimainkan teman? | Owner | Tidak | Sudah bisa di-rebind |
| 6 | Isi aktual `main.js` dan struktur IPC saat ini (PRD ini hanya berdasar README) | Engineering (agent, Phase 0) | Ya, untuk Phase 1 | Diaudit di Phase 0 |

---

## 10. Timeline & Fase

Tidak ada tenggat keras. Urutan fase mengikuti dependensi: audit -> hapus -> desain -> UI -> wallpaper -> packaging. Setiap fase selesai dengan ringkasan singkat, lalu berhenti menunggu persetujuan.

| Fase | Isi | Selesai jika |
|---|---|---|
| 0 | Audit (tanpa edit) | Tabel file: keep/delete/modify + daftar dependency yang dihapus |
| 1 | Penghapusan fitur + migrasi settings | App tetap jalan dengan overlay + settings lama, tanpa native module |
| 2 | `DESIGN.md` dari `design-ref/` | Token + design deltas tertulis (maks 60 baris) |
| 3 | Settings UI baru | Tiga tab berfungsi, preview = overlay |
| 4 | Wallpaper | Preset, upload, blur/dim, persist |
| 5 | Packaging + README | .exe atau workflow CI + README baru |

---

## 11. Instruksi untuk Agent (English, copy as-is)

```
Read this PRD once. Implement it phase by phase (Section 10).

TOKEN RULES (strict)
- After each phase: list changed files + max 5 lines summary, then STOP and wait for "next".
- Use grep / line ranges. Never read a whole file unless you will edit most of it.
- Never re-read a file you just edited. Prefer targeted edits over rewrites.
- No recap of the PRD, no code dumps in chat, no explanations unless asked.
- Read design-ref/ only in Phase 2 (screen.png + obsidian_precision/DESIGN.md).
  Never open design-ref/**/code.html. Do NOT call Stitch MCP.
- Do not run npm install/build or open a browser except where a phase requires it.
- Do not ask questions unless blocked; use the defaults in Open Questions.

RULES
- If a control is not listed in Requirements P0-2, do not build it.
- Zero runtime network requests. No CDN, Google Fonts, or remote images.
- Never invent telemetry, badges, or decorative text in the UI.
- Phase 0 is read-only: read package.json; grep main.js for
  BrowserWindow|ipcMain|globalShortcut|require. Report file | keep/delete/modify | reason.
- This PRD was written from the README only. Phase 0 must flag anything in the real
  code that contradicts it, and STOP if a contradiction affects scope.
- If a machine is not Windows, do not build; create the GitHub Actions workflow.

DONE WHEN
- App launches; F7/F8 work; preview and overlay look identical.
- grep for handcam|uiohook|tuber|moonwalk = 0 results.
- Old settings file loads without errors.
- Wallpaper persists after restart; overlay window never loads it.
- Idle CPU with a static crosshair is near 0%.
- Installer or CI workflow produces a Windows .exe.
```