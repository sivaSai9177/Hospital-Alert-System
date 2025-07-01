#!/usr/bin/env bun
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const presentationUsers = [
  {
    email: 'admin@demo.com',
    password: 'Admin123!',
    name: 'Sarah Thompson',
    role: 'admin'
  },
  {
    email: 'doctor@demo.com',
    password: 'Doctor123!',
    name: 'Dr. Michael Chen',
    role: 'doctor'
  },
  {
    email: 'nurse@demo.com',
    password: 'Nurse123!',
    name: 'Emily Rodriguez',
    role: 'nurse'
  },
  {
    email: 'operator@demo.com',
    password: 'Operator123!',
    name: 'James Wilson',
    role: 'operator'
  },
];

async function seedPresentationData() {
  console.log('🌱 Starting presentation data seeding...\n');

  try {
    // 1. Create a default hospital/organization
    console.log('Creating St. Mary\'s Medical Center...');
    const [hospital] = await db.execute(sql`
      INSERT INTO organizations (name, type)
      VALUES ('St. Mary''s Medical Center', 'hospital')
      ON CONFLICT (name) DO UPDATE SET type = 'hospital'
      RETURNING id, name
    `);
    
    const hospitalId = hospital.id;
    console.log(`✅ Hospital created: ${hospital.name}`);

    // 2. Create users
    console.log('\nCreating users...');
    for (const userData of presentationUsers) {
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user
        const [user] = await db.execute(sql`
          INSERT INTO users (email, name, password_hash, role, organization_id)
          VALUES (${userData.email}, ${userData.name}, ${hashedPassword}, ${userData.role}, ${hospitalId})
          ON CONFLICT (email) DO UPDATE SET
            name = ${userData.name},
            password_hash = ${hashedPassword},
            role = ${userData.role},
            organization_id = ${hospitalId}
          RETURNING id, email, name, role
        `);
        
        console.log(`✅ Created ${user.role}: ${user.name} - ${user.email}`);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error);
      }
    }

    // 3. Create realistic alerts
    console.log('\nCreating alerts...');
    const alerts = [
      // Critical alerts
      {
        room: 'ICU-202',
        type: 'emergency',
        urgency: 'critical',
        status: 'active',
        description: 'Code Blue - Cardiac arrest in progress',
        createdMinutesAgo: 2
      },
      {
        room: 'ER-15',
        type: 'emergency',
        urgency: 'critical',
        status: 'escalated',
        description: 'Trauma patient - immediate surgery required',
        createdMinutesAgo: 15
      },
      // High priority
      {
        room: '305',
        type: 'fall_risk',
        urgency: 'high',
        status: 'active',
        description: 'Fall detected - elderly patient, possible hip injury',
        createdMinutesAgo: 5
      },
      {
        room: 'ICU-104',
        type: 'vital_signs',
        urgency: 'high',
        status: 'active',
        description: 'Oxygen saturation dropping - 82% and falling',
        createdMinutesAgo: 8
      },
      {
        room: '412',
        type: 'medication',
        urgency: 'high',
        status: 'active',
        description: 'Insulin administration overdue - diabetic patient',
        createdMinutesAgo: 12
      },
      // Medium priority
      {
        room: '208',
        type: 'call_button',
        urgency: 'medium',
        status: 'acknowledged',
        description: 'Post-surgery patient requesting pain medication',
        createdMinutesAgo: 20
      },
      {
        room: '316',
        type: 'vital_signs',
        urgency: 'medium',
        status: 'active',
        description: 'Blood pressure elevated - 165/95',
        createdMinutesAgo: 25
      },
      // Low priority
      {
        room: '115',
        type: 'call_button',
        urgency: 'low',
        status: 'active',
        description: 'Patient requesting meal adjustment',
        createdMinutesAgo: 30
      },
    ];

    // Get nurse user for creating alerts
    const [nurseUser] = await db.execute(sql`
      SELECT id, name FROM users WHERE role = 'nurse' LIMIT 1
    `);

    for (const alert of alerts) {
      const createdAt = new Date(Date.now() - alert.createdMinutesAgo * 60000);
      
      await db.execute(sql`
        INSERT INTO alerts (
          room_number, 
          alert_type, 
          urgency_level, 
          status, 
          description,
          hospital_id,
          created_by,
          created_by_name,
          created_at,
          current_escalation_tier,
          next_escalation_at
        ) VALUES (
          ${alert.room},
          ${alert.type},
          ${alert.urgency},
          ${alert.status},
          ${alert.description},
          ${hospitalId},
          ${nurseUser.id},
          ${nurseUser.name},
          ${createdAt},
          ${alert.status === 'escalated' ? 2 : 1},
          ${alert.status === 'active' ? new Date(Date.now() + 300000) : null}
        )
      `);
    }
    console.log(`✅ Created ${alerts.length} realistic alerts`);

    // 4. Create patients
    console.log('\nCreating patients...');
    const patients = [
      { name: 'Margaret Sullivan', room: 'ICU-202', age: 79, condition: 'Cardiac arrest' },
      { name: 'James Mitchell', room: 'ER-15', age: 42, condition: 'Multiple trauma' },
      { name: 'Eleanor Patterson', room: '305', age: 86, condition: 'Hip fracture' },
      { name: 'Carlos Rivera', room: 'ICU-104', age: 64, condition: 'COPD exacerbation' },
      { name: 'David Thompson', room: '412', age: 69, condition: 'Type 2 diabetes' },
      { name: 'Susan Chen', room: '208', age: 54, condition: 'Post-op recovery' },
      { name: 'Robert Williams', room: '316', age: 72, condition: 'Hypertension' },
      { name: 'Baby Johnson', room: 'NICU-08', age: 0, condition: 'Premature birth' },
    ];

    for (const patient of patients) {
      const dob = faker.date.birthdate({ min: patient.age, max: patient.age, mode: 'age' });
      const mrn = `MRN-2024-${faker.number.int({ min: 1000, max: 9999 })}`;
      
      await db.execute(sql`
        INSERT INTO patients (
          name,
          room_number,
          date_of_birth,
          medical_record_number,
          hospital_id,
          status,
          admission_date
        ) VALUES (
          ${patient.name},
          ${patient.room},
          ${dob},
          ${mrn},
          ${hospitalId},
          'admitted',
          ${faker.date.recent({ days: 7 })}
        )
        ON CONFLICT (medical_record_number) DO NOTHING
      `);
    }
    console.log(`✅ Created ${patients.length} patients`);

    // 5. Create notifications
    console.log('\nCreating notifications...');
    const users = await db.execute(sql`SELECT id, role FROM users WHERE organization_id = ${hospitalId}`);
    
    const notifications = [
      {
        title: '🚨 Critical Alert - ICU-202',
        message: 'Code Blue in progress - immediate response required',
        type: 'alert',
        forRoles: ['doctor', 'nurse']
      },
      {
        title: 'New Patient Assignment',
        message: 'You\'ve been assigned to Eleanor Patterson in Room 305',
        type: 'alert',
        forRoles: ['nurse']
      },
      {
        title: 'Shift Change Reminder',
        message: 'Night shift handover in 30 minutes',
        type: 'shift',
        forRoles: ['nurse', 'doctor']
      },
      {
        title: 'Weekly Performance Report',
        message: 'Your response time: 2.3 min (↓15% improvement)',
        type: 'system',
        forRoles: ['all']
      },
    ];

    for (const notif of notifications) {
      for (const user of users.rows) {
        if (notif.forRoles.includes('all') || notif.forRoles.includes(user.role)) {
          await db.execute(sql`
            INSERT INTO notifications (
              user_id,
              title,
              message,
              type,
              is_read,
              created_at
            ) VALUES (
              ${user.id},
              ${notif.title},
              ${notif.message},
              ${notif.type},
              false,
              ${faker.date.recent({ days: 1 })}
            )
          `);
        }
      }
    }
    console.log('✅ Created notifications for all users');

    console.log('\n🎉 Presentation data seeding completed!\n');
    console.log('Test Credentials:');
    console.log('================');
    presentationUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedPresentationData();