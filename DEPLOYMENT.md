# Deployment Guide - TR ONESOURCE API Guide with AI Chatbot

This guide explains how to fix the CORS issue and deploy the working chatbot.

## The CORS Problem

Your chatbot is failing with "Failed to fetch" because TR OpenArena API doesn't allow direct requests from web browsers (this is a security feature called CORS).

**Solution:** Deploy a backend proxy server that forwards requests from your GitHub Pages site to TR OpenArena.

---

## Solution: Deploy Backend Proxy to Vercel (Free)

### Step 1: Install Node.js and Vercel CLI

1. **Install Node.js** (if not already installed):
   - Download from https://nodejs.org/ (LTS version)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```
   - Choose your login method (GitHub, GitLab, Bitbucket, or Email)
   - Follow the authentication steps

---

### Step 2: Deploy Proxy to Vercel

1. **Navigate to your project directory**:
   ```bash
   cd C:\Users\6134505\Code\onesource-github
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

   Answer the prompts:
   - **Set up and deploy?** → Yes
   - **Which scope?** → Your account
   - **Link to existing project?** → No
   - **Project name?** → `onesource-api-proxy` (or any name)
   - **Directory?** → `./` (current directory)
   - **Override settings?** → No

3. **Note the deployment URL**:
   - Vercel will show: `✅ Deployed to production: https://onesource-api-proxy-xxx.vercel.app`
   - **Copy this URL** - you'll need it in the next step

4. **Deploy to production** (optional, if previous was preview):
   ```bash
   vercel --prod
   ```


