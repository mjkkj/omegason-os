# Supplier Order Exporter — Shopify App

Shopify embedded app để export orders thành CSV gửi cho supplier (fulfill.go format).

## Tính năng

- Chọn date range bằng calendar picker
- Export tất cả paid orders trong khoảng thời gian đó
- Mỗi line item thành 1 dòng CSV riêng
- Format tương thích fulfill.go supplier upload

## Cột CSV xuất ra

| Cột | Nguồn |
|-----|-------|
| full_name | Shipping address first + last name |
| phone | Shipping phone hoặc order phone |
| email | Order email |
| address1 | Shipping address1 |
| address2 | Shipping address2 |
| city | Shipping city |
| province | Shipping provinceCode |
| zip | Shipping zip |
| country_code | Shipping countryCodeV2 |
| reference_id | Order name (e.g. #1001) |
| Quantity | Line item quantity |
| description | Line item title |
| variant_code | Line item SKU |
| variant_title | Line item variant title |
| preview | Product featured image URL |
| order_date | Order created_at (YYYY/MM/DD HH:MM:SS UTC) |
| Product Storefront Url | https://yourstore.myshopify.com/products/handle |
| Image Small | Image URL với `_small` suffix |

---

## Setup & Deploy

### Bước 1 — Tạo app trên Shopify Partners

1. Vào https://partners.shopify.com → **Apps** → **Create app** → **Create app manually**
2. Đặt tên app: `Supplier Order Exporter`
3. Copy **API key** và **API secret key**

### Bước 2 — Cài Shopify CLI (nếu chưa có)

```bash
npm install -g @shopify/cli@latest
```

### Bước 3 — Clone repo và cài dependencies

```bash
git clone https://github.com/mjkkj/omegason-os.git
cd omegason-os
npm install
```

### Bước 4 — Tạo file .env

```bash
cp .env.example .env
```

Mở `.env` và điền:
```
SHOPIFY_API_KEY=abc123_từ_partners
SHOPIFY_API_SECRET=shpss_từ_partners
SHOPIFY_APP_URL=https://placeholder.trycloudflare.com
SCOPES=read_orders,read_products
```
> URL sẽ được update sau khi chạy `npm run dev`

### Bước 5 — Cập nhật shopify.app.toml

Mở `shopify.app.toml`, thay `client_id`:
```toml
client_id = "abc123_API_key_của_bạn"
```

### Bước 6 — Setup database

```bash
npx prisma migrate dev --name init
```

### Bước 7 — Chạy dev

```bash
npm run dev
```

Lệnh này sẽ:
- Tự mở Cloudflare tunnel (không cần cài thêm gì)
- In ra URL dạng `https://xxxx.trycloudflare.com`
- Mở browser để install app vào dev store

Copy URL tunnel đó, cập nhật vào:
- `.env` → `SHOPIFY_APP_URL=https://xxxx.trycloudflare.com`
- Shopify Partners → App setup → **App URL** và **Allowed redirection URLs**:
  - `https://xxxx.trycloudflare.com/auth/callback`
  - `https://xxxx.trycloudflare.com/auth/shopify/callback`

### Bước 8 — Install app vào store

1. Vào Shopify Partners → Apps → chọn app → **Test on development store**
2. Chọn store → Install
3. App xuất hiện trong Shopify Admin → Apps

---

## Deploy lên Production

### Option A: Railway (dễ nhất)

1. Push code lên GitHub
2. Vào https://railway.app → **New Project** → **Deploy from GitHub repo**
3. Chọn repo → Add environment variables:
   ```
   SHOPIFY_API_KEY=...
   SHOPIFY_API_SECRET=...
   SCOPES=read_orders,read_products
   ```
4. Sau khi deploy xong, copy URL (e.g. `https://your-app.up.railway.app`)
5. Thêm `SHOPIFY_APP_URL=https://your-app.up.railway.app` vào Railway env vars
6. Cập nhật URL trong Shopify Partners → App setup

### Option B: Fly.io

```bash
# Cài Fly CLI
curl -L https://fly.io/install.sh | sh

# Login và launch
fly auth login
fly launch --name supplier-order-exporter

# Set secrets
fly secrets set \
  SHOPIFY_API_KEY=xxx \
  SHOPIFY_API_SECRET=xxx \
  SCOPES=read_orders,read_products \
  SHOPIFY_APP_URL=https://supplier-order-exporter.fly.dev

# Deploy
fly deploy
```

### Option C: Render

1. **New** → **Web Service** → connect GitHub repo
2. **Build command**: `npm install && npx prisma generate && npm run build`
3. **Start command**: `npm start`
4. Add env vars trong Render dashboard

---

## Sau khi deploy production

1. Vào Shopify Partners → Apps → chọn app → **App setup**
2. Cập nhật **App URL**: `https://your-production-url.com`
3. Cập nhật **Allowed redirection URLs**:
   - `https://your-production-url.com/auth/callback`
   - `https://your-production-url.com/auth/shopify/callback`
4. Reinstall app trên store (hoặc upgrade URL trong admin)

---

## Sử dụng

1. Mở **Shopify Admin** → **Apps** → **Supplier Order Exporter**
2. Chọn ngày bắt đầu và kết thúc bằng calendar
3. Nhấn **Download CSV**
4. File CSV tự download ngay

---

## Lưu ý

- Chỉ export orders có `financial_status: paid`
- Tự động phân trang — không giới hạn số lượng orders
- Cần quyền `read_orders` và `read_products`
- Thời gian order_date là UTC
