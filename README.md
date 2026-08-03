# MemoNetwork AMP Edition

Een custom donkerblauw/cyaan thema voor **CubeCoders AMP**, gemaakt voor persoonlijk serverbeheer.

## Huidige stabiele versie

**v4.0.0**

Deze versie bevat onder andere:

- MemoNetwork-loginpagina en branding;
- eigen logo en netwerkachtergrond;
- premium instancekaarten;
- vernieuwde Console;
- vernieuwde File Manager;
- aangepaste tabbladen, tabellen, meldingen en panelen;
- modulaire CSS-opbouw;
- geen wijzigingen aan de AMP-backend of JavaScript.

## Installeren

Kopieer de map `theme/MemoNetwork` naar:

```text
/home/amp/.ampdata/instances/ADS01/WebRoot/Themes/AMPThemes/MemoNetwork
```

Zet daarna de rechten goed:

```bash
sudo chown -R amp:amp /home/amp/.ampdata/instances/ADS01/WebRoot/Themes/AMPThemes/MemoNetwork
sudo find /home/amp/.ampdata/instances/ADS01/WebRoot/Themes/AMPThemes/MemoNetwork -type d -exec chmod 755 {} \;
sudo find /home/amp/.ampdata/instances/ADS01/WebRoot/Themes/AMPThemes/MemoNetwork -type f -exec chmod 644 {} \;
```

Vernieuw AMP daarna met `Ctrl + Shift + R`.

## Thema opnieuw bouwen

Na wijzigingen aan bestanden in `theme/MemoNetwork/modules/`:

```bash
cd theme/MemoNetwork
./build-theme.sh
```

## Belangrijke veiligheidsregel

Voeg geen vaste breedtes, `left`, `margin-left` of positioneringsregels toe aan:

```text
#mainBody
#barTop
#sideMenuContainer
.subMenuWell
```

AMP berekent deze onderdelen dynamisch. Eerdere experimenten hiermee veroorzaakten verschoven content en kapotte submenu's.

## Credits

MemoNetwork Edition is een visueel thema voor CubeCoders AMP. CubeCoders-auteursrecht en AMP-release-informatie blijven zichtbaar.
