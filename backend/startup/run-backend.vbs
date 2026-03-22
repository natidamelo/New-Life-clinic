Option Explicit
Dim shell, startupDir, cmd
Set shell = CreateObject("WScript.Shell")
startupDir = "C:\Users\HP\OneDrive\Desktop\clinic new life\backend\startup"
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & startupDir & "\run-backend.ps1""" 
' Run hidden (0) and do not wait (False)
shell.Run cmd, 0, False
