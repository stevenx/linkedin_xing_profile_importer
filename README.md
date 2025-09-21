# LinkedIn & XING Profile Automation Tool - Import CV/Resume to Social Networks

Automated LinkedIn and XING profile updater that imports your CV/resume from Markdown format directly to your professional social network profiles. Built with Node.js and Playwright for reliable browser automation.

## 🚀 What This Tool Does

This automation tool helps professionals keep their LinkedIn and XING profiles up-to-date by automatically importing work experience, education, and skills from a structured Markdown CV/resume file. No more manual copying and pasting - update once in your CV file and sync to both platforms.

## ✨ Key Features

### LinkedIn Profile Automation
- **Automatic CV parsing** - Extracts structured data from Markdown-formatted CV/resume files
- **Secure login automation** - Safely logs into LinkedIn with credentials from environment variables
- **Comprehensive profile updates**:
  - Work experience with dates and descriptions
  - Education history
  - Professional summary/about section
  - Skills and expertise
  - Contact information
- **Visual browser mode** - Shows browser window during automation for transparency
- **Screenshot documentation** - Captures before/after screenshots for verification

### XING Profile Automation
- **Bulk experience import** - Add all work experiences from your CV at once
- **Smart batch processing** - Resume from any position if interrupted
- **Complete form filling**:
  - Job titles and positions
  - Company names and industries
  - Employment dates (start/end)
  - Job descriptions and responsibilities
  - Career level (Junior, Senior, etc.)
  - Professional discipline (IT, Marketing, etc.)
- **German interface support** - Handles XING's German UI automatically
- **Flexible processing** - Add all entries or specific ranges

## 📋 Prerequisites

- Node.js 14+ installed
- LinkedIn account
- XING account (for XING automation)
- CV/Resume in Markdown format

## 🛠️ Installation & Setup

### 1. Clone and Install
```bash
git clone [repository-url]
cd linkedincvimorter
npm install
```

### 2. Configure Environment Variables
Create a `.env` file from the example template:
```bash
cp .env.example .env
```

Edit `.env` with your social network credentials:
```env
# LinkedIn Credentials
LINKEDIN_EMAIL=your.email@example.com
LINKEDIN_PASSWORD=your_linkedin_password

# XING Credentials
XING_EMAIL=your.email@example.com
XING_PASSWORD=your_xing_password

# CV File Path
CV_MD_PATH=./cv.md
```

### 3. Prepare Your CV
Place your CV in Markdown format in the project directory (default: `cv.md`)

## 🎯 Usage Guide

### Update LinkedIn Profile
```bash
node linkedin.js
```

**How it works:**
1. Parses your Markdown CV file
2. Displays extracted data for review
3. Asks for confirmation before proceeding
4. Opens browser window (visible for security)
5. Automatically logs into LinkedIn
6. Updates all profile sections with CV data
7. Saves before/after screenshots

### Update XING Profile

**Import all experiences:**
```bash
node xing.js
```

**Resume from specific position (e.g., entry #9):**
```bash
node xing.js 9
```

**Process limited batch (e.g., 5 entries from position #9):**
```bash
node xing.js 9 5
```

**XING automation process:**
1. Extracts work experiences from CV
2. Logs into XING automatically
3. Navigates to employment form
4. Fills all required fields per position
5. Saves each entry individually
6. Takes completion screenshot

## 📖 CV Markdown Format Requirements

For optimal parsing, structure your CV markdown file as follows:

### Required Format
```markdown
see cv.md for example 
```

## 🔧 Troubleshooting

### Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Login fails | Check credentials in `.env` file |
| CV parsing errors | Verify Markdown formatting matches the example structure |
| Script timeout on XING | Resume from last position using `node xing.js [number]` |
| Elements not found | Platform UI may have changed - check for updates |
| German interface issues | Script handles German automatically, no action needed |

## 🔒 Security Best Practices

- **Never commit `.env` file** - Add to `.gitignore`
- **Use app-specific passwords** when available
- **Run on secure networks** only
- **Store credentials securely** - Consider using environment variables or secrets manager
- **Review permissions** - Ensure scripts have appropriate access levels

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is for educational purposes. Users are responsible for complying with LinkedIn and XING Terms of Service.

## ⚠️ Disclaimer

This tool automates browser interactions with LinkedIn and XING. Use at your own risk and ensure compliance with all applicable terms of service and laws. The authors are not responsible for any account restrictions or violations resulting from use of this tool.

## 🏷️ Keywords

LinkedIn automation, XING automation, profile updater, CV import, resume parser, Markdown CV, Node.js automation, Playwright browser automation, social media profile sync, professional network automation, bulk profile update, German XING support
