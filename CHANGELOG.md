# Changelog

Alle belangrijke wijzigingen aan MemoNetwork AMP Edition worden hier bijgehouden.

## [4.7.0] - 2026-08-03

### Toegevoegd

- Metrics Pro-uitstraling voor Analytics-, chart- en resourcepanelen.
- Diepere donkere grafiekpanelen met subtiele cyaangloed.
- Uniforme metrickaarten met duidelijke waarden en een accentlijn.
- Verfijnde legenda's, tabellen, voortgangsbalken en analytics-controls.
- Smalle scrollbars voor grafiek- en metricpanelen.
- Subtiele hoverbeweging met reduced-motion ondersteuning.

### Veiligheid

- Geen AMP JavaScript-, backend- of metricberekeningen gewijzigd.
- Geen nieuwe meetfuncties toegevoegd.
- Geen vaste hoofdcontent-offsets, sidebarbreedtes of gridwijzigingen.

## [4.6.0] - 2026-08-03

### Toegevoegd

- Scheduler Pro-uitstraling voor taken, triggers en planningspanelen.
- Modernere taak- en triggerkaarten met subtiele cyaanaccenten.
- Strakkere scheduler-toolbars en actieknoppen.
- Duidelijkere hover- en selectieweergave.
- Consistente invoervelden, dropdowns en focusringen.
- Technische weergave voor volgende en laatste uitvoering.
- Vernieuwde scheduler-tabellen en statusweergave.
- Reduced-motion ondersteuning voor scheduleranimaties.

### Veiligheid

- Geen AMP JavaScript-, backend- of planningslogica gewijzigd.
- Geen nieuwe schedulerfuncties toegevoegd.
- Geen vaste hoofdcontent-offsets, sidebarbreedtes of gridwijzigingen.

## [4.5.1] - 2026-08-03

### Gewijzigd

- CPU-, Memory- en Users-balken op de Instances-pagina gebruiken nu de live AMP-waarden.
- `0%`, `0/16` en `0/20` tonen voortaan een lege balk.
- Memory wordt berekend als gebruikt gedeeld door totaal.
- Balken worden automatisch bijgewerkt wanneer Knockout de metrictekst vernieuwt.

### Techniek

- Nieuwe kleine `MemoNetwork.js`-module met een `MutationObserver`.
- De installer voegt één veilige scriptreferentie toe aan `AMP.html` en voorkomt duplicaten.
- Voor de eerste wijziging aan `AMP.html` wordt automatisch een back-up gemaakt.

## [4.5.0] - 2026-08-03

### Toegevoegd

- Eerste MemoNetwork design-systemmodule met vaste surfaces, radii, schaduwen, focusringen en statustinten.
- Server Control Pro-styling voor instanceheaders, tabs en actietoolbars.
- Consistente Start-, Stop-, Restart- en waarschuwingsknoppen.
- Premium status- en metricpanelen voor geopende serverpagina's.
- Verfijnde Scheduler-, Backup-, Networking- en Metrics-panelen.
- Uniforme voortgangsbalken, focusweergave en statuschips.

### Veiligheid

- Geen AMP JavaScript- of backendwijzigingen.
- Geen vaste hoofdcontent-offsets, sidebarbreedtes of gewijzigde AMP-grid.
- Alleen bestaande AMP-componenten worden visueel gestyled.
- Reduced-motion ondersteuning blijft behouden.

## [4.4.0] - 2026-08-03

### Toegevoegd

- File Manager Pro-uitstraling met diepere panelen en subtiele cyaangloed.
- Modernere breadcrumbs en navigatieknoppen.
- Duidelijkere bestandsregels met rustige zebraweergave.
- Sterkere hover- en selectiestatus voor bestanden en mappen.
- Verfijnde map-, archief- en virtuele bestandsiconen.
- Modernere detailkaart voor geselecteerde bestanden.
- Styling voor uploadzones en voortgangsbalken wanneer AMP deze onderdelen toont.
- Vernieuwd contextmenu en smalle File Manager-scrollbars.

### Beperkingen

