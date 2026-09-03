# Ochtendstond.WAV vervangbestanden

Gebruik deze map als knip-en-plakpakket voor je repository en Google Apps Script.

## Vervangvolgorde

1. Plak `Code.gs` in Google Apps Script.
2. Zet Script Properties:
   - `HOST_PASSWORD`: je dashboardwachtwoord
   - `HOST_EMAIL`: het e-mailadres waarop jij aanvragen wil ontvangen
3. Deploy Google Apps Script opnieuw als Web App.
4. Vervang in GitHub je `index.html` door `fixed/index.html`.
5. Vervang in GitHub je `script.js` door `fixed/script.js`.
6. Vervang in GitHub je `style.css` door `fixed/style.css`.
7. Laat `thanks.html` en `assets/` staan.

## Wat hiermee opgelost is

- dubbele Web3Forms-verzending verwijderd
- dubbele formulier-submit via de Volgende-knop voorkomen
- doel en sfeer verplicht gemaakt
- duidelijke foutmeldingen toegevoegd
- dashboard-timeout en foutmelding toegevoegd
- SEO en Open Graph tags toegevoegd
- ARIA voor tabs toegevoegd
- lazy loading voor projectbeelden toegevoegd
- tablet/mobile CSS aangescherpt
- lokale fallback voor hero-afbeelding behouden

## Belangrijke beperking

De Google Apps Script URL blijft zichtbaar in de browser, omdat dit een statische GitHub Pages-site is. Dat is normaal. Geheime waarden zoals `HOST_EMAIL` en `HOST_PASSWORD` staan wel veilig in Google Apps Script Properties, niet in GitHub.
