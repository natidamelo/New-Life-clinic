/**
 * Idempotent clinicId stamping across collections (native driver, no Mongoose hooks).
 *
 * PRIMARY_CLINIC_ID (default "default") — value written for missing/null/empty clinicId.
 * NORMALIZE_DEFAULT_CLINIC_ID=true — also rewrite clinicId "default" → PRIMARY when PRIMARY !== "default"
 *   (one-time alignment after backfills that used "default" while users use e.g. clinicnew).
 */

function primaryClinicId() {
  const p = (process.env.PRIMARY_CLINIC_ID || 'default').trim();
  return p || 'default';
}

async function backfillMissingClinicIds() {
  if (process.env.SKIP_CLINIC_ID_BACKFILL === 'true') {
    console.log('⏭️  SKIP_CLINIC_ID_BACKFILL=true — skipping clinicId backfill');
    return;
  }

  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) return;

  const primary = primaryClinicId();
  console.log(`📌 PRIMARY_CLINIC_ID for backfill: "${primary}"`);

  const missingFilter = {
    $or: [
      { clinicId: { $exists: false } },
      { clinicId: null },
      { clinicId: '' },
    ],
  };

  const SKIP = new Set(
    (process.env.CLINIC_ID_BACKFILL_SKIP_COLLECTIONS || 'clinics')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  const db = mongoose.connection.db;
  const listed = await db.listCollections().toArray();
  const allNames = listed.map((c) => c.name).filter(Boolean);

  let modified = 0;
  let normalized = 0;

  for (const name of allNames) {
    const lower = name.toLowerCase();
    if (lower.startsWith('system.')) continue;
    if (SKIP.has(lower)) continue;

    const coll = db.collection(name);
    try {
      const r = await coll.updateMany(missingFilter, { $set: { clinicId: primary } });
      if (r.modifiedCount > 0) {
        console.log(
          `✅ clinicId backfill: stamped ${r.modifiedCount} document(s) in "${name}" → "${primary}"`
        );
        modified += r.modifiedCount;
      }

      if (
        process.env.NORMALIZE_DEFAULT_CLINIC_ID === 'true' &&
        primary !== 'default'
      ) {
        const n = await coll.updateMany(
          { clinicId: 'default' },
          { $set: { clinicId: primary } }
        );
        if (n.modifiedCount > 0) {
          console.log(
            `✅ clinicId normalize: ${n.modifiedCount} document(s) default → "${primary}" in "${name}"`
          );
          normalized += n.modifiedCount;
        }
      }
    } catch (err) {
      console.warn(`⚠️  clinicId backfill skipped for "${name}": ${err.message}`);
    }
  }

  if (modified === 0 && normalized === 0) {
    console.log(
      '✅ clinicId backfill: nothing to update (or collections empty / already aligned)'
    );
  } else {
    console.log(
      `✅ clinicId backfill done: ${modified} stamped, ${normalized} normalized (default→primary)`
    );
  }
}

module.exports = { backfillMissingClinicIds };
