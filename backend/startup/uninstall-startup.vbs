Option Explicit
Dim shell, startupDir, cmd, rc
Set shell = CreateObject("WScript.Shell")
startupDir = "C:\Users\HP\OneDrive\Desktop\clinic new life\backend\startup"
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & startupDir & "\uninstall-windows-startup.ps1""" 
rc = shell.Run(cmd, 0, True)
If rc = 0 Then
  WScript.Echo "Removed ClinicBackendAutoStart."
Else
  WScript.Echo "Uninstall failed. Exit code: " & rc
End If
