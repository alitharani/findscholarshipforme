# findscholarshipforme.com — Hostinger Deployment Guide v2

## Files in this project
```
findscholarshipforme/
├── server.js          ← Node.js backend (API key lives here)
├── package.json       ← Dependencies
├── .env               ← YOUR API KEY goes here
└── public/
    ├── index.html     ← Full website
    ├── css/style.css  ← All styles
    └── js/app.js      ← Frontend logic
```

---

## STEP 1 — Get Anthropic API Key (5 minutes)
1. Go to: https://console.anthropic.com
2. Sign up with email
3. Click "API Keys" → "Create Key"
4. Copy key (starts with sk-ant-...)
5. You get $5 free credits on signup — enough for testing!

---

## STEP 2 — Edit .env file
Open `.env` and paste your key:
```
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
PORT=3000
ALLOWED_ORIGIN=https://findscholarshipforme.com
```

---

## STEP 3 — Upload to Hostinger

### Via File Manager (recommended):
1. hPanel → File Manager
2. Go to your domain folder
3. Upload ALL files maintaining the folder structure above
4. Make sure .env is uploaded (it's a hidden file — enable "show hidden files")

### Via FTP (FileZilla):
1. hPanel → FTP Accounts → create account
2. FileZilla: connect with host/user/pass
3. Upload entire project folder

---

## STEP 4 — Enable Node.js in hPanel
1. hPanel → search "Node.js" → open
2. Click "Create Application"
3. Settings:
   - Node.js version: 18.x or 20.x
   - Application root: /path/to/your/project
   - Application URL: your domain
   - Startup file: server.js
4. Save

---

## STEP 5 — Install packages
In hPanel Node.js panel → click "NPM Install"
OR via SSH terminal:
```bash
cd /home/username/domains/findscholarshipforme.com/
npm install
```

---

## STEP 6 — Start the app
In Node.js panel → click "Start" or "Restart"

Your site is now live at: https://findscholarshipforme.com 🎉

---

## Troubleshooting

**White screen / 404?**
→ Check application root path is correct in Node.js panel
→ Make sure startup file is set to "server.js"

**API not working?**
→ Open .env and verify API key is correct (no spaces)
→ Check credits at console.anthropic.com

**PORT error?**
→ Hostinger may assign a different port — check Node.js panel for the correct PORT value

---

## Monthly cost estimate
| Item | Cost |
|------|------|
| Hostinger Business | Already paid ✅ |
| Domain | ~$12/year |
| Anthropic API (500 student sessions) | ~$4/month |
| **Total ongoing** | **~$4/month** |

Anthropic gives $5 free credits on signup — covers your first month completely!
