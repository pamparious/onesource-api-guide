# TR ONESOURCE API Partner Integration Guide

A professional, interactive documentation site for TR ONESOURCE API partner integration guidance, featuring an AI-powered chatbot assistant and automated partner onboarding.

---

## 🚀 Quick Start (Windows Users)

### For Non-Technical Users

**Just want to run the site? Follow these 3 simple steps:**

1. **Install Node.js** (if not already installed)
   - Visit [https://nodejs.org/](https://nodejs.org/)
   - Download the **LTS version** (version 18 or higher)
   - Run the installer with default options
   - Restart your computer

2. **Double-click `START.bat`**
   - Extract the ZIP file to a folder
   - Find and double-click `START.bat`
   - Wait 5-10 seconds

3. **Use the site!**
   - Your browser will open automatically to `http://localhost:3000`
   - Browse documentation, use AI Assistant, generate reports

**To stop the server:**
- Press `Ctrl+C` in the server window, OR
- Double-click `STOP.bat`

---

## 🌟 Overview

This site provides comprehensive documentation and tools for partners integrating with TR ONESOURCE E-Invoicing APIs:

- **📚 5 Documentation Pages**: Homepage, Getting Started, E-Invoicing Integration, API Reference, FAQ
- **🤖 AI Assistant**: Context-aware chatbot powered by TR OpenArena (3 specialized agents)
- **📝 Partner Onboarding**: Automated form with AI-generated implementation reports
- **🎨 Professional Design**: TR branding with responsive mobile-first layout
- **⚡ Zero Build Process**: Pure HTML/CSS/JavaScript

---

## ✨ Key Features

### Documentation
- ✅ Comprehensive API integration guides
- ✅ Code examples in Python, JavaScript, XML, JSON
- ✅ Interactive FAQ with search and filtering
- ✅ Complete API reference catalog (9 ONESOURCE APIs)
- ✅ Responsive design for all devices

### AI-Powered Tools
- ✅ **AI Chatbot**: 3 specialized agents (API, Format, CCR)
  - Ask questions about integration, authentication, document formats, error handling
  - Context-aware responses based on current page
  - Conversation history and markdown formatting

- ✅ **Partner Onboarding**: Generate personalized implementation reports
  - Calls CCR Agent for country compliance requirements
  - Calls API Agent for implementation guidance
  - Generates comprehensive 2-part report (compliance + API integration)
  - Auto-save every 30 seconds

### Windows Automation
- ✅ **START.bat**: One-click startup script
  - Automatic Node.js & npm detection
  - Auto-installs dependencies if needed
  - Port availability checking
  - Browser auto-open

- ✅ **STOP.bat**: Graceful server shutdown

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **TR Network Access** (VPN or office network)
- **TR OpenArena API Token** (optional - demo mode available)

### For Developers

```bash
# Navigate to project
cd onesource-github

# Install dependencies
npm install

# Start the server
npm start
```

You should see:
```
🚀 TR ONESOURCE Unified Server
================================================
✅ Server running at http://localhost:3000
📍 AI Chatbot: POST /api/proxy
📍 Partner Onboarding: POST /api/generate-report
📡 CCR Agent ID: f87b828b-39cb-4a9e-9225-bb9e67ff4860
📡 API Agent ID: 74f9914d-b8c9-44f0-ad5c-13af2d02144c
📡 Format Agent ID: f5a1f931-82f3-4b50-a051-de3e175e3d5f
================================================
```

### Access the Site

Open your browser to: **http://localhost:3000**

---

## 🎯 Using the Features

### 1. AI Chatbot Assistant

1. Click the **robot icon** in the bottom-right corner
2. Click the **settings icon (⚙️)** to configure API token
3. Choose your agent:
   - **API Agent**: API integration, authentication, endpoints
   - **Format Agent**: Document formats (PUF, UBL, CII), field mappings, validation
   - **CCR Agent**: Country compliance, e-invoicing mandates
4. Ask questions like:
   - "How do I authenticate with the API?"
   - "What document formats are supported?"
   - "How do I handle recipient not found errors?"

### 2. Partner Onboarding

1. Click **"Partner Onboarding"** in the left menu
2. Fill out the 8-section form (auto-saves every 30 seconds)
3. Click **"Generate Report"**
4. Wait 2-3 minutes for AI analysis
5. Review your comprehensive implementation report

**Report Includes:**
- ✅ Country compliance requirements (CCR Agent)
- ✅ API implementation guide (API Agent)
- ✅ Code samples and best practices
- ✅ Webhook configuration
- ✅ Error handling strategies

**Demo Mode**: Enable the demo checkbox to test without an API token

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│  Unified Server (Port 3000)                      │
│  unified-server.js                               │
│                                                   │
│  📍 POST /api/proxy                              │
│     → AI Chatbot (3 agents)                      │
│     → 30s timeout, 4K tokens                     │
│                                                   │
│  📍 POST /api/generate-report                    │
│     → Partner Onboarding                         │
│     → 120s timeout, 8K tokens                    │
│     → Sequential: CCR Agent → API Agent          │
│                                                   │
│  📍 GET /health                                  │
│     → Health check endpoint                      │
│                                                   │
│          ↓ Calls ↓                               │
│  ┌────────────────────────────────────────────┐ │
│  │  OpenArena API (Remote)                    │ │
│  │  aiopenarena.gcs.int.thomsonreuters.com    │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Benefits:**
- Single command: `npm start` or double-click `START.bat`
- One port to manage: 3000
- Unified error handling and logging

---

## 📁 Project Structure

```
onesource-github/
├── START.bat                           # Windows one-click startup
├── STOP.bat                            # Windows shutdown script
├── package.json                        # Node.js dependencies
│
├── index.html                          # Homepage
├── getting-started.html                # Getting started guide
├── einvoicing-integration.html         # E-invoicing integration
├── api-reference.html                  # API reference catalog
├── faq.html                            # FAQ page
├── partner-onboarding.html             # Partner onboarding form
│
├── unified-server.js                   # Unified backend server
│
└── assets/
    ├── css/
    │   ├── main.css                    # Global styles & TR branding
    │   ├── layout.css                  # Page layout & structure
    │   ├── components.css              # Reusable UI components
    │   ├── chatbot.css                 # Chat widget styles
    │   └── partner-onboarding.css      # Onboarding form styles
    │
    ├── js/
    │   ├── navigation.js               # Mobile navigation & menu
    │   ├── chatbot-ui.js               # Chat widget UI
    │   ├── openarena-client.js         # OpenArena API client
    │   ├── chatbot-controller.js       # Chat logic & workflow IDs
    │   └── partner-onboarding.js       # Form validation & submission
    │
    └── images/
        └── Thomson-Reuters-Logo-*.png  # TR logo assets
```

---

## 🔧 Configuration

### Chatbot Workflow IDs

Edit `assets/js/chatbot-controller.js`:

```javascript
const workflowIds = {
    'api': '74f9914d-b8c9-44f0-ad5c-13af2d02144c',
    'puf': 'f5a1f931-82f3-4b50-a051-de3e175e3d5f',
    'ccr': 'f87b828b-39cb-4a9e-9225-bb9e67ff4860'
};
```

### Onboarding Workflow IDs

Edit `unified-server.js`:

```javascript
const CCR_WORKFLOW_ID = 'f87b828b-39cb-4a9e-9225-bb9e67ff4860';
const API_WORKFLOW_ID = '74f9914d-b8c9-44f0-ad5c-13af2d02144c';
```

### Change Server Port

Edit `unified-server.js`:

```javascript
const PORT = 3000; // Change to any port 1024-65535
```

Then update `START.bat` and `STOP.bat` to use the new port.

---

## 🐛 Troubleshooting

### Windows: "Node.js is NOT installed"

**Solution:** Install Node.js
1. Visit https://nodejs.org/
2. Download LTS version (v18+)
3. Run installer with defaults
4. Restart computer
5. Run `START.bat` again

---

### Windows: "Port 3000 is already in use"

**Solution:** Stop the existing server
1. Run `STOP.bat` to stop any running servers
2. OR open Task Manager → End `node.exe` processes
3. Run `START.bat` again

---

### Chatbot: "Proxy server error" (500)

**Solution:** Configure API token
1. Open the chatbot (robot icon)
2. Click settings (⚙️)
3. Enter your TR OpenArena API token
4. Try again

**OR** enable demo mode to test without a token

---

### Server Won't Start: "EADDRINUSE"

**Solution:**

```bash
# Windows
netstat -ano | findstr ":3000"
taskkill /F /PID <PID>

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

Then restart: `npm start` or `START.bat`

---

### Onboarding Form Timeout

**Solutions:**
1. Try demo mode first (checkbox at bottom of form)
2. Verify API token is valid
3. Check TR network connection (VPN)
4. Check server logs in terminal for errors
5. Try again (agents may be slow sometimes)

---

### npm install Failed

**Solutions:**
- Check internet connection
- Temporarily disable firewall
- If behind corporate proxy, configure npm:
  ```bash
  npm config set proxy http://proxy.company.com:8080
  npm config set https-proxy http://proxy.company.com:8080
  npm install
  ```

---

## 📊 Performance

| Feature | Response Time | Timeout | Tokens | Retries |
|---------|---------------|---------|--------|---------|
| AI Chatbot | 2-5 seconds | 30s | 4,000 | 3 |
| Partner Onboarding | 2-3 minutes | 120s per agent | 8,000 | 3 per agent |

---

## 🌐 Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome 90+ | ✅ |
| Firefox 88+ | ✅ |
| Safari 14+ | ✅ |
| Edge 90+ | ✅ |
| IE11 | ❌ |

---

## 🔐 Security Notes

### Current Implementation (POC)
⚠️ **Not production-ready:**
- API credentials stored in browser sessionStorage
- No rate limiting
- No user authentication
- No audit logging

### Production Recommendations
✅ **For production:**
- Implement user authentication (SSO/OAuth)
- Server-side API key management
- Rate limiting per user/IP
- Audit logging for all API calls
- HTTPS enforcement
- Content Security Policy headers
- Input sanitization and validation

---

## 🛠️ Development

### Start Development Server

```bash
npm start
```

### Testing

**Test AI Chatbot:**
```bash
# 1. Start server
npm start

# 2. Open http://localhost:3000
# 3. Click robot icon
# 4. Enable demo mode OR enter API token
# 5. Ask: "How do I authenticate with the API?"
```

**Test Partner Onboarding:**
```bash
# 1. Open http://localhost:3000/partner-onboarding.html
# 2. Enable demo mode (checkbox)
# 3. Fill form with test data
# 4. Click "Generate Report"
# 5. View mock report (instant)
```

---

## 🎨 Customization

### Update TR Branding

Edit `assets/css/main.css`:

```css
:root {
    --color-primary: #FF8000;        /* TR Orange */
    --color-secondary: #002B49;      /* TR Navy */
}
```

### Add New Pages

1. Create new HTML file (e.g., `new-page.html`)
2. Copy header/footer structure from `index.html`
3. Add to navigation menu in all HTML files:

```html
<div class="nav-section">
    <a href="new-page.html" class="nav-section-title">
        <span><i class="fas fa-icon"></i> New Page</span>
    </a>
</div>
```

---

## 📝 Windows Batch Scripts Technical Details

### START.bat Execution Flow

1. **[1/5] Node.js Check** → Verifies Node.js is installed
2. **[2/5] npm Check** → Verifies npm is available (uses `call npm` to prevent exit)
3. **[3/5] Dependencies** → Auto-installs if `node_modules` missing
4. **[4/5] Port Check** → Warns if port 3000 is in use
5. **[5/5] Start Server** → Runs `npm start` and opens browser

### STOP.bat Behavior

1. Finds processes listening on port 3000
2. Extracts PID (Process ID)
3. Asks for confirmation
4. Terminates with `taskkill /F /PID`

### Key Technical Details

- **Critical Fix**: Uses `call npm` instead of `npm` because npm.cmd is a batch file
- **Error Handling**: Every step has detailed error messages with solutions
- **User Experience**: Progress indicators [1/5] → [5/5] with clear status messages
- **Port Conflict**: Offers choice to continue or cancel if port in use

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/improvement`
3. Make changes
4. Test locally: `npm start`
5. Commit: `git commit -m "Add feature: description"`
6. Push: `git push origin feature/improvement`
7. Create Pull Request

---

## 📚 Additional Resources

- **[TR Developer Portal](https://developers.thomsonreuters.com)** - Official TR API docs
- **[Pagero PUF Docs](https://pagero.github.io/puf-billing/)** - PUF format specification
- **[Node.js Downloads](https://nodejs.org/)** - Get Node.js

---

## 📄 License

© 2025 Thomson Reuters. All rights reserved.

---

## 🙏 Support

- **Issues:** Report bugs via GitHub Issues
- **Questions:** Use the AI chatbot on the site
- **API Support:** Contact TR support team

---

**Built with** ❤️ and [Claude Code](https://claude.com/claude-code) 🤖
