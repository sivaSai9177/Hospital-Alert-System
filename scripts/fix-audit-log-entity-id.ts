import { db } from '@/src/db';
import { sql } from 'drizzle-orm';

async function fixAuditLogEntityId() {
  console.log('🔧 Fixing healthcare_audit_logs entity_id column type...');
  
  try {
    // Alter the column type from UUID to TEXT
    await db.execute(sql`
      ALTER TABLE healthcare_audit_logs 
      ALTER COLUMN entity_id TYPE TEXT
    `);
    
    console.log('✅ Column type updated successfully');
    
    // Add a comment to explain the change
    await db.execute(sql`
      COMMENT ON COLUMN healthcare_audit_logs.entity_id IS 
      'Entity ID can be either a user ID (text) or other entity UUID, stored as text'
    `);
    
    console.log('✅ Column comment added');
    console.log('✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
fixAuditLogEntityId();