# TR ONESOURCE API Partner Integration Guide

A professional, interactive documentation site for TR ONESOURCE API partner integration guidance, featuring an AI-powered chatbot assistant and automated partner onboarding.

## 🌟 Overview

This site provides comprehensive documentation and tools for partners integrating with TR ONESOURCE E-Invoicing APIs:

- **📚 5 Documentation Pages**: Homepage, Getting Started, E-Invoicing Integration, API Reference, FAQ
- **🤖 AI Assistant**: Context-aware chatbot powered by TR OpenArena
- **📝 Partner Onboarding**: Automated onboarding form with AI-generated implementation reports
- **🎨 Professional Design**: TR branding with responsive mobile-first layout
- **⚡ Zero Build Process**: Pure HTML/CSS/JavaScript

## ✨ Key Features

### Documentation
- ✅ Comprehensive API integration guides
- ✅ Code examples in Python, JavaScript, XML, JSON
- ✅ Interactive FAQ with search and filtering
- ✅ Complete API reference catalog (9 ONESOURCE APIs)
- ✅ Responsive design for all devices

### AI-Powered Tools
- ✅ **AI Chatbot**: Ask questions about API integration, authentication, PUF format, error handling
- ✅ **Partner Onboarding**: Generate personalized implementation reports by answering a form
  - Calls CCR Agent for country compliance requirements
  - Calls API Agent for implementation guidance
  - Generates comprehensive 2-part report (compliance + API integration)

### Technical
- ✅ **Unified Backend**: Single server handles both chatbot and onboarding
- ✅ **Dark Mode**: Professional dark theme matching Pagero style
- ✅ **Demo Mode**: Test without API credentials using mock data

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ (for backend server)
- **TR Network Access** (VPN or office network)
- **TR OpenArena API Token** (optional - use demo mode for testing)

### Installation

```bash
# Clone or navigate to project
cd onesource-github

# Install dependencies
npm install

# Start the unified server
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
================================================
```

### Access the Site

Open your browser and navigate to:
```
http://localhost:3000/
```

**All features work:**
- ✅ Browse documentation pages
- ✅ Use AI chatbot (click robot icon in bottom-right)
- ✅ Access partner onboarding form (click "Partner Onboarding" in menu)

---

## 🏗️ Architecture

### Unified Server Design

