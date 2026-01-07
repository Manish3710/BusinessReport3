# Remaining Components to Fix

The User Management has been successfully fixed to use the Oracle database. These components still need the same treatment:

## Components to Fix

### 1. Auto Mail Reports (`src/components/Reports/AutoMailReports.tsx`)
**Status**: ⚠️ Still using localStorage

**What needs to change**:
- Remove `useLocalStorage` for reports
- Load from `GET /api/reports/auto-mail`
- Create via `POST /api/reports/auto-mail`
- Update via `PUT /api/reports/auto-mail/:id`
- Delete via `DELETE /api/reports/auto-mail/:id`
- Execute via `POST /api/reports/auto-mail/:id/run`

### 2. Instant Reports (`src/components/Reports/InstantReports.tsx`)
**Status**: ⚠️ Still using localStorage

**What needs to change**:
- Remove `useLocalStorage` for reports
- Load from `GET /api/reports/instant`
- Create via `POST /api/reports/instant`
- Update via `PUT /api/reports/instant/:id`
- Delete via `DELETE /api/reports/instant/:id`
- Execute via `POST /api/reports/instant/:id/execute`

### 3. Master Upload (`src/components/Reports/MasterUpload.tsx`)
**Status**: ⚠️ Still using localStorage

**What needs to change**:
- Remove `useLocalStorage` for uploads
- Load from `GET /api/uploads`
- Upload via `POST /api/uploads`
- Update via `PUT /api/uploads/:id`
- Delete via `DELETE /api/uploads/:id`

### 4. Access Control (`src/components/Admin/AccessControl.tsx`)
**Status**: ⚠️ Still using localStorage

**What needs to change**:
- Remove `useLocalStorage` for permissions
- Load from `GET /api/admin/access-control`
- Update via `PUT /api/admin/access-control`

### 5. Database Admin (`src/components/Admin/DatabaseAdmin.tsx`)
**Status**: ⚠️ Still using mock data

**What needs to change**:
- Load from `GET /api/admin/database-status`
- Load backups from `GET /api/admin/backups`
- Create backup via `POST /api/admin/backup`
- Cleanup via `POST /api/admin/cleanup-logs`

## Backend API Endpoints to Create

### Reports API (`server/routes/reports.js`)
```
GET /api/reports/auto-mail
POST /api/reports/auto-mail
PUT /api/reports/auto-mail/:id
DELETE /api/reports/auto-mail/:id
POST /api/reports/auto-mail/:id/run

GET /api/reports/instant
POST /api/reports/instant
PUT /api/reports/instant/:id
DELETE /api/reports/instant/:id
POST /api/reports/instant/:id/execute
```

### Uploads API (`server/routes/uploads.js`)
```
GET /api/uploads
POST /api/uploads
PUT /api/uploads/:id
DELETE /api/uploads/:id
```

### Access Control API (`server/routes/admin.js`)
```
GET /api/admin/access-control
PUT /api/admin/access-control
```

## Priority Order

1. **High Priority** - User Management (DONE ✅)
2. **High Priority** - Auto Mail Reports (TODO)
3. **High Priority** - Instant Reports (TODO)
4. **Medium Priority** - Master Upload (TODO)
5. **Medium Priority** - Access Control (TODO)
6. **Low Priority** - Database Admin (TODO)

## Pattern to Follow

Each component fix follows this pattern:

1. **Remove localStorage**
   ```typescript
   // Remove this line
   const [storedData, setStoredData] = useLocalStorage('key', []);
   ```

2. **Add loading state**
   ```typescript
   const [loading, setLoading] = useState(true);
   ```

3. **Load data on mount**
   ```typescript
   useEffect(() => {
     const loadData = async () => {
       setLoading(true);
       try {
         const response = await fetch(`${API_URL}/endpoint`, {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         if (response.ok) {
           const data = await response.json();
           setData(data.items);
         }
       } catch (error) {
         setError(error.message);
       } finally {
         setLoading(false);
       }
     };
     loadData();
   }, []);
   ```

4. **Make all CRUD operations async**
   ```typescript
   const handleCreate = async (formData) => {
     const response = await fetch(`${API_URL}/endpoint`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify(formData)
     });
     // Handle response and reload data
   };
   ```

Would you like me to fix the remaining components?
