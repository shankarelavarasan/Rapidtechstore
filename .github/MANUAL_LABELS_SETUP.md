# 🏷️ Manual GitHub Labels Setup Guide

## 🚀 **QUICK SETUP INSTRUCTIONS**

### **Step 1: Navigate to Labels**
1. Go to your GitHub repository: `https://github.com/shankarelavarasan/Rapidtechstore`
2. Click on **Issues** tab
3. Click on **Labels** (next to Milestones)
4. Click **New label** button

### **Step 2: Create These Labels (Copy-Paste Ready)**

#### **🎯 COMPONENT LABELS**

**Backend Label:**
```
Name: backend
Color: #f1c40f
Description: Backend API, server, database tasks
```

**Frontend Label:**
```
Name: frontend
Color: #3498db
Description: React, UI/UX, client-side tasks
```

**AI Agent Label:**
```
Name: ai-agent
Color: #9b59b6
Description: AI chatbot, ML features
```

**Database Label:**
```
Name: database
Color: #34495e
Description: Prisma, PostgreSQL, data models
```

**Payment Label:**
```
Name: payment
Color: #e67e22
Description: Stripe integration, transactions
```

**Deployment Label:**
```
Name: deployment
Color: #1abc9c
Description: Docker, Render, CI/CD
```

#### **🚨 PRIORITY LABELS**

**Urgent Label:**
```
Name: urgent
Color: #e74c3c
Description: Critical bugs, security issues
```

**High Priority Label:**
```
Name: high-priority
Color: #e67e22
Description: Important features, deadlines
```

**Medium Priority Label:**
```
Name: medium-priority
Color: #f39c12
Description: Standard development tasks
```

**Low Priority Label:**
```
Name: low-priority
Color: #95a5a6
Description: Nice-to-have, experimental
```

#### **🔧 TYPE LABELS**

**Bug Label:**
```
Name: bug
Color: #e74c3c
Description: Something isn't working
```

**Enhancement Label:**
```
Name: enhancement
Color: #2ecc71
Description: New feature or improvement
```

**Refactor Label:**
```
Name: refactor
Color: #3498db
Description: Code improvement, cleanup
```

**Documentation Label:**
```
Name: documentation
Color: #1abc9c
Description: Internal docs, README updates
```

**Testing Label:**
```
Name: testing
Color: #9b59b6
Description: Unit tests, integration tests
```

#### **📊 STATUS LABELS**

**Blocked Label:**
```
Name: blocked
Color: #e74c3c
Description: Waiting on dependency
```

**In Progress Label:**
```
Name: in-progress
Color: #f39c12
Description: Currently being worked on
```

**Review Needed Label:**
```
Name: review-needed
Color: #3498db
Description: Ready for code review
```

**Ready to Deploy Label:**
```
Name: ready-to-deploy
Color: #2ecc71
Description: Tested and ready
```

#### **🔒 INTERNAL LABELS**

**Internal Only Label:**
```
Name: internal-only
Color: #7f8c8d
Description: Private team discussion
```

**Investor Demo Label:**
```
Name: investor-demo
Color: #9b59b6
Description: Demo preparation tasks
```

**Security Label:**
```
Name: security
Color: #e74c3c
Description: Security-related issues
```

**Performance Label:**
```
Name: performance
Color: #f39c12
Description: Performance optimization
```

## 🎯 **USAGE EXAMPLES**

### **Creating a New Issue:**

**Example 1: Backend Bug**
- Title: "API endpoint returning 500 error"
- Labels: `backend` + `bug` + `urgent`

**Example 2: Frontend Feature**
- Title: "Add dark mode toggle to settings"
- Labels: `frontend` + `enhancement` + `medium-priority`

**Example 3: AI Improvement**
- Title: "Improve chatbot response accuracy"
- Labels: `ai-agent` + `enhancement` + `high-priority`

## 🔍 **USEFUL FILTERS**

After creating labels, use these filters in Issues:

**All Backend Tasks:**
```
is:issue is:open label:backend
```

**High Priority Items:**
```
is:issue is:open label:high-priority,urgent
```

**Bugs Only:**
```
is:issue is:open label:bug
```

**Ready for Review:**
```
is:issue is:open label:review-needed
```

**Blocked Tasks:**
```
is:issue is:open label:blocked
```

## ⚡ **QUICK TIPS**

1. **Copy-paste** the label details exactly as shown above
2. **Color codes** start with # (include the hash)
3. **Create all labels** before applying to issues
4. **Use multiple labels** per issue (component + type + priority)
5. **Update labels** as work progresses

## 🎉 **AFTER SETUP**

Once all labels are created:
1. Apply labels to existing issues
2. Use filters to organize workflow
3. Train team on label usage
4. Set up issue templates with label suggestions

**Total Labels to Create: 24**