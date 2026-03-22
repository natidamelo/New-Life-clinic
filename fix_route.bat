@echo off
echo Fixing backend route file...
copy "operatingExpenses_fixed.js" "C:\clinic-new-life\backend\routes\operatingExpenses.js" /Y
echo File copied successfully!
cd /d C:\clinic-new-life\backend
echo Restarting backend server...
npm run dev 