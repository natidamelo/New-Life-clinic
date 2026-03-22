Option Explicit
Dim shell, startupDir, cmd, rc
Set shell = CreateObject("WScript.Shell")
startupDir = "C:\Users\HP\OneDrive\Desktop\clinic new life\backend\startup"
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & startupDir & "\install-windows-startup.ps1""" & " -System"
rc = shell.Run(cmd, 0, True)
If rc = 0 Then
  WScript.Echo "Installed ClinicBackendAutoStart (system startup)."
Else
  WScript.Echo "Install failed. Exit code: " & rc
End If
