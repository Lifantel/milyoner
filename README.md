# Soru Havuzu Geliştirme Rehberi

Bu doküman, **Kim Milyoner Olmak İster?** projesinin soru havuzunun (`src/data/questions.json`) nasıl genişletileceğini, kalitesinin nasıl korunacağını ve havuzun oyunla nasıl çalıştığını anlatır.

> Oyun statik bir sitedir; soru eklemek için kod yazmak gerekmez. Yalnızca `questions.json` dosyasına yeni kayıtlar eklenir.

---

## 1. Hızlı başlangıç

```bash
# Proje klasöründe yerel sunucu başlat (fetch() yüzünden index.html'e çift tıklamak çalışmaz)
python3 -m http.server 8000
# Tarayıcıda: http://localhost:8000   |   Durdurmak için: Ctrl+C
```

1. `src/data/questions.json` dosyasını aç.
2. Yeni soruyu aşağıdaki formatta ekle.
3. Doğrulama betiğini çalıştır: `python3 tools/validate_questions.py` (bkz. [Bölüm 7](#7-doğrulama-betiği)).
4. Sayfayı yenile. Başlangıç ekranında `N questions loaded` yazısı yeni soru sayısını göstermelidir.

---

## 2. Soru formatı

Dosya, soru nesnelerinden oluşan düz bir JSON dizisidir:

```json
{
  "id": 31,
  "levels": [3, 4, 5],
  "question": "Which planet is the closest to the Sun?",
  "options": ["Venus", "Mercury", "Earth", "Mars"],
  "answer": "B"
}
```

| Alan | Tip | Kural |
|---|---|---|
| `id` | sayı | **Benzersiz** olmalı. Oyun, kullanılan soruları `id` ile takip eder. |
| `levels` | sayı dizisi | Sorunun çıkabileceği merdiven basamakları (1–12). Boş olamaz. |
| `question` | metin | Soru metni. |
| `options` | 4 metinlik dizi | Tam olarak 4 şık; sıra A, B, C, D'ye karşılık gelir. |
| `answer` | `"A"`–`"D"` | Doğru şıkkın harfi (büyük/küçük harf fark etmez). |

> **Önemli:** `questions.js` geçersiz kayıtları sessizce atlar ve yalnızca tarayıcı konsoluna `Skipped invalid question` uyarısı yazar. Yani bozuk bir soru oyunu çökertmez ama havuzdan kaybolur. Soru ekledikten sonra sayıyı kontrol et.

---

## 3. Havuz oyunla nasıl çalışıyor?

Oyun 12 sorudan oluşur (`config.js` → `PRIZES`). Her basamak için `pickQuestion` şunu yapar:

1. Bu oyunda **daha önce çıkmamış** ve `levels` listesinde **o basamağı içeren** sorulardan rastgele birini seçer.
2. Böyle bir soru kalmadıysa, kullanılmamış sorular arasından **zorluğu en yakın** olanı seçer.
3. Hiç kullanılmamış soru kalmadıysa, son çare olarak soru tekrarına izin verir.

Bu yüzden:

- Bir soruya **birden fazla basamak** vermek (örn. `[4, 5, 6]`) havuzu esnek kılar ve her oyunun farklı olmasını sağlar.
- Bir basamakta yeterli soru yoksa oyun fark ettirmeden komşu zorluktan soru getirir. Bu, basamak başına soru sayısı azsa zorluk eğrisinin bozulduğu anlamına gelir.

### Zorluk kademeleri

Joker davranışları basamağa göre üç kademeye ayrılmıştır (`jokers.js`). Soruların zorluğu bu kademelerle **uyumlu** olmalıdır; çünkü jokerler sorunun içeriğine bakmaz, yalnızca basamağa bakar.

| Kademe | Basamaklar | Telefon jokeri doğru bilme şansı | Seyirci jokeri doğru şık oranı |
|---|---|---|---|
| Kolay | 1–4 | %90 | %65–85 |
| Orta | 5–8 | %75 | %45–65 |
| Zor | 9–12 | %60 | %28–48 |

Güvenli basamaklar 4 ve 8'dir (`SAFE_LEVELS`). Bu basamaklara denk gelen sorular, oyuncunun parasını garantilediği için özellikle **net ve tartışmasız** olmalıdır.

---

## 4. Mevcut durum ve hedefler

Şu an havuzda **30 soru** var ve hepsi İngilizce genel kültür sorusu.

**Basamak başına soru sayısı (şu an):**

| Basamak | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Soru | 4 | 6 | 7 | 6 | 7 | 9 | 9 | 8 | 7 | 9 | 9 | 6 |

**Doğru cevap dağılımı (şu an):** A: 1, B: 10, C: 14, D: 5. Yani cevap %46 ihtimalle C ve neredeyse hiç A değil. Oyuncular bunu fark edip kullanabilir.

**Hedefler:**

- [ ] Her basamak için **en az 15 soru** (toplam yaklaşık 150–200 soru). Böylece iki oyun arasında tekrar azalır.
- [ ] Doğru cevaplar A/B/C/D arasında **yaklaşık %25'er** dağılsın (en az %15, en çok %35).
- [ ] En az 3 farklı konu alanı (tarih, bilim, coğrafya, sanat/edebiyat, spor, teknoloji...) her kademede dengeli temsil edilsin.
- [ ] Doğrulama betiği hata vermeden geçsin.

---

## 5. İyi bir soru nasıl yazılır?

**Zorluk**

- **Kolay (1–4):** Okul düzeyi, herkesin bildiği bilgi. Yanlış şıklar bariz yanlış olabilir.
- **Orta (5–8):** Genel kültür sahibi birinin bildiği ama emin olmak için düşünmesi gereken bilgi. Yanlış şıklar makul olmalı.
- **Zor (9–12):** Uzmanlık gerektirmeyen ama az bilinen bilgi. Yanlış şıklar, doğru cevaba **yakın ve inandırıcı** olmalı (örn. benzer şehirler, yakın tarihler, aynı alandan isimler).

**Doğruluk**

- Cevabı **tek ve tartışmasız** olan sorular seç. "En büyük", "ilk", "en uzun" gibi ifadelerde ölçütü soruya yaz (örn. "by area", "by population").
- Zamanla değişen bilgilerden (başkan, nüfus, rekor, şirket sahibi) kaçın ya da sorunun içine yılı ekle.
- Bilgiyi güvenilir bir kaynaktan **iki kez doğrula**. Yanlış cevaplı bir soru oyuncuyu haksız yere eler.

**Yazım**

- Soru tek cümle olsun, tek bir şey sorsun.
- Şıklar benzer uzunlukta ve aynı biçimde olsun (hepsi isim, hepsi yıl, hepsi şehir...). Doğru şık en uzun/en ayrıntılı şık olmasın.
- "Hepsi" / "Hiçbiri" şıkları kullanma; jokerler (50:50, seyirci) bu şıklarla anlamsızlaşır.
- Aynı soruyu farklı sözcüklerle tekrar etme; aynı bilgiyi soran iki kayıt olmasın.
- Telif hakkı olan metinleri (şarkı sözü, kitap alıntısı) soru olarak kopyalama.

**Cevap harfi**

- Doğru cevabı şıklar arasında bilinçli olarak dağıt. Yeni eklenen her 4 sorunun cevabı farklı harflerde olsun.

---

## 6. Soru ekleme iş akışı

1. **Planla:** Önce hangi basamakta eksik olduğuna bak (`validate_questions.py` çıktısı). Eksik basamaklara öncelik ver.
2. **Yaz:** Soruyu ve 4 şıkkı yaz, doğru harfi belirle.
3. **Kimlik ver:** `id` olarak mevcut en büyük `id` + 1 kullan. Mevcut `id`'leri yeniden numaralandırma veya silinen bir `id`'yi yeniden kullanma.
4. **Basamak ata:** `levels` için 3 ardışık basamak ver (örn. `[5, 6, 7]`). Uç basamaklarda (1 ve 12) 2 basamak yeterlidir.
5. **Doğrula:** `python3 tools/validate_questions.py` çalıştır.
6. **Oyna:** Yerel sunucuda oyunu aç, yeni soruların çıktığı basamağa kadar ilerle ve soruyu gözle kontrol et. Özellikle uzun şıkların arayüze sığıp sığmadığına bak.
7. **Commit:** Küçük gruplar halinde commit at. Örnek: `Add 10 questions for levels 1-4`.

---

## 7. Doğrulama betiği

`tools/validate_questions.py` dosyası. Betik şunları kontrol eder: zorunlu alanlar, benzersiz `id`, tekrar eden soru metni, 4 dolu ve benzersiz şık, geçerli `answer`, 1–12 arası `levels`, basamak başına soru sayısı ve cevap harfi dağılımı. **Hata** varsa çıkış kodu 1 olur; **uyarılar** (az soru, dengesiz dağılım) çıkış kodunu etkilemez.


---

## 8. Kod tarafında yapılabilecek iyileştirmeler

Soru havuzunu büyütmeden önce ya da birlikte yapılabilecek, küçük ve düşük riskli değişiklikler:

1. **Şıkları çalışma anında karıştırmak.** `loadQuestions` içinde şıkları karıştırıp `answerIndex`'i buna göre güncellersen, cevap harfi dağılımı sorunu tamamen ortadan kalkar ve her oyun farklı görünür. (Yalnızca "Hepsi/Hiçbiri" türü şık yoksa güvenlidir; bu rehberin kuralları bunu zaten yasaklıyor.)
2. **`id` tekrarını yükleme sırasında yakalamak.** Şu an `questions.js` aynı `id`'li iki soruyu kabul eder; oysa `game.js` kullanılanları `id` ile takip ettiği için ikinci soru hiç çıkmayabilir. Yüklemede tekrar eden `id` için konsola uyarı yazılmalı.
3. **`levels` aralığını doğrulamak.** `1–TOTAL` dışındaki bir basamak (örn. 13) hata vermez ama o basamak hiç oynanmadığı için soru fiilen kullanılmaz.
4. **Kategori alanı.** İsteğe bağlı bir `"category": "history"` alanı eklenirse, oyun aynı oyunda aynı kategoriden art arda soru çıkarmamayı seçebilir.
5. **Çok dilli havuz.** Arayüz ve sorular şu an İngilizce. Türkçe soru havuzu için `questions.tr.json` gibi ayrı bir dosya ve `QUESTIONS_URL`'i dile göre seçen küçük bir ayar yeterlidir; `id` aralıklarını dosyalar arasında çakıştırmamak iyi olur.
6. **Soru başına açıklama / kaynak.** Oyun sonunda "doğru cevap neden bu?" göstermek için isteğe bağlı bir `"note"` alanı eklenebilir. Bu aynı zamanda her sorunun doğruluğunu belgelemeye yarar.

Şema değiştiren (alan ekleyen) bir iyileştirme yaparsan hem `questions.js` doğrulamasını hem `validate_questions.py` betiğini hem de bu rehberin [Bölüm 2](#2-soru-formatı) tablosunu birlikte güncelle.

---

## 9. Kontrol listesi (PR / commit öncesi)

- [ ] `id` benzersiz, JSON geçerli (virgül ve tırnaklar tamam).
- [ ] 4 şık var, hiçbiri boş ya da tekrar değil.
- [ ] `answer` doğru şıkkı gösteriyor (kaynakla doğrulandı).
- [ ] `levels` soru zorluğuyla uyumlu.
- [ ] Soru zamanla değişen bir bilgiye dayanmıyor.
- [ ] Yeni sorular arasında cevap harfi dengeli.
- [ ] `python3 tools/validate_questions.py` hata vermedi.
- [ ] Oyunda yeni sorular kontrol edildi; şıklar arayüze sığıyor.

---

## Lisans

Proje 0BSD lisanslıdır. Eklediğin sorular da aynı lisans altında yayımlanır; bu yüzden yalnızca kendi yazdığın ya da telif sorunu olmayan sorular ekle.
