# Day 1 Testing Guide - Campaign & Lead Detail Pages

## 🧪 How to Test New Features

### Prerequisite: Make Sure Both Services Running

**Check Backend**
```bash
# Terminal 1
curl http://localhost:3000/api/auth/login
# Should return 400 (empty body error), not 404
```

**Check Frontend**
```
Browser: http://localhost:3001
Should show dashboard if logged in, or login page
```

---

## 🔍 Test Steps

### 1. Login to Dashboard

**Expected Result:**
- See dashboard with "Campaigns" and "Leads" tabs
- Campaigns tab should show campaign cards
- Leads tab should show leads in table

**Test:**
```
1. Go to http://localhost:3001
2. Login with: reigan@upj.ac.id / Reigan123
3. Should see dashboard with 2 tabs
```

---

### 2. Test Campaign Detail Page

**Navigate to Campaign Detail:**
```
1. In Dashboard, go to "Campaigns" tab
2. Click on any campaign card (e.g., "Spring Promo")
3. Should navigate to /campaign/{id}
```

**Verify Campaign Detail Page Shows:**
- ✅ Back button (← Back) top-left
- ✅ Campaign name as heading
- ✅ Edit & Delete buttons top-right
- ✅ Campaign Information section:
  - Name
  - Template
  - Status badge
  - Target Lead Status
  - Created By
  - Created Date
- ✅ Campaign Statistics section:
  - 4 stat cards (Total Messages, Delivered, Read, Failed)
  - With percentage for delivery/read rates
  - Pie chart showing message distribution
  - Bar chart showing performance rates
- ✅ Campaign Status section:
  - Buttons to change status (Activate, Pause, Draft)

**Test Actions:**
```
1. Click Edit button
   → Form should appear below campaign info
   → Should have Name & Target Lead Status fields
   → Should have Save Changes & Cancel buttons
   
2. Click Edit again
   → Form should hide
   
3. Try Edit, change name, click Save Changes
   → Should see success toast "Campaign updated"
   → Campaign info should refresh
   
4. Try changing status
   → Click "Pause" button (if Campaign is DRAFT)
   → Should see success toast
   → Status badge should update
```

---

### 3. Test Lead Detail Page

**Navigate to Lead Detail:**
```
1. In Dashboard, go to "Leads" tab
2. Click on any lead row (e.g., "Budi Santoso")
3. Should navigate to /lead/{id}
```

**Verify Lead Detail Page Shows:**
- ✅ Back button (← Back) top-left
- ✅ Lead name as heading
- ✅ Edit & Delete buttons top-right
- ✅ Lead Information section:
  - Full Name
  - Phone Number
  - Email
  - City
  - Current Status (with badge)
  - Created Date
- ✅ Lead Status section:
  - Current Status display
  - Change Status button
- ✅ Status History section (if available):
  - Timeline showing status changes
  - From → To status
  - Timestamp & who changed it

**Test Actions:**
```
1. Click Edit button
   → Form should appear below lead info
   → Should have All fields (Name, Phone, Email, City)
   → Should have Save Changes & Cancel buttons
   
2. Click Edit again
   → Form should hide
   
3. Try Edit, change name, click Save Changes
   → Should see success toast "Lead updated"
   → Lead info should refresh
   
4. Try changing status
   → Click "Change Status" button
   → Should show options to change to (NEW, CONTACTED, QUALIFIED, CONVERTED)
   → Click a new status
   → Should see success toast
   → Status should update
   → History should show new entry
```

---

### 4. Test Navigation & Routing

**Check Routes Working:**
```
1. From Campaign Detail, click Back button
   → Should return to /dashboard Campaigns tab
   
2. From Lead Detail, click Back button
   → Should return to /dashboard Leads tab
   
3. Direct URL test:
   → Try: http://localhost:3001/campaign/spring-promo-id
   → Should show that campaign detail
   
   → Try: http://localhost:3001/lead/any-lead-id
   → Should show that lead detail
```

---

### 5. Test Charts & Visualizations

