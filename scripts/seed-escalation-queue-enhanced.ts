import { db } from '@/src/db';
import { alerts, healthcareUsers, hospitals } from '@/src/db/healthcare-schema';
import { users } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Enhanced seed script to create escalated alerts for ALL hospitals
 * Creates diverse, realistic data for presentation purposes
 * 
 * Usage:
 * npm run healthcare:seed-escalation-enhanced
 */

// Alert templates with variety
const alertTemplates = [
  // Tier 2 alerts (40%)
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 3,
    description: 'Patient complaining of severe abdominal pain, needs immediate assessment',
    currentEscalationTier: 2,
    escalationLevel: 2,
    targetDepartment: 'emergency',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 3,
    description: 'Patient with fall risk attempting to ambulate without assistance',
    currentEscalationTier: 2,
    escalationLevel: 2,
    targetDepartment: 'general_medicine',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 4,
    description: 'Post-operative bleeding observed, surgical team notified',
    currentEscalationTier: 2,
    escalationLevel: 2,
    targetDepartment: 'surgery',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 3,
    description: 'Critical equipment failure - ventilator malfunction in ICU',
    currentEscalationTier: 2,
    escalationLevel: 2,
    targetDepartment: 'general_medicine',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 3,
    description: 'Diabetic patient with dangerously low blood sugar, not responding to treatment',
    currentEscalationTier: 2,
    escalationLevel: 2,
    targetDepartment: 'general_medicine',
  },
  {
    alertType: 'security' as const,
    urgencyLevel: 3,
    description: 'Agitated visitor refusing to follow visitation policies',
    currentEscalationTier: 2,
    escalationLevel: 2,
    targetDepartment: 'emergency_response',
  },
  
  // Tier 3 alerts (35%)
  {
    alertType: 'cardiac_arrest' as const,
    urgencyLevel: 5,
    description: 'Patient experiencing chest pain with abnormal EKG readings',
    currentEscalationTier: 3,
    escalationLevel: 3,
    targetDepartment: 'cardiology',
  },
  {
    alertType: 'code_blue' as const,
    urgencyLevel: 5,
    description: 'Respiratory distress, O2 saturation dropping rapidly',
    currentEscalationTier: 3,
    escalationLevel: 3,
    targetDepartment: 'icu',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 4,
    description: 'Severe allergic reaction, anaphylaxis protocol initiated',
    currentEscalationTier: 3,
    escalationLevel: 3,
    targetDepartment: 'emergency',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 5,
    description: 'Stroke symptoms detected, rapid response team activated',
    currentEscalationTier: 3,
    escalationLevel: 3,
    targetDepartment: 'neurology',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 4,
    description: 'Pediatric patient with seizure activity, not responding to medication',
    currentEscalationTier: 3,
    escalationLevel: 3,
    targetDepartment: 'pediatrics',
  },
  
  // Tier 4+ alerts (25%)
  {
    alertType: 'fire' as const,
    urgencyLevel: 5,
    description: 'Smoke detected in east wing, evacuation protocol initiated',
    currentEscalationTier: 4,
    escalationLevel: 4,
    targetDepartment: 'facilities',
  },
  {
    alertType: 'code_blue' as const,
    urgencyLevel: 5,
    description: 'Cardiac arrest in progress, CPR initiated',
    currentEscalationTier: 4,
    escalationLevel: 4,
    targetDepartment: 'emergency',
  },
  {
    alertType: 'security' as const,
    urgencyLevel: 5,
    description: 'Active threat in building, lockdown initiated',
    currentEscalationTier: 4,
    escalationLevel: 4,
    targetDepartment: 'emergency_response',
  },
  {
    alertType: 'medical_emergency' as const,
    urgencyLevel: 5,
    description: 'Multiple trauma patients incoming from accident, all teams on standby',
    currentEscalationTier: 4,
    escalationLevel: 4,
    targetDepartment: 'emergency',
  },
];

// Room number patterns for different hospital areas
const roomPatterns = [
  { prefix: '1', range: [1, 30] },    // Floor 1
  { prefix: '2', range: [1, 30] },    // Floor 2
  { prefix: '3', range: [1, 30] },    // Floor 3
  { prefix: '4', range: [1, 30] },    // Floor 4
  { prefix: 'ER', range: [1, 20] },   // Emergency
  { prefix: 'ICU', range: [1, 15] },  // ICU
  { prefix: 'OR', range: [1, 10] },   // Operating Room
];

function generateRoomNumber(): string {
  const pattern = roomPatterns[Math.floor(Math.random() * roomPatterns.length)];
  const roomNum = Math.floor(Math.random() * (pattern.range[1] - pattern.range[0] + 1)) + pattern.range[0];
  return `${pattern.prefix}${roomNum.toString().padStart(2, '0')}`;
}

function generateTimeAgo(): number {
  // Generate random time between 5 and 60 minutes ago
  return Math.floor(Math.random() * 55) + 5;
}

async function seedEscalationQueueEnhanced() {
  console.log('🚀 Starting enhanced escalation queue seeding...');
  console.log('📊 This will create escalated alerts for ALL hospitals\n');

  try {
    // Get all hospitals
    const allHospitals = await db.select().from(hospitals);
    
    if (allHospitals.length === 0) {
      console.error('❌ No hospitals found. Please create hospitals first.');
      return;
    }

    console.log(`✅ Found ${allHospitals.length} hospitals to seed\n`);

    let totalAlertsCreated = 0;
    const alertsPerHospital = 15; // Create 15 alerts per hospital

    // Process each hospital
    for (const hospital of allHospitals) {
      console.log(`\n🏥 Processing hospital: ${hospital.name} (${hospital.id})`);

      // Get healthcare users for this hospital
      const healthcareUsersList = await db
        .select({
          user: users,
          healthcareUser: healthcareUsers,
        })
        .from(healthcareUsers)
        .innerJoin(users, eq(users.id, healthcareUsers.userId))
        .where(eq(healthcareUsers.hospitalId, hospital.id))
        .limit(10);

      if (healthcareUsersList.length === 0) {
        console.warn(`⚠️  No healthcare users found for ${hospital.name}, skipping...`);
        continue;
      }

      console.log(`   Found ${healthcareUsersList.length} healthcare users`);

      // Create alerts for this hospital
      const hospitalAlerts = [];
      const usedRooms = new Set<string>();

      for (let i = 0; i < alertsPerHospital; i++) {
        // Select a random template
        const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
        
        // Generate unique room number
        let roomNumber: string;
        do {
          roomNumber = generateRoomNumber();
        } while (usedRooms.has(roomNumber));
        usedRooms.add(roomNumber);

        // Select random creator
        const creator = healthcareUsersList[Math.floor(Math.random() * healthcareUsersList.length)];
        
        // Generate time
        const minutesAgo = generateTimeAgo();
        const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);

        const alert = {
          id: randomUUID(),
          hospitalId: hospital.id,
          roomNumber,
          alertType: template.alertType,
          urgencyLevel: template.urgencyLevel,
          description: template.description,
          status: 'active' as const,
          currentEscalationTier: template.currentEscalationTier,
          escalationLevel: template.escalationLevel,
          targetDepartment: template.targetDepartment,
          createdBy: creator.user.id,
          createdAt,
          updatedAt: createdAt,
        };

        hospitalAlerts.push(alert);
      }

      // Bulk insert alerts for this hospital
      if (hospitalAlerts.length > 0) {
        await db.insert(alerts).values(hospitalAlerts);
        totalAlertsCreated += hospitalAlerts.length;

        // Show distribution for this hospital
        const tier2Count = hospitalAlerts.filter(a => a.currentEscalationTier === 2).length;
        const tier3Count = hospitalAlerts.filter(a => a.currentEscalationTier === 3).length;
        const tier4Count = hospitalAlerts.filter(a => a.currentEscalationTier >= 4).length;

        console.log(`   ✅ Created ${hospitalAlerts.length} alerts:`);
        console.log(`      - Tier 2: ${tier2Count} alerts`);
        console.log(`      - Tier 3: ${tier3Count} alerts`);
        console.log(`      - Tier 4+: ${tier4Count} alerts`);
      }
    }

    console.log('\n🎉 Enhanced escalation queue seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Hospitals seeded: ${allHospitals.length}`);
    console.log(`   - Total alerts created: ${totalAlertsCreated}`);
    console.log(`   - Average per hospital: ${Math.floor(totalAlertsCreated / allHospitals.length)}`);
    
    console.log('\n💡 Tips:');
    console.log('   - Navigate to the Escalation Queue screen to see the alerts');
    console.log('   - Use urgency filters to view different priority levels');
    console.log('   - Alerts are sorted by tier and urgency within each tier');

  } catch (error) {
    console.error('❌ Error seeding enhanced escalation queue:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedEscalationQueueEnhanced();