# Fix Lab Order Source - MongoDB Commands

The existing lab order for "samuael james" was created before our source fix was implemented, so it still shows "Doctor Ordered". Here are the commands to fix it:

## Option 1: MongoDB Shell Commands

Open MongoDB shell and run these commands:

```bash
# Connect to MongoDB
mongosh clinic-cms

# Find the lab order for samuael james
db.laborders.findOne({
  $or: [
    { testName: /blood/i },
    { testName: /group/i },
    { testName: /samuael/i },
    { testName: /james/i }
  ]
})

# Update the source to 'reception' (replace OBJECT_ID with actual _id)
db.laborders.updateOne(
  { _id: ObjectId("REPLACE_WITH_ACTUAL_ID") },
  { $set: { source: "reception" } }
)

# Verify the update
db.laborders.findOne({ source: "reception" })
```

## Option 2: Update All Lab Orders

If you want to update all existing lab orders to have source = 'reception':

```javascript
// Update all lab orders that don't have source = 'reception'
db.laborders.updateMany(
  { source: { $ne: "reception" } },
  { $set: { source: "reception" } }
)

// Check how many were updated
db.laborders.countDocuments({ source: "reception" })
```

## Option 3: Through the Application

1. Go to the lab dashboard
2. Click on the "Collect" button for the samuael james test
3. Complete the test or update it
4. The source should now show correctly

## What This Will Fix

- The lab dashboard will show "Reception Service" instead of "Doctor Ordered"
- All future service requests from reception will automatically have the correct source
- The existing test will be updated to show the proper source

## After Running the Commands

1. Refresh the lab dashboard in your browser
2. The source should now show "Reception Service" instead of "Doctor Ordered"
3. All new service requests from reception will automatically have the correct source