🔍  Inspect: https://vercel.com/andreaspils-projects/onesource-api-guide-proxy/6UbaLWPjwdEQkp3hAJELMuoYGuq8 [4s]
✅  Production: https://onesource-api-guide-proxy-2oijd10kj-andreaspils-projects.vercel.app [31s]
🔗  Aliased: https://onesource-api-guide-proxy.vercel.app [31s]
📝  Deployed to production. Run `vercel --prod` to overwrite later (https://vercel.link/2F).
💡  To change the domain or build command, go to https://vercel.com/andreaspils-projects/onesource-api-guide-proxy/settings
---

### Step 3: Update Your Code with Vercel URL

1. **Edit `assets/js/openarena-client.js`**:

   Find this line (around line 21):
   ```javascript
   : 'https://YOUR_VERCEL_URL.vercel.app/api/proxy';
   ```

   Replace with your actual Vercel URL:
   ```javascript
   : 'https://onesource-api-proxy-xxx.vercel.app/api/proxy';
   ```

2. **Edit `api/proxy.js`**:

   Find this section (around line 13):
   ```javascript
   const allowedOrigins = [
       'http://localhost:8000',
       'http://127.0.0.1:8000',
       // Add your GitHub Pages URL here:
       // 'https://YOUR_USERNAME.github.io'
   ];
   ```

   Add your GitHub Pages URL:
   ```javascript
   const allowedOrigins = [
       'http://localhost:8000',
       'http://127.0.0.1:8000',
       'https://YOUR_USERNAME.github.io'  // Replace with your actual URL
   ];
   ```

---

### Step 4: Commit and Push Changes

```bash
git add .
git commit -m "Add Vercel proxy for CORS fix"
git push origin main
```

Your GitHub Pages site will automatically redeploy with the updated proxy URL.

---

### Step 5: Redeploy Proxy with Updated CORS Settings

Since you updated `api/proxy.js` with your GitHub Pages URL, redeploy the proxy:

```bash
vercel --prod
```

---

### Step 6: Test the Chatbot

1. **Open your GitHub Pages site**: `https://YOUR_USERNAME.github.io/REPO_NAME`
2. **Open the chatbot** (click orange button)
3. **Enter your credentials** (ESSO token + Workflow ID)
4. **Send a test message**: "How do I authenticate with the API?"
5. **Check browser console** (F12 → Console tab) - you should see:
   ```
   [OpenArena] Sending request via proxy
   [OpenArena] Success - 245 tokens, 3.42s
   ```

---

## Troubleshooting

### Issue: "Proxy error: 401 Unauthorized"

**Cause:** Invalid API token or workflow ID

**Solution:**
- Verify your ESSO token is correct
- Verify your workflow ID is correct
- Check if token has expired
- Click the ⚙️ settings icon in chatbot to re-enter credentials

---

### Issue: "Proxy error: 404 Not Found"

**Cause:** Incorrect proxy URL in `openarena-client.js`

**Solution:**
1. Check the Vercel deployment URL: `vercel list`
2. Make sure the URL in `openarena-client.js` matches exactly
3. Must include `/api/proxy` at the end

---

### Issue: "Access to fetch has been blocked by CORS policy"

**Cause:** Your GitHub Pages URL is not in the `allowedOrigins` list in `api/proxy.js`

**Solution:**
1. Edit `api/proxy.js`
2. Add your GitHub Pages URL to `allowedOrigins` array
3. Redeploy: `vercel --prod`

---

### Issue: "Failed to fetch" (still happening)

**Possible causes:**
1. **Wrong Vercel URL**: Check `openarena-client.js` line 21
2. **Proxy not deployed**: Run `vercel list` to verify
3. **Network issue**: Check if you can access the Vercel URL directly in browser

**Debug steps:**
1. Open browser console (F12)
2. Go to Network tab
3. Send a message in chatbot
4. Check the request to `/api/proxy`:
   - **Status 200**: Proxy is working, check TR OpenArena credentials
   - **Status 404**: Wrong proxy URL
   - **Status 403/CORS error**: CORS not configured correctly in `api/proxy.js`
   - **Failed (red)**: Vercel not deployed or wrong URL

---

## Alternative: Deploy Proxy to Netlify

If you prefer Netlify over Vercel:

1. **Create `netlify/functions/proxy.js`**:
   ```javascript
   // Copy content from api/proxy.js
   // Change: export default async function handler(req, res)
   // To: exports.handler = async (event, context)
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

3. **Update URL** in `openarena-client.js`:
   ```javascript
   this.proxyURL = 'https://YOUR_SITE.netlify.app/.netlify/functions/proxy'
   ```

---

## Vercel Dashboard

You can also manage your proxy via the Vercel web dashboard:

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables** (if you want to move credentials server-side later)
4. View **Deployments** to see logs and debug issues
5. Check **Functions** tab to see `/api/proxy` execution logs

---

## Cost

- **Vercel Free Tier**:
  - 100 GB bandwidth/month
  - 100 GB-hrs serverless function execution/month
  - More than enough for this POC

- **Netlify Free Tier**:
  - 100 GB bandwidth/month
  - 125k function requests/month
  - Also sufficient

---

## Security Notes for Production

This POC still sends API credentials from browser → proxy. For production:

1. **Move credentials server-side**:
   - Store API token in Vercel environment variables
   - Implement user authentication (SSO)
   - Map users to their own tokens

2. **Add rate limiting**:
   ```javascript
   // In proxy.js
   import rateLimit from 'express-rate-limit';
   ```

3. **Add request validation**:
   - Sanitize user inputs
   - Block malicious queries

4. **Add monitoring**:
   - Log all requests
   - Alert on errors/high usage

---

## Quick Reference

### Deploy Proxy
```bash
cd C:\Users\6134505\Code\onesource-github
vercel --prod
```

### View Deployments
```bash
vercel list
```

### View Logs
```bash
vercel logs YOUR_DEPLOYMENT_URL
```

### Remove Deployment
```bash
vercel remove onesource-api-proxy
```

---

## Next Steps

After successful deployment:

1. ✅ Test chatbot functionality thoroughly
2. ✅ Update README.md with proxy setup instructions
3. ✅ Test on mobile devices
4. ✅ Share with stakeholders for feedback
5. 🔄 Plan production security enhancements

---

## Questions?

If you encounter issues:

1. **Check browser console** (F12) for detailed errors
2. **Check Vercel logs**: `vercel logs`
3. **Verify URLs** in both `openarena-client.js` and `api/proxy.js`
4. **Test proxy directly**: Open `https://YOUR_VERCEL_URL.vercel.app/api/proxy` in browser (should return 405 Method Not Allowed - this is correct)

---

**Built with** [Claude Code](https://claude.com/claude-code) 🤖
