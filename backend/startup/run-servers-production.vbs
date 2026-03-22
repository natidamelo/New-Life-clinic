Option Explicit
Dim shell
Dim backendDir, frontendDir
Dim backendLogDir, frontendLogDir
Dim backendCmd, frontendCmd

Set shell = CreateObject("WScript.Shell")

backendDir = "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
frontendDir = "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
backendLogDir = backendDir & "\logs"
frontendLogDir = frontendDir & "\startup\logs"

' Ensure log directories exist via cmd
shell.Run "cmd /c if not exist """ & backendLogDir & """ mkdir """ & backendLogDir & """", 0, True
shell.Run "cmd /c if not exist """ & frontendLogDir & """ mkdir """ & frontendLogDir & """", 0, True

' Build backend command: prefer start-server.js start, else server.js
Dim backendEntry
backendEntry = backendDir & "\start-server.js"
If CreateObject("Scripting.FileSystemObject").FileExists(backendEntry) Then
  backendCmd = "cmd /c ""cd /d """ & backendDir & """ && set NODE_ENV=production && node """ & backendEntry & """ start >> """ & backendLogDir & "\startup.out.log"" 2>> """ & backendLogDir & "\startup.err.log"""""
Else
  backendEntry = backendDir & "\server.js"
  backendCmd = "cmd /c ""cd /d """ & backendDir & """ && set NODE_ENV=production && node """ & backendEntry & """ >> """ & backendLogDir & "\startup.out.log"" 2>> """ & backendLogDir & "\startup.err.log"""""
End If

' Build frontend command using npm run dev (development server with production backend)
frontendCmd = "cmd /c ""cd /d """ & frontendDir & """ && npm run dev >> """ & frontendLogDir & "\startup.out.log"" 2>> """ & frontendLogDir & "\startup.err.log"""""

' Run both hidden (0) and do not wait (False)
shell.Run backendCmd, 0, False
WScript.Sleep 2000
shell.Run frontendCmd, 0, False

' Get current network IP address dynamically
Dim networkIP, objWMIService, colItems, objItem
networkIP = "localhost"

Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colItems = objWMIService.ExecQuery("SELECT * FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled = True")

For Each objItem in colItems
    If Not IsNull(objItem.IPAddress) Then
        Dim ipAddress
        ipAddress = objItem.IPAddress(0)
        ' Skip localhost and link-local addresses
        If Left(ipAddress, 4) <> "127." And Left(ipAddress, 7) <> "169.254" Then
            networkIP = ipAddress
            Exit For
        End If
    End If
Next

MsgBox "Production servers started!" & vbCrLf & vbCrLf & _
       "Backend: Running in production mode" & vbCrLf & _
       "Frontend: Running on port 5175" & vbCrLf & vbCrLf & _
       "Access at: http://" & networkIP & ":5175" & vbCrLf & _
       "          http://localhost:5175" & vbCrLf & vbCrLf & _
       "Backend will auto-match the frontend IP!" & vbCrLf & vbCrLf & _
       "Check logs in:" & vbCrLf & _
       "Backend: " & backendLogDir & vbCrLf & _
       "Frontend: " & frontendLogDir, vbInformation, "Clinic Management System - Production"

