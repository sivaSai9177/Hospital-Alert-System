import { db } from '@/src/db';
import { alerts, healthcareUsers, hospitals } from '@/src/db/healthcare-schema';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Seed script to create escalated alerts for presentation purposes
 * 
 * Usage:
 * npm run ts-node scripts/seed-escalation-queue.ts
 * 
 * Or with Docker PostgreSQL:
 * docker exec -it <container_name> psql -U postgres -d <database_name>
 * Then run the SQL directly
 */

async function seedEscalationQueue() {
  console.log('🚀 Starting escalation queue seeding...');

  try {
    // First, get a hospital to use for the alerts
    const [hospital] = await db.select().from(hospitals).limit(1);
    
    if (!hospital) {
      console.error('❌ No hospital found. Please create a hospital first.');
      return;
    }

    console.log(`✅ Using hospital: ${hospital.name} (${hospital.id})`);

    // Get healthcare users to use as creators
    const healthcareUsersList = await db
      .select({
        user: users,
        healthcareUser: healthcareUsers,
      })
      .from(healthcareUsers)
      .innerJoin(users, eq(users.id, healthcareUsers.userId))
      .where(eq(healthcareUsers.hospitalId, hospital.id))
      .limit(5);

    if (healthcareUsersList.length === 0) {
      console.error('❌ No healthcare users found for this hospital.');
      return;
    }

    console.log(`✅ Found ${healthcareUsersList.length} healthcare users`);

    // Define escalated alerts to create
    const escalatedAlerts = [
      {
        roomNumber: '412',
        alertType: 'cardiac_arrest' as const,
        urgencyLevel: 5,
        description: 'Patient experiencing severe chest pain, vitals unstable',
        status: 'active' as const,
        currentEscalationTier: 3,
        escalationLevel: 3,
        targetDepartment: 'cardiology',
        minutesAgo: 15,
      },
      {
        roomNumber: '308',
        alertType: 'code_blue' as const,
        urgencyLevel: 5,
        description: 'Respiratory failure, immediate intervention required',
        status: 'active' as const,
        currentEscalationTier: 3,
        escalationLevel: 3,
        targetDepartment: 'icu',
        minutesAgo: 12,
      },
      {
        roomNumber: '205',
        alertType: 'medical_emergency' as const,
        urgencyLevel: 4,
        description: 'Severe allergic reaction, anaphylaxis suspected',
        status: 'active' as const,
        currentEscalationTier: 2,
        escalationLevel: 2,
        targetDepartment: 'emergency',
        minutesAgo: 8,
      },
      {
        roomNumber: '523',
        alertType: 'security' as const,
        urgencyLevel: 4,
        description: 'Aggressive patient, staff safety concern',
        status: 'active' as const,
        currentEscalationTier: 2,
        escalationLevel: 2,
        targetDepartment: 'emergency_response',
        minutesAgo: 10,
      },
      {
        roomNumber: '101',
        alertType: 'fire' as const,
        urgencyLevel: 5,
        description: 'Smoke detected in storage area, evacuation protocol initiated',
        status: 'active' as const,
        currentEscalationTier: 4,
        escalationLevel: 4,
        targetDepartment: 'facilities',
        minutesAgo: 5,
      },
      {
        roomNumber: '317',
        alertType: 'medical_emergency' as const,
        urgencyLevel: 3,
        description: 'Post-operative complications, bleeding observed',
        status: 'active' as const,
        currentEscalationTier: 2,
        escalationLevel: 2,
        targetDepartment: 'surgery',
        minutesAgo: 20,
      },
    ];

    console.log(`\n📝 Creating ${escalatedAlerts.length} escalated alerts...`);

    for (let i = 0; i < escalatedAlerts.length; i++) {
      const alertData = escalatedAlerts[i];
      const creator = healthcareUsersList[i % healthcareUsersList.length];
      
      const createdAt = new Date(Date.now() - alertData.minutesAgo * 60 * 1000);
      
      const [newAlert] = await db.insert(alerts).values({
        hospitalId: hospital.id,
        roomNumber: alertData.roomNumber,
        alertType: alertData.alertType,
        urgencyLevel: alertData.urgencyLevel,
        description: alertData.description,
        status: alertData.status,
        currentEscalationTier: alertData.currentEscalationTier,
        escalationLevel: alertData.escalationLevel,
        targetDepartment: alertData.targetDepartment as any,
        createdBy: creator.user.id,
        createdAt,
      }).returning();

      console.log(`✅ Created alert: Room ${newAlert.roomNumber} - ${newAlert.alertType} (Tier ${newAlert.currentEscalationTier})`);
    }

    console.log('\n🎉 Escalation queue seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Hospital: ${hospital.name}`);
    console.log(`   - Alerts created: ${escalatedAlerts.length}`);
    console.log(`   - Tier 2 alerts: ${escalatedAlerts.filter(a => a.currentEscalationTier === 2).length}`);
    console.log(`   - Tier 3 alerts: ${escalatedAlerts.filter(a => a.currentEscalationTier === 3).length}`);
    console.log(`   - Tier 4+ alerts: ${escalatedAlerts.filter(a => a.currentEscalationTier >= 4).length}`);

  } catch (error) {
    console.error('❌ Error seeding escalation queue:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the seed function
seedEscalationQueue();

/**
 * Alternative: Direct SQL for PostgreSQL Docker
 * 
 * If you prefer to use direct SQL with Docker, you can run:
 * 
 * docker exec -it your-postgres-container psql -U postgres -d your-database-name
 * 
 * Then paste this SQL:
 * 
 * -- Get the first hospital ID
 * WITH hospital_data AS (
 *   SELECT id FROM hospitals LIMIT 1
 * ),
 * user_data AS (
 *   SELECT u.id, ROW_NUMBER() OVER (ORDER BY u.id) as rn
 *   FROM users u
 *   INNER JOIN healthcare_users hu ON u.id = hu.user_id
 *   WHERE hu.hospital_id = (SELECT id FROM hospital_data)
 *   LIMIT 5
 * )
 * -- Insert escalated alerts
 * INSERT INTO alerts (
 *   id, hospital_id, room_number, alert_type, urgency_level,
 *   description, status, current_escalation_tier, escalation_level,
 *   target_department, created_by, created_at, updated_at
 * )
 * VALUES
 * (
 *   gen_random_uuid(),
 *   (SELECT id FROM hospital_data),
 *   '412',
 *   'cardiac_arrest',
 *   5,
 *   'Patient experiencing severe chest pain, vitals unstable',
 *   'active',
 *   3,
 *   3,
 *   'cardiology',
 *   (SELECT id FROM user_data WHERE rn = 1),
 *   NOW() - INTERVAL '15 minutes',
 *   NOW() - INTERVAL '15 minutes'
 * ),
 * (
 *   gen_random_uuid(),
 *   (SELECT id FROM hospital_data),
 *   '308',
 *   'code_blue',
 *   5,
 *   'Respiratory failure, immediate intervention required',
 *   'active',
 *   3,
 *   3,
 *   'icu',
 *   (SELECT id FROM user_data WHERE rn = 2),
 *   NOW() - INTERVAL '12 minutes',
 *   NOW() - INTERVAL '12 minutes'
 * ),
 * (
 *   gen_random_uuid(),
 *   (SELECT id FROM hospital_data),
 *   '205',
 *   'medical_emergency',
 *   4,
 *   'Severe allergic reaction, anaphylaxis suspected',
 *   'active',
 *   2,
 *   2,
 *   'emergency',
 *   (SELECT id FROM user_data WHERE rn = 3),
 *   NOW() - INTERVAL '8 minutes',
 *   NOW() - INTERVAL '8 minutes'
 * ),
 * (
 *   gen_random_uuid(),
 *   (SELECT id FROM hospital_data),
 *   '523',
 *   'security',
 *   4,
 *   'Aggressive patient, staff safety concern',
 *   'active',
 *   2,
 *   2,
 *   'emergency_response',
 *   (SELECT id FROM user_data WHERE rn = 4),
 *   NOW() - INTERVAL '10 minutes',
 *   NOW() - INTERVAL '10 minutes'
 * ),
 * (
 *   gen_random_uuid(),
 *   (SELECT id FROM hospital_data),
 *   '101',
 *   'fire',
 *   5,
 *   'Smoke detected in storage area, evacuation protocol initiated',
 *   'active',
 *   4,
 *   4,
 *   'facilities',
 *   (SELECT id FROM user_data WHERE rn = 5),
 *   NOW() - INTERVAL '5 minutes',
 *   NOW() - INTERVAL '5 minutes'
 * ),
 * (
 *   gen_random_uuid(),
 *   (SELECT id FROM hospital_data),
 *   '317',
 *   'medical_emergency',
 *   3,
 *   'Post-operative complications, bleeding observed',
 *   'active',
 *   2,
 *   2,
 *   'surgery',
 *   (SELECT id FROM user_data WHERE rn = 1),
 *   NOW() - INTERVAL '20 minutes',
 *   NOW() - INTERVAL '20 minutes'
 * );
 */