```
┌──────────────────────────────────────────────────┐
│  Unified Server (Port 3000)                      │
│  unified-server.js                               │
│                                                   │
│  📍 Route 1: POST /api/proxy                     │
│     → AI Chatbot                                 │
│     → 30s timeout, 4K tokens                     │
│     → Quick conversational responses             │
│                                                   │
│  📍 Route 2: POST /api/generate-report           │
│     → Partner Onboarding                         │
│     → 120s timeout, 8K tokens                    │
│     → Sequential: CCR Agent → API Agent          │
│     → Comprehensive implementation reports       │
│                                                   │
│  📍 Route 3: GET /health                         │
│     → Health check endpoint                      │
│                                                   │
│          ↓ All routes call ↓                     │
│  ┌────────────────────────────────────────────┐ │
│  │  OpenArena API (Remote)                    │ │
│  │  aiopenarena.gcs.int.thomsonreuters.com    │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Single command: `npm start`
- ✅ One port to manage: 3000
- ✅ Simplified architecture
- ✅ Easier maintenance

---

## 📁 Project Structure

```
onesource-github/
├── index.html                          # Homepage
├── getting-started.html                # Getting started guide
├── einvoicing-integration.html         # E-invoicing integration
├── api-reference.html                  # API reference catalog
├── faq.html                            # FAQ page
├── partner-onboarding.html             # ⭐ NEW: Partner onboarding form
│
├── unified-server.js                   # ⭐ NEW: Unified backend (1 server)
├── local-proxy.js                      # Legacy: Chatbot proxy only
├── partner-onboarding-server.js        # Legacy: Onboarding only
│
├── assets/
│   ├── css/
│   │   ├── main.css                    # Global styles & TR branding
│   │   ├── layout.css                  # Page layout & structure
│   │   ├── components.css              # Reusable UI components
│   │   ├── chatbot.css                 # Chat widget styles
│   │   └── partner-onboarding.css      # ⭐ NEW: Onboarding form styles
│   │
│   ├── js/
│   │   ├── mobile-menu.js              # Mobile navigation
│   │   ├── chatbot-ui.js               # Chat widget UI
│   │   ├── openarena-client.js         # OpenArena API client
│   │   ├── chatbot-controller.js       # Chat logic & context
│   │   └── partner-onboarding.js       # ⭐ NEW: Form validation & submission
│   │
│   └── images/
│       └── Thomson-Reuters-Logo-*.png  # TR logo assets
│
├── package.json                        # Node.js dependencies
├── README.md                           # This file
├── SERVER-GUIDE.md                     # ⭐ NEW: Detailed server documentation
└── PARTNER-ONBOARDING.md              # ⭐ NEW: Onboarding feature guide
```

---

## 🎯 Features Guide

### 1. AI Chatbot Assistant

**Purpose:** Answer questions about API integration in real-time

**How to Use:**
1. Click the robot icon (bottom-right corner)
2. Click the settings icon (⚙️) to configure API credentials
3. Enter your TR OpenArena API Token
4. Ask questions like:
   - "How do I authenticate with the API?"
   - "What is PUF format?"
   - "How do I handle recipient not found errors?"

**Features:**
- Context-aware responses based on current page
- Markdown formatting with code highlighting
- Conversation history
- Multi-agent support (API, PUF, CCR specialists)

---

### 2. Partner Onboarding Form

**Purpose:** Generate personalized implementation reports automatically

**How to Use:**
1. Click "Partner Onboarding" in the left menu
2. Fill out the 8-section form:
   - Partner & Contact Information
   - Partnership Type
   - System Integration
   - Countries in Scope
   - AP/AR Handling
   - Support Model
   - Account Management
   - Service Model
3. Click "Generate Report"
4. Wait 2-3 minutes for AI agents to analyze
5. Review your comprehensive implementation report

**Report Includes:**
- ✅ **Country Compliance Requirements** (from CCR Agent)
  - Compliance models and clearance requirements
  - Required document types
  - Mandatory fields and formats
  - Validation rules
  - Deadlines and timelines

- ✅ **API Implementation Guide** (from API Agent)
  - Authentication setup (OAuth 2.0)
  - Required endpoints
  - Integration architecture
  - Request/response examples
  - Webhook configuration
  - Error handling strategies
  - Code samples

**Features:**
- Auto-save every 30 seconds (localStorage)
- Real-time validation
- Demo mode (test without API token)
- Print/copy/download report
- Mobile responsive

---

## 🔧 Configuration

### AI Chatbot Agents

Configure which agent to use by clicking the agent tabs:
- **API Agent**: API integration, authentication, endpoints
- **PUF Agent**: PUF document format, field mappings
- **CCR Agent**: Country compliance, e-invoicing mandates

### Partner Onboarding Agents

Automatically uses:
- **CCR Agent**: Country CCR Expert (Workflow ID: `f87b828b-39cb-4a9e-9225-bb9e67ff4860`)
- **API Agent**: API Integration Expert (Workflow ID: `74f9914d-b8c9-44f0-ad5c-13af2d02144c`)

To change workflow IDs, edit `unified-server.js`:
```javascript
const CCR_WORKFLOW_ID = 'your-ccr-workflow-id';
const API_WORKFLOW_ID = 'your-api-workflow-id';
```

---

## 🛠️ Development

### Start Development Server

```bash
npm start
```

Runs the unified server on port 3000.

### Alternative Commands

```bash
npm run start:proxy      # Run chatbot proxy only (legacy)
npm run start:onboarding # Run onboarding backend only (legacy)
```

### Testing

**Test AI Chatbot:**
1. Open http://localhost:3000
2. Click robot icon
3. Enable demo mode OR enter API token
4. Ask: "How do I authenticate with the API?"

**Test Partner Onboarding:**
1. Open http://localhost:3000/partner-onboarding.html
2. Enable demo mode (checkbox at bottom)
3. Fill out form with test data
4. Click "Generate Report"
5. View mock report (instant response)

**Test with Real Agents:**
1. Configure API token (settings icon)
2. Disable demo mode
3. Submit form
4. Wait 2-3 minutes for real AI agents

---

## 📊 Performance

### AI Chatbot
- **Response Time:** 2-5 seconds
- **Timeout:** 30 seconds
- **Max Tokens:** 4,000
- **Retries:** Up to 3 attempts

### Partner Onboarding
- **Total Time:** 2-3 minutes
- **CCR Agent:** ~60 seconds
- **API Agent:** ~60 seconds
- **Timeout per Agent:** 120 seconds
- **Max Tokens:** 8,000
- **Retries:** Up to 3 attempts per agent

---

## 🐛 Troubleshooting

### Server Won't Start

**Issue:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Windows
netstat -ano | findstr ":3000"
taskkill //F //PID <PID>

# Mac/Linux
lsof -i :3000
kill -9 <PID>

# Then restart
npm start
```

---

### Chatbot Not Responding

**Issue:** Chat sends message but gets no response

**Solutions:**
1. Check server is running: http://localhost:3000/health
2. Check browser console for errors
3. Verify API token is valid
4. Try demo mode first
5. Check TR network connection (VPN)

---

### Onboarding Form Timeout

**Issue:** "Failed to generate report" after waiting

**Solutions:**
1. Try demo mode first to verify form works
2. Check server logs for errors
3. Verify API token is valid
4. Check TR network connection
5. Try again (agents may be slow sometimes)

---

### Form Not Validating

**Issue:** Can't submit form even though all fields are filled

**Solution:**
1. Check all required fields (marked with *)
2. At least one system type must be selected
3. At least one invoice handling type (AR/AP) must be selected
4. Country 1 must be filled
5. Check browser console for validation errors

---

## 🌐 Browser Compatibility

**Tested and Supported:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Note:** IE11 is not supported (uses modern CSS Grid/Flexbox)

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

## 📚 Additional Documentation

- **[SERVER-GUIDE.md](SERVER-GUIDE.md)** - Detailed server architecture and API reference
- **[PARTNER-ONBOARDING.md](PARTNER-ONBOARDING.md)** - Partner onboarding feature guide
- **[TR Developer Portal](https://developers.thomsonreuters.com)** - Official TR API docs
- **[Pagero PUF Docs](https://pagero.github.io/puf-billing/)** - PUF format specification

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
3. Add page to navigation menu in all HTML files:
```html
<div class="nav-section">
    <a href="new-page.html" class="nav-section-title">
        <span><i class="fas fa-icon"></i> New Page</span>
    </a>
</div>
```

### Update Content

All content is in HTML files - no build process needed:
1. Edit the HTML file
2. Save
3. Refresh browser

---

## 🤝 Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/improvement`
3. Make your changes
4. Test locally: `npm start`
5. Commit: `git commit -m "Add feature: description"`
6. Push: `git push origin feature/improvement`
7. Create a Pull Request

---

## 📝 Changelog

### v2.0.0 (December 2025)
- ✨ **NEW**: Partner Onboarding form with AI-generated reports
- ✨ **NEW**: Unified server architecture (1 server instead of 2)
- ✨ **NEW**: Multi-agent orchestration (CCR + API agents)
- 🎨 Updated UI with consistent TR dark theme
- 📚 Added SERVER-GUIDE.md and PARTNER-ONBOARDING.md
- 🐛 Improved error handling and timeout management

### v1.0.0 (January 2025)
- Initial release
- 5 documentation pages
- AI chatbot with TR OpenArena integration
- Responsive design with TR branding
- Code examples and interactive components

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