- Er zijn geen nieuwe File Manager-functies toegevoegd; v4.4 wijzigt alleen de presentatie van bestaande AMP-onderdelen.
- Afbeeldingspreview, extra bestandsacties en drag-and-dropfunctionaliteit verschijnen alleen wanneer AMP of de gebruikte module die functies al levert.

### Veiligheid

- Geen wijzigingen aan AMP JavaScript, backend of bestandsbewerkingen.
- Geen vaste hoofdcontent-offsets of sidebarbreedtes toegevoegd.
- Animaties worden uitgeschakeld wanneer `prefers-reduced-motion` actief is.

## [4.3.0] - 2026-08-03

### Toegevoegd

- Console Pro-uitstraling met diepere terminalachtergrond.
- Duidelijkere timestamps en bronlabels.
- Visuele ondersteuning voor door AMP geleverde WARN-, ERROR- en SUCCESS-klassen.
- Vernieuwde commandregel met cyaankleurige cursor en focusglow.
- Strakkere console-toolbar en bedieningsknoppen.
- Aangepaste smalle console-scrollbars.
- Subtiele markering van logregels bij hover.

### Beperkingen

- Tekstinhoud wordt niet door CSS geanalyseerd. WARN- en ERROR-kleuren verschijnen alleen wanneer AMP of een module daarvoor een herkenbare CSS-klasse levert.
- Er zijn geen zoekfunctie of nieuwe consoleknoppen toegevoegd, omdat dat AMP JavaScript zou vereisen.

### Veiligheid

- Geen wijzigingen aan AMP JavaScript, backend of consolefunctionaliteit.
- Geen vaste layout-offsets of afmetingen toegevoegd.
- Animaties worden uitgeschakeld wanneer `prefers-reduced-motion` actief is.

## [4.2.0] - 2026-08-03

### Toegevoegd

- Verfijnde topzoekbalk met duidelijkere focusglow.
- Rijkere `Local Instances`-header met subtiele dubbele gradient.
- Strakkere quick-actionknoppen.
- Subtiele hoverbeweging en sterkere gloed voor serverkaarten.
- Extra statusglow voor actieve servers.
- Vernieuwde `Create Instance`-kaart.
- Subtiele aurora-gloed achter het MemoNetwork-logo.

### Veiligheid

- Geen wijzigingen aan AMP JavaScript of backend.
- Geen vaste layout-offsets, sidebarbreedtes of aangepaste AMP-grid.
- Animaties worden uitgeschakeld wanneer `prefers-reduced-motion` actief is.

## [4.1.0] - 2026-08-03

### Toegevoegd

- Premium styling voor de `Local Instances`-header.
- Modernere zoek- en filtervelden.
- Vernieuwde quick-actionknoppen en view-selectors.
- Subtiele hoverbeweging voor instancekaarten.
- Duidelijkere statusaccenten voor Running, Busy en Failed.
- Decoratieve metricbalken onder CPU, Memory en Users.
- Verfijnde Create Instance-kaart.

### Beperkingen

- Automatische Fabric/Forge/Paper-badges zijn zonder extra JavaScript of AMP-data niet betrouwbaar mogelijk.

### Veiligheid

- Geen wijzigingen aan AMP JavaScript of backend.
- Geen vaste layout-offsets of sidebarbreedtes toegevoegd.

## [4.0.0] - 2026-08-02

### Toegevoegd

- Donkerblauwe MemoNetwork-loginpagina en branding.
- Premium instancekaarten.
- Vernieuwde Console in terminalstijl.
- Vernieuwde File Manager.
- MemoNetwork-stijl voor tabbladen, tabellen, meldingen en contextmenu's.
- Modulaire CSS-opbouw met een buildscript.

### Veiligheid

- Geen wijzigingen aan AMP JavaScript of backend.
- Geen vaste layout-offsets voor `#mainBody`, `#barTop`, `#sideMenuContainer` of `.subMenuWell`.

## Oudere ontwikkeling

Versies vóór v4.0 zijn tijdens de ontwikkeling als losse testpakketten gebruikt. v4.0.0 is de eerste versie die als stabiele GitHub-basis wordt bijgehouden.
