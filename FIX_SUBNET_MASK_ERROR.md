# Fix: "Invalid entry" - Subnet Mask Error

## The Error You're Seeing

```
Subnet mask: Invalid entry
Can't save IP settings. Check one or more settings and try again.
```

## Solution: Use Full Subnet Mask

### ❌ Don't use: `24`
### ✅ Instead use: `255.255.255.0`

## Corrected Settings

Enter these values:

```
IP address:        192.168.1.100
Subnet mask:       255.255.255.0    ← Use this format!
Gateway:           192.168.1.1
Preferred DNS:     8.8.8.8
Alternate DNS:     8.8.4.4
```

## Why This Happens

Windows Settings UI expects the **full subnet mask** format (255.255.255.0), not the **prefix length** format (24).

- Prefix: 24 (CIDR notation) ❌ Not accepted
- Full mask: 255.255.255.0 ✅ Accepted

## Common Subnet Masks

| Prefix | Full Subnet Mask | Usage |
|--------|------------------|-------|
| /24 | 255.255.255.0 | Most home/office networks |
| /16 | 255.255.0.0 | Large networks |
| /8 | 255.0.0.0 | Very large networks |

For clinic WiFi, use: **255.255.255.0**

## Step-by-Step Fix

1. In the dialog that's open, change:
   - **Subnet mask field:** Delete `24`
   - **Type:** `255.255.255.0`

2. Verify all fields:
   ```
   IP address:        192.168.1.100
   Subnet mask:       255.255.255.0
   Gateway:           192.168.1.1
   Preferred DNS:     8.8.8.8
   ```

3. Click **Save**

4. Should work now! ✅

## If Still Getting Error

Check each field:

- **IP address:** Must be in format `192.168.1.100` (4 numbers separated by dots)
- **Subnet mask:** Must be `255.255.255.0` (full format)
- **Gateway:** Must be `192.168.1.1` (your router IP)
- **DNS:** Must be `8.8.8.8` (valid DNS server)

## After Successful Save

Test with:
```cmd
ipconfig
ping 192.168.1.1
ping google.com
```

All should work! Then your permanent clinic URL is:
```
http://192.168.1.100:5175
```










