# Emek Gündemi - Haber Yönetim Paneli

Türkiye emek ve kamu dünyası haberlerini toplayan, AI ile özetleyen ve sosyal medyada paylaşmaya hazırlayan özel yönetim paneli.

## 🚀 Özellikler

- **Haber Çekme**: Resmî Gazete, bakanlıklar ve resmi kaynaklardan haber toplama
- **AI İşleme**: OpenAI (ChatGPT) ile otomatik özet ve yorum oluşturma
- **Paylaşım**: Telegram, WhatsApp, X için hazır format
- **Güvenlik**: Sadece admin erişimi, middleware koruması

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# .env dosyasına API anahtarlarını ekle
# OPENAI_API_KEY=sk-...
# TELEGRAM_BOT_TOKEN=...

# Geliştirme sunucusu
npm run dev
```

## 🔐 Giriş Bilgileri

- **E-posta**: admin@emekgundemi.com
- **Şifre**: admin123

> ⚠️ Canlıya almadan önce şifreyi değiştirin!

## 🛠️ Teknolojiler

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API
- Prisma (PostgreSQL)

## 📁 Proje Yapısı

```
src/
├── app/
│   ├── login/           # Giriş sayfası
│   ├── admin/
│   │   ├── dashboard/   # Ana panel
│   │   └── settings/    # API ayarları
│   └── api/
│       ├── auth/        # Oturum yönetimi
│       └── ai/          # AI işleme
├── lib/
│   ├── ai/              # OpenAI entegrasyonu
│   ├── scrapers/        # Haber çekiciler
│   └── social/          # Sosyal medya
└── middleware.ts        # Rota koruması
```

## 🌐 Deployment

VDS'e deploy için:

```bash
npm run build
npm start
```

## 📄 Lisans

MIT
