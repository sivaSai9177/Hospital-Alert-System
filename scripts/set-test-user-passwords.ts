#!/usr/bin/env bun
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

const testUsers = [
  { email: 'operator@test.com', password: 'Operator123!' },
  { email: 'doctor@test.com', password: 'Doctor123!' },
  { email: 'admin@test.com', password: 'Admin123!' },
  { email: 'nurse@test.com', password: 'Nurse123!' },
  { email: 'manager@test.com', password: 'Manager123!' },
  { email: 'headdoctor@test.com', password: 'Headdoctor123!' },
  { email: 'headnurse@test.com', password: 'Headnurse123!' },
  { email: 'regularuser@test.com', password: 'User123!' }
];

async function setPasswords() {
  console.log('🔐 Setting passwords for test users...\n');

  // First check what auth tables exist
  const authTables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('password', 'account', 'auth_password', 'auth_account', 'betterauth_password')
    ORDER BY table_name;
  `);
  
  console.log('Found auth tables:', authTables.rows.map(r => r.table_name));

  // Check if account table exists (Better Auth v1 uses 'account' table)
  const accountTableExists = authTables.rows.some(r => r.table_name === 'account');
  
  if (accountTableExists) {
    console.log('\n✅ Using Better Auth account table\n');
    
    // Import bcrypt for password hashing
    const bcrypt = (await import('bcryptjs')).default;
    
    for (const testUser of testUsers) {
      try {
        // Check if user exists
        const userResult = await db.execute(sql`
          SELECT id FROM "user" WHERE email = ${testUser.email};
        `);
        
        if (userResult.rows.length === 0) {
          console.log(`❌ User not found: ${testUser.email}`);
          continue;
        }
        
        const userId = userResult.rows[0].id;
        
        // Check if account already exists
        const accountResult = await db.execute(sql`
          SELECT id FROM account WHERE "user_id" = ${userId} AND "provider_id" = 'email';
        `);
        
        if (accountResult.rows.length > 0) {
          console.log(`✅ Account already exists for: ${testUser.email}`);
          continue;
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        // Create account entry
        await db.execute(sql`
          INSERT INTO account (
            id,
            "account_id",
            "user_id",
            "provider_id",
            password,
            "created_at",
            "updated_at"
          ) VALUES (
            gen_random_uuid(),
            ${testUser.email},
            ${userId},
            'email',
            ${hashedPassword},
            NOW(),
            NOW()
          );
        `);
        
        console.log(`✅ Set password for: ${testUser.email}`);
      } catch (error) {
        console.error(`❌ Error setting password for ${testUser.email}:`, error);
      }
    }
  } else {
    console.log('\n❌ No Better Auth account table found');
    console.log('Available tables:', authTables.rows.map(r => r.table_name).join(', '));
  }

  console.log('\n✅ Password setup complete!');
}

setPasswords()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });