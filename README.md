# OMEGASON — Homepage

Single-file static homepage for Omegason agency.

## Stack
- Pure HTML/CSS, không build step
- Google Fonts: Fraunces + Inter Tight + JetBrains Mono
- Zero JS dependencies

## Deploy lên Vercel

### Cách 1 — CLI (nhanh nhất, ~30 giây)
```bash
npm i -g vercel
cd omegason
vercel --prod
```

### Cách 2 — Dashboard
1. Push folder này lên GitHub repo
2. Vào https://vercel.com/new
3. Import repo → Deploy (không cần config gì thêm)

### Cách 3 — Drag & drop
1. Vào https://vercel.com/new
2. Kéo thả cả folder vào trang

## Cấu trúc
```
omegason/
├── index.html       ← toàn bộ trang trong 1 file
├── vercel.json      ← headers bảo mật cơ bản
└── README.md
```

## Tuỳ chỉnh nhanh
- **Email contact** → tìm `hello@omegason.co` và thay
- **Logo / brand name** → tìm `OMEGASON` ở masthead
- **Open roles** → tìm `<!-- ============ CAREERS` và sửa block `.role`
- **Stats hero** → tìm `.hero-stats` và đổi số

## Custom domain
Sau khi deploy:
- Vercel dashboard → Project → Settings → Domains
- Add `omegason.co` (hoặc domain bạn có)
- Point DNS theo hướng dẫn của Vercel
