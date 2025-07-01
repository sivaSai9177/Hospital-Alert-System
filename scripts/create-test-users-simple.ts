#!/usr/bin/env bun
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const testUsers = [
  {
    email: 'operator@test.com',
    password: 'Operator123!',
    name: 'Test Operator',
    role: 'operator'
  },
  {
    email: 'doctor@test.com',
    password: 'Doctor123!',
    name: 'Test Doctor',
    role: 'doctor'
  },
  {
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Test Admin',
    role: 'admin'
  },
  {
    email: 'nurse@test.com',
    password: 'Nurse123!',
    name: 'Test Nurse',
    role: 'nurse'
  },
  {
    email: 'manager@test.com',
    password: 'Manager123!',
    name: 'Test Manager',
    role: 'manager'
  },
  {
    email: 'headdoctor@test.com',
    password: 'Headdoctor123!',
    name: 'Head Doctor',
    role: 'head_doctor'
  },
  {
    email: 'headnurse@test.com',
    password: 'Headnurse123!',
    name: 'Head Nurse',
    role: 'head_nurse'
  },
  {
    email: 'regularuser@test.com',
    password: 'User123!',
    name: 'Regular User',
    role: 'user'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users...\n');

  // Get organization and hospital
  const orgResult = await db.execute(sql`SELECT id, name FROM organization LIMIT 1;`);
  const org = orgResult.rows[0];
  
  if (!org) {
    console.error('❌ No organization found. Please run seed script first.');
    return;
  }

  const hospitalResult = await db.execute(sql`
    SELECT id, name FROM hospitals 
    WHERE "organization_id" = ${org.id} 
    LIMIT 1;
  `);
  const hospital = hospitalResult.rows[0];

  if (!hospital) {
    console.error('❌ No hospital found for organization. Please run seed script first.');
    return;
  }

  console.log(`📍 Using Organization: ${org.name} (${org.id})`);
  console.log(`🏥 Using Hospital: ${hospital.name} (${hospital.id})\n`);

  for (const testUser of testUsers) {
    try {
      // Check if user exists
      const existingResult = await db.execute(sql`
        SELECT id, email FROM "user" WHERE email = ${testUser.email};
      `);
      
      if (existingResult.rows.length > 0) {
        console.log(`✅ User already exists: ${testUser.email}`);
        
        // Update the existing user with correct role and settings
        const userId = existingResult.rows[0].id;
        const needsHospital = ['operator', 'nurse', 'doctor', 'head_doctor', 'head_nurse'].includes(testUser.role);
        
        await db.execute(sql`
          UPDATE "user" 
          SET 
            role = ${testUser.role},
            "organization_id" = ${org.id},
            "default_hospital_id" = ${needsHospital ? hospital.id : null},
            "email_verified" = true,
            "needs_profile_completion" = false
          WHERE id = ${userId};
        `);
        
        console.log(`   Updated role to: ${testUser.role}`);
        continue;
      }

      // Hash password using bcrypt (matching Better Auth's method)
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      
      // Generate a unique user ID
      const userId = crypto.randomUUID();
      const needsHospital = ['operator', 'nurse', 'doctor', 'head_doctor', 'head_nurse'].includes(testUser.role);
      
      // Create user directly in database
      await db.execute(sql`
        INSERT INTO "user" (
          id,
          email,
          name,
          role,
          "email_verified",
          "created_at",
          "updated_at",
          "organization_id",
          "default_hospital_id",
          "needs_profile_completion"
        ) VALUES (
          ${userId},
          ${testUser.email},
          ${testUser.name},
          ${testUser.role},
          true,
          NOW(),
          NOW(),
          ${org.id},
          ${needsHospital ? hospital.id : null},
          false
        );
      `);
      
      // Create password entry for Better Auth
      await db.execute(sql`
        INSERT INTO "password" (
          "userId",
          "hash"
        ) VALUES (
          ${userId},
          ${hashedPassword}
        );
      `);

      // Create healthcare user entry if needed
      if (needsHospital) {
        await db.execute(sql`
          INSERT INTO healthcare_users (
            "user_id", 
            "hospital_id", 
            department, 
            "is_on_duty"
          ) VALUES (
            ${userId},
            ${hospital.id},
            ${testUser.role === 'operator' ? 'general' : 
              testUser.role.includes('doctor') ? 'general' : 'general'},
            false
          ) ON CONFLICT ("user_id") DO NOTHING;
        `);
      }

      console.log(`✅ Created user: ${testUser.email} (${testUser.role})`);
    } catch (error) {
      console.error(`❌ Error creating ${testUser.email}:`, error);
    }
  }

  console.log('\n✅ Test user creation complete!');
  console.log('\n📋 Test Credentials:');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│ Operator: operator@test.com             │');
  console.log('│ Doctor:   doctor@test.com               │');
  console.log('│ Admin:    admin@test.com                │');
  console.log('│ Password: [Role]123! (e.g. Doctor123!)  │');
  console.log('└─────────────────────────────────────────┘');
}

createTestUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });