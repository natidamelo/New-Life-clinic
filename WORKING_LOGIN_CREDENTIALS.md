# Working Login Credentials ✅

## Verified Working Accounts

Based on testing with the actual database, here are the confirmed working login credentials:

### 🔑 **Admin Account**
- **Identifier**: `admin@clinic.com` OR `admin`
- **Password**: `admin123`
- **Role**: Admin
- **Status**: ✅ Verified

### 👨‍⚕️ **Doctor Accounts**
- **DR Natan**
  - **Identifier**: `doctor123@clinic.com` OR `DR Natan`
  - **Password**: `doctor123`
  - **Role**: Doctor
  - **Status**: ✅ Verified

- **Doctor Smith**
  - **Identifier**: `doctor@clinic.com` OR `doctor`
  - **Password**: `doctor123`
  - **Role**: Doctor
  - **Status**: ⚠️ Not verified

### 👩‍⚕️ **Nurse Accounts**
- **Nurse Sarah**
  - **Identifier**: `nurse@clinic.com` OR `Nurse Sarah`
  - **Password**: `nurse123`
  - **Role**: Nurse
  - **Status**: ✅ Verified

### 🏥 **Receptionist Account**
- **Rception Meron**
  - **Identifier**: `meronabebe@clinic.com` OR `Rception Meron`
  - **Password**: `reception123`
  - **Role**: Receptionist
  - **Status**: ✅ Verified

### 🔬 **Lab Technician Accounts**
- **Lab Technician**
  - **Identifier**: `lab@clinic.com` OR `Lab Tech`
  - **Password**: `lab123`
  - **Role**: Lab Technician
  - **Status**: ✅ Verified

- **Imaging Specialist**
  - **Identifier**: `imaging@clinic.com` OR `Imaging Specialist`
  - **Password**: `imaging123`
  - **Role**: Lab Technician
  - **Status**: ✅ Verified

## 🚨 **Important Notes**

### Login Field Requirements
The login endpoint expects:
- `identifier` (not `email`) - can be email or username
- `password`

### Example Login Request
```json
{
  "identifier": "DR Natan",
  "password": "doctor123"
}
```

### Frontend Login Form
Make sure your frontend login form is sending:
- `identifier` field (not `email`)
- `password` field

## 🔧 **Troubleshooting Login Issues**

### If "DR Natan" login fails:
- ✅ Use `DR Natan` as identifier (not email)
- ✅ Use `doctor123` as password (not `natan123`)

### If any login fails:
1. Check the identifier field name (should be `identifier`, not `email`)
2. Verify the password is correct
3. Ensure the backend server is running on port 5002
4. Check if the user account is verified

### Test Login with curl:
```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"DR Natan","password":"doctor123"}'
```

## 🎯 **Recommended Test Account**
For testing purposes, use:
- **Identifier**: `DR Natan`
- **Password**: `doctor123`

This account is verified and has doctor permissions.
