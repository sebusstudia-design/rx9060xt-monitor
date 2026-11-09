# GPU HUNTER — monitor Radeon RX 9060 XT 16 GB

Gotowa responsywna strona do śledzenia **nowych Radeonów RX 9060 XT z 16 GB pamięci**. Raz dziennie pobiera z publicznej strony [TagDip](https://tagdip.pl/m/3/radeon-rx-9060-xt-16-gb) najtańsze dostępne oferty różnych modeli. Zapisuje historię cen i publikuje aktualne wyniki.

## Jak uruchomić dziś (bez programowania)

1. Załóż **darmowe publiczne repozytorium GitHub** o nazwie np. `gpu-hunter` na [github.com/new](https://github.com/new). Ustaw domyślną gałąź `main`.
2. Rozpakuj archiwum i **prześlij całą zawartość folderu** `rx9060-monitor` do repozytorium (`Add file → Upload files → Commit changes`). Koniecznie uwzględnij ukryty folder `.github/workflows`; jeśli przeglądarka go pominie, użyj GitHub Desktop lub dodaj plik `.github/workflows/daily.yml` ręcznie.
3. Wejdź w `Settings → Pages → Build and deployment → Source` i wybierz **GitHub Actions**.
4. Wejdź do `Actions → Codzienny monitor cen + publikacja strony → Run workflow`, uruchom ręcznie pierwszy odczyt. Jeśli GitHub pyta o zgodę na Actions, aktywuj ją. W razie problemów sprawdź `Settings → Actions → General` i zezwól GitHub Actions na wykonywanie workflow. Token ma mieć uprawnienie zapisu `contents` (deklarowane w pliku YAML).
5. Po poprawnym opublikowaniu adres strony ma postać **`https://TWOJ_LOGIN.github.io/gpu-hunter/`** — podmień login i nazwę repozytorium.

Od teraz GitHub Actions będzie sprawdzał ceny **codziennie około 08:00 zimą / 09:00 latem (czas polski)**. GitHub może uruchomić zadanie z opóźnieniem. Możesz sprawdzić logi każdego pomiaru w zakładce Actions. W publicznych repozytoriach GitHub może wyłączyć harmonogram po 60 dniach bez aktywności; w takim przypadku uruchom go ponownie.

**Szybki podgląd bez publikacji:** otwórz `docs/index.html` w przeglądarce. Zobaczysz archiwalny przykładowy odczyt z 8 listopada 2026 r., lecz bez automatycznych aktualizacji. Żeby testować aktualizacje lokalnie, w folderze `docs` użyj `python -m http.server 8000` i otwórz `http://localhost:8000`.

## Jak działa

- Źródło: `https://tagdip.pl/m/3/radeon-rx-9060-xt-16-gb` — agregator ofert ze sklepów. Robot odczytuje **jedną publiczną stronę na dobę** i nie obchodzi zabezpieczeń.
- Widok: wyświetla nazwy, ceny, sklepy, limity cenowe, zmianę od poprzedniego pomiaru i wykres najniższej oferty. Przycisk **„Porównaj i przejdź do sklepu”** prowadzi do porównywarki z linkiem sklepu.
- Filtr: tylko RX 9060 XT 16 GB; odrzuca karty 8 GB oraz opisy używana/outlet/refurbished. Pomija niepotwierdzone marketplace'y. Status „NOWA” oznacza ofertę zwykłego sklepu, a **nie niezależną weryfikację stanu sztuki**.
- Limit kwoty zapisuje się w pamięci **konkretnej przeglądarki**. Nie generuje maili ani powiadomień po zamknięciu strony.
- Przy błędzie pobrania nowe dane **nie są fabrykowane**, a na stronie zostaje ostatni udany pomiar z ostrzeżeniem.
- Skróty: `docs/data/latest.json` najnowsze oferty, `history.json` historia, `status.json` status ostatniej próby. `seed.js` to jednorazowy archiwalny podgląd, nie jest aktualizowany.

## Test / modyfikacja

```bash
pip install -r requirements.txt
python -m pytest tests/
python scripts/check_prices.py
```

Niektóre serwisy ograniczają automatyczny dostęp lub zmieniają układ strony — parser może wtedy przestać działać. Jeśli `status.json` ma `ok: false`, sprawdź logi GitHub Actions i ewentualnie dostosuj `scripts/check_prices.py`. Nie zaleca się częstszego odpytywania witryny bez zgody właściciela.

**Uwaga:** Samo pobranie pliku ZIP **nie uruchamia automatycznej usługi**. Codzienna aktualizacja wymaga publikacji z GitHub Actions. Oferta ze spadkiem ceny nie jest automatycznie prawdziwą promocją w rozumieniu przepisów; zawsze sprawdź u sprzedawcy aktualną cenę, dostępność, stan produktu i warunki gwarancji.
