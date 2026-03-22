@echo off
echo Adding firewall rules for Clinic app...
netsh advfirewall firewall add rule name="Clinic Backend 5002" dir=in action=allow protocol=TCP localport=5002
netsh advfirewall firewall add rule name="Clinic Frontend 5175" dir=in action=allow protocol=TCP localport=5175
echo Done! Firewall rules added.
pause
