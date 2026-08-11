# NatFiber Editor v0.3 — Setup

## File yang perlu di-upload ke repository
Tambahkan tiga file berikut ke root repository:
- `admin.html`
- `admin.css`
- `admin.js`

File `config.js` yang sudah ada dipakai bersama oleh situs publik dan panel editor.

## URL panel
Setelah GitHub Pages selesai deploy:
`https://fahri1989.github.io/natfiber-encyclopedia/admin.html`

## Login pertama kali
Supabase Dashboard account dan Supabase Auth user adalah dua hal berbeda.

1. Buka `admin.html`.
2. Isi email administrator NatFiber yang sudah masuk allowlist.
3. Isi password minimal 6 karakter.
4. Klik **Buat akun editor pertama kali**.
5. Jika Supabase meminta konfirmasi email, buka email konfirmasi.
6. Kembali ke panel dan klik **Masuk**.

## Role
- `ADMIN`: read/write dan publish/unpublish.
- `EDITOR`: read/write draft/reviewed; tidak dapat menjadikan record public/PUBLISHED.
- `REVIEWER`: read-only internal.
- Hard delete tidak diekspos pada panel v0.3; data ilmiah dipertahankan untuk audit trail.

## Keamanan
- Public user tetap read-only via RLS.
- Panel admin memakai Supabase Auth.
- Editor allowlist disimpan di database.
- Setiap perubahan pada tabel editorial utama dicatat di `editorial_audit_log`.
- Hanya ADMIN yang boleh mengubah exposure/publication.

## Catatan
Panel v0.3 adalah editor dasar. Tahap berikutnya:
- review queue,
- edit/delete individual observation,
- DOI lookup,
- automatic citation metadata,
- canonical range builder,
- conflict resolver,
- image/license manager.
