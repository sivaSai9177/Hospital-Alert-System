#!/usr/bin/env bun
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { auth } from '../lib/auth/server';

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
    SELECT id, name FROM hospital 
    WHERE "organizationId" = ${org.id} 
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
        continue;
      }

      // Create user with better-auth
      const signupResult = await auth.api.signUpEmail({
        body: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        }
      });

      if (signupResult.ok) {
        const userId = signupResult.data.user.id;
        
        // Update user with role and organization/hospital
        const needsHospital = ['operator', 'nurse', 'doctor', 'head_doctor', 'head_nurse'].includes(testUser.role);
        
        await db.execute(sql`
          UPDATE "user" 
          SET 
            role = ${testUser.role},
            "organizationId" = ${org.id},
            "defaultHospitalId" = ${needsHospital ? hospital.id : null},
            "emailVerified" = true,
            "needsProfileCompletion" = false
          WHERE id = ${userId};
        `);

        // Create healthcare user entry if needed
        if (needsHospital) {
          await db.execute(sql`
            INSERT INTO healthcare_user (
              id, 
              "userId", 
              "hospitalId", 
              department, 
              status, 
              "isOnDuty"
            ) VALUES (
              gen_random_uuid(),
              ${userId},
              ${hospital.id},
              ${testUser.role === 'operator' ? 'Operations' : 
                testUser.role.includes('doctor') ? 'Medical' : 'Nursing'},
              'active',
              false
            ) ON CONFLICT ("userId") DO NOTHING;
          `);
        }

        console.log(`✅ Created user: ${testUser.email} (${testUser.role})`);
      } else {
        console.error(`❌ Failed to create ${testUser.email}:`, signupResult.error);
      }
    } catch (error) {
      console.error(`❌ Error creating ${testUser.email}:`, error);
    }
  }

  console.log('\n✅ Test user creation complete!');
  console.log('\n📋 Test Credentials:');
  console.log('┌─────────────────────────────────────────┐');
  testUsers.slice(0, 3).forEach(user => {
    console.log(`│ ${user.role.padEnd(8)}: ${user.email.padEnd(20)} │`);
  });
  console.log(`│ Password: [Role]123! (e.g. Doctor123!)  │`);
  console.log('└─────────────────────────────────────────┘');
}

createTestUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });