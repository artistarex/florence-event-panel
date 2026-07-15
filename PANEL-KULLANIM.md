# Yönetim Paneli — Kullanım Kılavuzu

Bu klasör, Florence Event Design sitesinin **içerik yönetim paneli**dir —
sitenin kendisinden tamamen ayrı, bağımsız bir pakettir. Site dosyaları
(`FlorenceEventDesign` klasörü) Cloudflare Pages'te olduğu gibi kalır; bu
panel klasörü sadece siz kullanmak istediğinizde, ayrı bir yerde (bilgisayarınızda
veya Render gibi bir barındırma hizmetinde) çalıştırılır. Panel üzerinden
kaydettiğiniz her metin/fotoğraf değişikliği, siteyi yeniden yayınlamanıza
gerek kalmadan Cloudflare'deki siteye yansır (bkz. "Bu paneli internette
canlı olarak nasıl kullanırım?" bölümü).

## Nasıl çalışıyor?

- Bu klasördeki küçük sunucu (Node.js) sadece `/admin/` altındaki yönetim
  panelini ve panelin okuyup yazdığı `assets/content.json` dosyasını sunar —
  site sayfalarını (index.html vb.) sunmaz, onlar Cloudflare Pages'te ayrı
  duruyor.
- Tüm düzenlenebilir metinler ve fotoğraf adresleri bu klasördeki
  `assets/content.json` dosyasında tutuluyor. Panelde "Kaydet ve Yayınla"
  dediğinizde bu dosya güncelleniyor; site (Cloudflare Pages'te) bu dosyayı
  panelin adresinden okuyup ekrana yansıtıyor.
- Panelde bir değişikliği kaydetmezseniz siteye yansımaz — üstteki
  "Kaydedilmemiş değişiklikler var" uyarısını takip edin.

## Bilgisayarınızda çalıştırma

1. [Node.js](https://nodejs.org) kurulu değilse indirip kurun (LTS sürüm yeterli).
2. Bu klasörde bir terminal açın ve şunu çalıştırın:
   ```
   npm install
   npm start
   ```
3. Terminalde "Florence Event Design sunucusu calisiyor" yazısını gördükten sonra
   tarayıcıdan yönetim panelini açabilirsiniz:
   - Yönetim paneli: **http://localhost:3000/admin/**

   (Not: bu adreste site değil, sadece panel görünür — site her zaman
   Cloudflare Pages adresinizden açılır.)

## Giriş bilgileri

Kullanıcı adı ve şifre `admin-config.json` dosyasında (bu depoda değil,
Render'ın Secret Files'ında) tanımlı. İlk kurulumda panelden **"Şifre
Değiştir"** ile kendi şifrenizi belirlediyseniz onu kullanın. Giriş
bilgilerini bu dosyaya asla düz metin olarak yazmayın — bu depo public.

## Panelde neler var?

- **Metinler** sekmesi: Anasayfa, Hikayemiz, Ürünlerimiz, Galeri, Blog ve
  İletişim sayfalarındaki tüm başlık/açıklama/buton metinleri, bölüm bölüm
  gruplanmış halde. Üstteki **TR / EN** düğmesiyle Türkçe ve İngilizce
  metinler arasında geçiş yapabilirsiniz.
- **Fotoğraflar** sekmesi: Sitedeki tüm fotoğraflar (hero, ürün kartları,
  galeri, blog kapak görselleri, kurucu fotoğrafı). Her fotoğraf kartında
  ya doğrudan yeni bir görsel adresi (URL) yazabilir, ya da
  **"Bilgisayardan Yükle"** ile kendi bilgisayarınızdan bir fotoğraf
  seçip yükleyebilirsiniz. Yüklenen görseller `assets/img/uploads/`
  klasörüne kaydedilir.
- Değişiklik yaptıktan sonra sayfanın altındaki **"Kaydet ve Yayınla"**
  butonuna basmayı unutmayın.

## Bu paneli internette canlı olarak nasıl kullanırım?

Siteniz şu an **Cloudflare Pages** üzerinden yayında — Cloudflare Pages
statik dosyalar için tasarlandığı için bu panelin arka planındaki
sunucuyu (giriş, kayıt, fotoğraf yükleme) doğrudan çalıştıramıyor. Bu yüzden
mimari şöyle kurgulandı: **siteniz Cloudflare Pages'te kalır, hiçbir şey
taşınmaz** — sadece bu panel (küçük Node.js sunucusu) ayrı, ücretsiz bir
adreste çalışır. Siteniz her yüklendiğinde metinleri/fotoğrafları panelin
adresinden okur; böylece panelde kaydettiğiniz her şey, Cloudflare'deki
siteyi yeniden yayınlamanıza gerek kalmadan anında görünür.

**Kurulum adımları (bir kere yapılır):**

1. **Paneli barındırın.** Önerimiz [Render](https://render.com) —
   ücretsiz planı var, Node.js projelerini doğrudan bir GitHub/klasör
   yüklemesinden çalıştırabiliyor. "Web Service" olarak bu klasörü
   yükleyin, başlatma komutu `npm start`.

   ⚠️ **Önemli:** Render'ın **ücretsiz** planında disk kalıcı değildir —
   sunucu yeniden başladığında (uykuya dalıp uyanma, yeniden deploy vb.)
   `assets/content.json`'a kaydettiğiniz değişiklikler ve yüklediğiniz
   fotoğraflar silinebilir. Kalıcı olması için Render'da küçük ücretli bir
   "Persistent Disk" eklemeniz gerekir (aylık birkaç dolar). Bunu
   atlarsanız panel yine çalışır, sadece arada bir kaydettiklerinizi
   tekrar girmeniz gerekebilir. İsterseniz bu adımı da birlikte
   yapabiliriz.

2. **Panelin adresini öğrenin.** Render (veya seçtiğiniz hizmet) size
   `https://florence-admin.onrender.com` gibi bir adres verecek.

3. **Sitenin bu adresi bulmasını sağlayın.** 6 sayfanın da (`index.html`,
   `hikayemiz.html`, `urunlerimiz.html`, `galeri.html`, `blog.html`,
   `iletisim.html`) `<head>` kısmında şu satır var:
   ```html
   <meta name="fed-content-source" content="assets/content.json">
   ```
   Bunu panelin gerçek adresiyle güncelleyin, örneğin:
   ```html
   <meta name="fed-content-source" content="https://florence-admin.onrender.com/assets/content.json">
   ```
   Bu tek satırı 6 sayfada da değiştirip Cloudflare Pages'e **bir kez**
   yeniden yayınlamanız yeterli — bundan sonra panelden yaptığınız her
   değişiklik, Pages'i tekrar yayınlamanıza gerek kalmadan sitede görünür.

Bu adımları (Render hesabı açma, klasörü yükleme, meta etiketini
güncelleme) birlikte yapabiliriz — hazır olduğunuzda haber verin.

## iOS uygulaması entegrasyonu (içerik senkronu + push bildirim)

Bu sunucu artık sadece web sitesine değil, `AION/FlorenceEventDesign-iOS`
uygulamasına da hizmet veriyor:

- **İçerik senkronu:** Uygulama açılınca bu sunucudaki aynı
  `assets/content.json`'ı okuyor (site ile birebir aynı dosya) — panelde
  (web'de veya uygulama içindeki gizli panelde) yaptığınız her metin/fotoğraf
  değişikliği hem siteye hem uygulamaya yansır. Uygulamanın kendi gizli
  paneli, logoya ~1 saniye basılı tutunca açılıyor; giriş bilgileri bu
  paneldekiyle birebir aynı.
- **Push bildirim:** Uygulamanın gizli panelindeki "Bildirim Gönder"
  ekranından yazdığınız başlık/mesaj, `/api/send-notification` üzerinden
  uygulamayı yüklemiş **tüm** kullanıcılara gönderiliyor.

**Push bildirimin çalışması için (bir kere yapılır):**

1. **Apple Developer hesabınızla APNs anahtarı oluşturun:**
   [developer.apple.com](https://developer.apple.com) → Certificates,
   Identifiers & Profiles → Keys → "+" → "Apple Push Notifications service
   (APNs)" işaretleyip kaydedin. İndirilen `.p8` dosyasını ve gösterilen
   **Key ID**'yi not edin; sayfanın üstünde görünen **Team ID**'nizi de
   not edin.
2. `.p8` dosyasını bu klasöre (`FlorenceEventDesignPanel/`) kopyalayıp
   adını `AuthKey.p8` yapın (ya da `admin-config.json`'daki `apns.keyPath`
   alanını dosyanın gerçek adıyla güncelleyin).
3. `admin-config.json`'daki `apns` bölümünü doldurun:
   ```json
   "apns": {
     "keyId": "ABCD1234EF",
     "teamId": "XXXXXXXXXX",
     "bundleId": "com.florenceevent.app",
     "keyPath": "AuthKey.p8",
     "production": true
   }
   ```
   `bundleId`, uygulamanın Swift Playgrounds/Xcode'daki bundle identifier'ıyla
   birebir aynı olmalı (varsayılan `com.florenceevent.app` — Package.swift'te
   değiştirdiyseniz burayı da güncelleyin).
4. **Uygulama tarafında Push Notifications yeteneğini açın.** Swift
   Playgrounds proje ayarlarında (veya projeyi Xcode'a taşırsanız
   Signing & Capabilities'te) "Push Notifications" özelliğini etkinleştirin
   — bu, Apple Developer hesabınızla imzalama yapılmasını gerektirir.
5. `npm install` (yeni eklenen `apn` paketini de kurar), sunucuyu yeniden
   başlatın/deploy edin.
6. Uygulamayı bir cihaza kurup açtığınızda bildirim izni istenecek; izin
   verilince cihaz otomatik olarak bu sunucuya kaydolur
   (`POST /api/register-device`) ve artık "Bildirim Gönder" ekranından
   gönderdiğiniz bildirimleri alabilir.

Render'ın ücretsiz planında disk kalıcı olmadığı için (yukarıdaki uyarıya
bakın), kayıtlı cihaz listesi de (`devices.json`) sunucu yeniden başlayınca
silinebilir — kalıcı olması için "Persistent Disk" eklemeniz gerekir.

## Notlar

- `assets/content.json` her kaydettiğinizde otomatik olarak yedekleniyor
  (`assets/content.json.bak`) — bir şey ters giderse eski haline dönebiliriz.
- `node_modules` klasörü bu depoya dahil değildir (kurulumda `npm install`
  ile otomatik oluşur); bu klasörü paylaşmanıza veya yedeklemenize gerek yok.
- Panel, `assets/content.json` ve yüklenen fotoğrafları (`assets/img/uploads/`)
  herkese açık (GET isteklerine izin veren) uçlarla sunar — içlerinde şifre
  veya kişisel veri yoktur, sadece site metinleri ve fotoğraf adresleri.
  Bu, sitenin farklı bir adresten (Cloudflare Pages) bu verileri
  okuyabilmesi için gereklidir.
- **2026-07-15:** `assets/content.json` dosyası bozuk/yarım kaydedilmiş
  bulundu (satır 583'te bir görsel URL'inin ortasında kesiliyordu, geçersiz
  JSON) — muhtemelen önceki bir kaydetme işlemi yarıda kesilmiş. Dosya,
  sitenin güncel `assets/js/i18n.js`'indeki DICT'ten + sayfalardaki gerçek
  `data-img` kaynaklarından yeniden, eksiksiz olarak üretildi (272 metin
  key'i × 2 dil + 38 görsel key'i, tam doğrulandı). Gelecekte bu dosyada
  tuhaf davranış görülürse önce `JSON.parse` ile geçerliliğini kontrol edin.
