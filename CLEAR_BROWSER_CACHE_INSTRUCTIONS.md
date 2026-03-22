# Clear Browser Data to Fix Partial Payment Issue

## The Problem
Your frontend is showing cached/stale data instead of real database data. This prevents partial payments from working correctly.

## Solution: Clear All Browser Data

### Method 1: Complete Browser Reset (Recommended)
1. **Open Chrome Developer Tools** (F12)
2. **Right-click the refresh button** (while DevTools is open)
3. **Select "Empty Cache and Hard Reload"**
4. **Or use keyboard shortcut**: Ctrl+Shift+Delete

### Method 2: Manual Clear
1. Go to **Chrome Settings** → **Privacy and Security** → **Clear browsing data**
2. Select **"All time"** as time range
3. Check these boxes:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - ✅ Local storage data
4. Click **"Clear data"**

### Method 3: Developer Tools Storage Clear
1. Open **Chrome DevTools** (F12)
2. Go to **Application** tab
3. In left sidebar, expand **Storage**
4. Right-click **"Storage"** → **"Clear site data"**
5. Click **"Clear site data"** in the dialog

### Method 4: Incognito Mode Test
1. Open **Incognito/Private window**
2. Navigate to your clinic app
3. Test if invoices still show up
4. If no invoices show in incognito, the issue is browser cache

## After Clearing Cache
1. **Refresh the page** (Ctrl+F5)
2. **Check the invoices page** - it should show 0 invoices
3. **Then you can create new test data** and partial payments will work correctly

## Why This Happened
- Browser cached old API responses or localStorage data
- Frontend kept using cached data instead of making fresh API calls
- New partial payments went to database but UI showed cached data
- This created the illusion that partial payments weren't working

## Next Steps
After clearing cache, you'll need to:
1. Create new test invoices/prescriptions
2. Test partial payments with fresh data
3. Verify notifications work correctly