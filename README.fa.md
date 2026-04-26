# EazyVercel — رله‌ی XHTTP از طریق Vercel Edge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Telegram](https://img.shields.io/badge/Telegram-@schmi7zz-blue?logo=telegram)](https://t.me/schmi7zz)

> 🇬🇧 [English version](README.md)

یه Edge Function ساده‌ی Vercel که ترافیک XHTTP رو از کلاینت‌های توی شبکه‌های محدود (مثل ایران) به یه سرور Xray بک‌اند رله می‌کنه. هدفش دور زدن فیلترینگ IP-based با عبور ترافیک از CDN معتبر Vercel ـه.

## معماری

```
کلاینت (ایران)
    │  TLS:443 → relay.YOUR-DOMAIN.com  (پشت Vercel)
    ▼
Vercel Edge Function
    │  HTTP → TARGET_DOMAIN  (سرور مبدأ)
    ▼
Xray xhttp inbound
    │
    ▼
اینترنت آزاد
```

کلاینت هیچ‌وقت IP سرور مبدأ رو resolve نمی‌کنه — فقط Vercel این مسیر رو می‌بینه. از نظر ISP فقط یه HTTPS request به یه دامنه‌ی CDN-fronted ـه.

## پیش‌نیازها

- یه سرور لینوکس با IP پابلیک
- یه دامنه که خودت کنترلش رو داری
- اکانت Vercel (Hobby رایگانه)
- یه سرور Xray (3X-UI Sanaei پیشنهاد می‌شه)

## دیپلوی سریع

```bash
git clone https://github.com/schmi7zz/eazyvercel
cd eazyvercel
npm i -g vercel
vercel login
vercel --prod
```

بعد تو داشبورد Vercel متغیر `TARGET_DOMAIN` رو ست کن:

```
TARGET_DOMAIN = http://backend.YOUR-DOMAIN.com:2096
```

و یه دامنه‌ی custom (مثل `relay.YOUR-DOMAIN.com`) از Settings → Domains اضافه کن. بعد redeploy:

```bash
vercel --prod
```

## تنظیم DNS

دو رکورد روی دامنه‌ت:

| Type | Name | Value | کارش |
|------|------|-------|---------|
| A | `backend` | IP سرورت | فقط Vercel resolve می‌کنه |
| CNAME | `relay` | `cname.vercel-dns.com` | کلاینت می‌بینه |

هر دو باید **DNS only** باشن (Cloudflare proxy خاموش)، وگرنه TLS Vercel نمی‌تونه ساخته بشه.

## نصب سرور (Xray inbound)

نصب 3X-UI Sanaei:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

تو پنل، **پورت Subscription رو از 2096 جابجا کن** (پیش‌فرضش 2096 ـه، با inbound تداخل می‌کنه).

inbound جدید بساز:

| فیلد | مقدار |
|-------|-------|
| Protocol | `vless` |
| Port | `2096` |
| Network | `xhttp` |
| Path | `/your-path` |
| Mode | `auto` |
| Security | `none` (TLS رو Vercel انجام می‌ده) |

## لینک کلاینت

```
vless://YOUR-UUID@relay.YOUR-DOMAIN.com:443?encryption=none&security=tls&sni=relay.YOUR-DOMAIN.com&fp=chrome&alpn=h2%2Chttp%2F1.1&type=xhttp&host=relay.YOUR-DOMAIN.com&path=%2Fyour-path&mode=auto#vercel-relay
```

## کلاینت‌های سازگار

- ✅ Hiddify Next ≥ 2.0
- ✅ v2rayNG ≥ 1.9.5
- ✅ v2rayN ≥ 7.4 (ویندوز)
- ✅ NekoBox ≥ 1.3
- ❌ NPV Tunnel، HTTP Injector، HTTP Custom (xhttp ساپورت نمی‌کنن)

## عیب‌یابی

| نشانه | علت / راه حل |
|---------|-------------|
| `308 redirect loop` | `TARGET_DOMAIN` به دامنه‌ی Vercel اشاره می‌کنه — به origin اشاره کن |
| `Direct IP access not allowed` | Vercel آی‌پی خام نمی‌پذیره — یه دامنه استفاده کن |
| `502/504` | origin در دسترس نیست. `ss -tlnp \| grep 2096` چک کن |
| `bind: address already in use` | Sub server با inbound روی یه پورت ـه — جابجا کن |
| کلاینت وصل می‌شه ولی ترافیک رد نمی‌شه | xhttp تو کلاینت ساپورت نمی‌شه — اپ رو آپدیت کن |
| دامنه از ایران در دسترس نیست | TLD احتمالاً فیلتره — `.com`، `.de`، `.net` امتحان کن |

## محدودیت‌ها

- Vercel Hobby: حدود ۱۰۰ گیگابایت ترافیک ماهانه، ۵۰ms CPU برای هر invocation
- Vercel متادیتای request (مسیر، IP، status) رو لاگ می‌کنه — body لاگ نمی‌شه
- IP origin باید مخفی بمونه — هرگز کنار دامنه‌ی relay منتشرش نکن

## اعتبار

فورک شده از [orilaxnet/vercel-xhttp-relay](https://github.com/orilaxnet/vercel-xhttp-relay).
ساخته و نگهداری شده توسط [Schmitz](https://t.me/schmitzws) ([@schmi7zz](https://t.me/schmi7zz)).

## لایسنس

[MIT](LICENSE)
