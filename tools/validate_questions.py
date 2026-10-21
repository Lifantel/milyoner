#!/usr/bin/env python3
"""Soru havuzunu doğrular: python3 tools/validate_questions.py"""
import json
import sys
from collections import Counter

PATH = "src/data/questions.json"  #milyoner-main de yani ana klasörde bulunmalı.
TOTAL = 12          # config.js -> PRIZES.length
MIN_PER_LEVEL = 15  # hedef: her basamak için en az bu kadar soru
LETTERS = "ABCD"

errors, warnings = [], []
data = json.load(open(PATH, encoding="utf-8"))
if not isinstance(data, list):
    sys.exit("questions.json bir dizi (array) olmalı.")

seen_ids, seen_text = set(), {}
per_level, answers = Counter(), Counter()

for i, q in enumerate(data):
    tag = f"#{q.get('id', f'index {i}')}"
    if set(q) != {"id", "levels", "question", "options", "answer"}:
        errors.append(f"{tag}: alanlar id/levels/question/options/answer olmalı, bulunan: {sorted(q)}")
        continue
    if q["id"] in seen_ids:
        errors.append(f"{tag}: id tekrar ediyor")
    seen_ids.add(q["id"])

    text = q["question"].strip()
    if not text:
        errors.append(f"{tag}: soru metni boş")
    key = text.lower()
    if key in seen_text:
        errors.append(f"{tag}: soru #{seen_text[key]} ile aynı")
    seen_text[key] = q["id"]

    opts = q["options"]
    if not (isinstance(opts, list) and len(opts) == 4 and all(isinstance(o, str) and o.strip() for o in opts)):
        errors.append(f"{tag}: options 4 adet dolu metin olmalı")
    elif len({o.strip().lower() for o in opts}) != 4:
        errors.append(f"{tag}: şıklardan ikisi aynı")

    if str(q["answer"]).upper() not in LETTERS or len(str(q["answer"])) != 1:
        errors.append(f"{tag}: answer A/B/C/D olmalı")
    else:
        answers[str(q["answer"]).upper()] += 1

    lv = q["levels"]
    if not (isinstance(lv, list) and lv and all(isinstance(l, int) and 1 <= l <= TOTAL for l in lv)):
        errors.append(f"{tag}: levels 1-{TOTAL} arası tam sayılardan oluşan dolu bir liste olmalı")
    else:
        if len(set(lv)) != len(lv):
            errors.append(f"{tag}: levels içinde tekrar var")
        for l in set(lv):
            per_level[l] += 1

print(f"Toplam soru: {len(data)}\n\nBasamak başına soru sayısı:")
for l in range(1, TOTAL + 1):
    n = per_level[l]
    flag = "  <-- az" if n < MIN_PER_LEVEL else ""
    print(f"  {l:>2}. basamak: {n}{flag}")
    if n < MIN_PER_LEVEL:
        warnings.append(f"{l}. basamakta {n} soru var (hedef ≥ {MIN_PER_LEVEL})")

total = sum(answers.values()) or 1
print("\nDoğru cevap dağılımı:", ", ".join(f"{k}: {answers[k]} (%{100*answers[k]//total})" for k in LETTERS))
for k in LETTERS:
    if answers[k] / total > 0.35 or answers[k] / total < 0.15:
        warnings.append(f"Doğru cevap dağılımı dengesiz: {k} = %{100*answers[k]//total}")

for w in warnings:
    print("UYARI:", w)
for e in errors:
    print("HATA :", e)
sys.exit(1 if errors else 0)