**In Campaign Detail Page:**
```
1. Check Statistics section
   → Should see 4 colored cards (Blue, Green, Green, Red)
   → Cards should show: Total Messages, Delivered %, Read %, Failed
   
2. Check Charts
   → Pie chart showing: Sent (blue), Delivered (green), Read (blue), Failed (red)
   → Bar chart showing Delivery Rate & Read Rate as percentages
   
3. Responsive test
   → Resize browser window
   → Charts and cards should adapt to smaller screens
```

---

### 6. Test Error Handling

**Test Update Errors:**
```
1. Try changing campaign/lead to same status
   → System should detect and prevent
   
2. Try deleting and confirming delete
   → System should show confirmation dialog
   → Clicking confirm should delete
   → Should redirect to dashboard after delete
   
3. Close browser console errors
   → Should show console errors if any
   → Check: Network tab for failed requests
```

---

## ✅ Expected Results Comparison

### Before (Old Version)
```
Dashboard
├── Campaigns Tab
│   └── Campaign list (clickless cards)
├── Leads Tab
│   └── Lead table (view/edit buttons don't work)
└── No detail pages
```

### After (New Version) - What You Should See
```
Dashboard
├── Campaigns Tab
│   └── Campaign cards (CLICKABLE)
│       └── Click → /campaign/{id}
│           ├── Full campaign details
│           ├── Edit & delete
│           ├── Status management
│           ├── Statistics with charts
│           └── Back button → Dashboard
├── Leads Tab
│   └── Lead table (CLICKABLE rows)
│       └── Click → /lead/{id}
│           ├── Full lead details
│           ├── Edit & delete
│           ├── Status management
│           ├── Change status with history
│           └── Back button → Dashboard
└── No errors in console
```

---

## 🐛 Debugging If Issues Occur

### Issue: Detail page shows "Loading... Loading... Loading..."

**Solution:**
1. Check backend is running: `npm start` in backend folder
2. Check network tab in browser dev tools (F12)
3. Should see GET request to `/api/campaigns/:id`
4. If 404: Campaign ID might be wrong
5. If 500: Backend error - check backend logs

### Issue: Charts not showing

**Solution:**
1. Check browser console (F12) for errors
2. Should see no error messages
3. If error about Chart: make sure npm install completed
4. Try refreshing page

### Issue: Edit button doesn't work

**Solution:**
1. Make sure backend is accessible
2. Check network tab for PUT requests
3. Should see PUT `/api/campaigns/:id` or `/api/leads/:id`
4. If error: check backend has update endpoint

### Issue: Navigation back doesn't work

**Solution:**
1. Click back button should use react-router
2. Should navigate to `/dashboard`
3. If not working: check browser history (browser back button)
4. Try hard refresh (Ctrl+Shift+R)

---

## 📊 Success Criteria

✅ ALL of these should work:
- [ ] Campaign detail page loads with data
- [ ] Lead detail page loads with data
- [ ] Charts display properly
- [ ] Edit button shows form
- [ ] Save changes updates data & shows toast
- [ ] Status change button works
- [ ] Status history shows timeline
- [ ] Delete button shows confirmation
- [ ] Back buttons navigate correctly
- [ ] No console errors
- [ ] Responsive on mobile

---

## 🎬 Next Steps After Testing

**If everything works:**
```
"Semua berjalan lancar!" 
→ Lanjut ke Day 2: Enhancement Components
→ Build LeadForm, CSV import, enhanced validation
```

**If issues found:**
```
"Ada error di [component]"
→ Tell me exact error
→ I'll fix it immediately
→ Then continue to Day 2
```

---

## 📌 Quick Checklist

Before you start testing, make sure:

- [ ] Backend running on localhost:3000
- [ ] Frontend running on localhost:3001
- [ ] Database upj_crm has data (at least 1 campaign, 1 lead)
- [ ] Logged in as reigan@upj.ac.id
- [ ] Browser dev tools ready (F12)
- [ ] Network tab open to debug if needed

---

**Ready to test?** Let me know if you see or encounter any issues!
