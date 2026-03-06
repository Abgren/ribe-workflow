# Ribe Workflow – Driftsättningsguide

## Vad är det här?
Ribe Workflow är ett webbaserat system för arbetsorder, sömnadsorder och beställningar.
Alla 10 användare når det via en länk i webbläsaren och loggar in med sina Microsoft 365-konton.

---

## Steg 1 – Skapa GitHub-konto (om du inte redan gjort det)

1. Gå till **https://github.com** och klicka "Sign up"
2. Välj ett användarnamn, ange din e-post och skapa ett lösenord
3. Verifiera e-posten
4. Klart – du behöver inte veta hur Git fungerar

---

## Steg 2 – Ladda upp projektet till GitHub

1. Logga in på GitHub
2. Klicka **"New repository"** (gröna knappen)
3. Namn: `ribe-workflow`
4. Välj **Private** (så att koden inte är publik)
5. Klicka **"Create repository"**
6. Klicka **"uploading an existing file"**
7. Dra och släpp ALLA filer från den här mappen (utom `.env`)
8. Klicka **"Commit changes"**

---

## Steg 3 – Skapa Railway-konto och driftsätt

1. Gå till **https://railway.app** och klicka "Login"
2. Välj **"Login with GitHub"** – logga in med ditt GitHub-konto
3. Klicka **"New Project"**
4. Välj **"Deploy from GitHub repo"**
5. Välj `ribe-workflow`
6. Railway känner automatiskt igen det som en Node.js-app och deployar

---

## Steg 4 – Lägg till miljövariabler i Railway

Efter att projektet skapats:
1. Klicka på ditt projekt → fliken **"Variables"**
2. Lägg till följande variabler:

| Variabel | Värde |
|----------|-------|
| `AZURE_CLIENT_ID` | `71fa604b-a57c-407b-882e-981f21da34dc` |
| `AZURE_TENANT_ID` | `c8afe53a-cd76-4e7b-a0bb-6bd02b80b4f6` |
| `SESSION_SECRET` | Skriv något långt och slumpmässigt, t.ex. `ribe-gardin-super-secret-2024-xyz` |
| `FORTNOX_ACCESS_TOKEN` | Din Fortnox API-nyckel (lägg till när du har den) |
| `FORTNOX_CLIENT_SECRET` | Din Fortnox Client Secret |
| `NODE_ENV` | `production` |

---

## Steg 5 – Hämta din app-URL och uppdatera Azure

1. I Railway, klicka på **"Settings"** → **"Domains"**
2. Klicka **"Generate Domain"** – du får en URL som t.ex. `ribe-workflow.up.railway.app`
3. Lägg till denna URL som miljövariabel `APP_URL` i Railway
4. Skicka URL:en till din IT-leverantör och be honom lägga till den som **Redirect URI** i Azure-appregistreringen

---

## Steg 6 – Testa

1. Öppna din Railway-URL i webbläsaren
2. Klicka "Logga in med Microsoft"
3. Logga in med ditt ribegardin.se-konto
4. Ribe Workflow ska nu vara igång!

---

## Fortnox-integration

När du har Fortnox API-nyckeln:
1. Gå till Railway → Variables
2. Lägg till `FORTNOX_ACCESS_TOKEN` och `FORTNOX_CLIENT_SECRET`
3. Railway startar om automatiskt
4. Systemet synkar Fortnox var 10:e minut automatiskt
5. Du kan också klicka "Synka Fortnox" manuellt i appen

---

## Kostnad

- **GitHub**: Gratis
- **Railway**: Gratis upp till en viss gräns, sedan ca 50–100 kr/månad

---

## Support

Kontakta oss om något inte fungerar – vi hjälper er igång.
