import { db } from '@/src/db';
import { alerts, hospitals } from '@/src/db/healthcare-schema';
import { eq, and, gt } from 'drizzle-orm';

async function testEscalationAPI() {
  console.log('🔍 Testing escalation API query...\n');
  
  const hospitalId = '4d1fe940-f7c1-43ad-84b8-5e8adae1db7a'; // Central Medical Center
  
  try {
    // First, verify the hospital exists
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, hospitalId));
      
    if (!hospital) {
      console.error('❌ Hospital not found:', hospitalId);
      return;
    }
    
    console.log('✅ Hospital found:', hospital.name);
    
    // Query for escalated alerts (exactly how the API does it)
    const escalatedAlerts = await db
      .select({
        id: alerts.id,
        roomNumber: alerts.roomNumber,
        alertType: alerts.alertType,
        urgencyLevel: alerts.urgencyLevel,
        description: alerts.description,
        createdBy: alerts.createdBy,
        createdAt: alerts.createdAt,
        status: alerts.status,
        targetDepartment: alerts.targetDepartment,
        acknowledgedBy: alerts.acknowledgedBy,
        acknowledgedAt: alerts.acknowledgedAt,
        escalationLevel: alerts.escalationLevel,
        currentEscalationTier: alerts.currentEscalationTier,
        nextEscalationAt: alerts.nextEscalationAt,
        resolvedAt: alerts.resolvedAt,
        hospitalId: alerts.hospitalId,
        patientId: alerts.patientId,
        handoverNotes: alerts.handoverNotes,
        responseMetrics: alerts.responseMetrics,
      })
      .from(alerts)
      .where(and(
        eq(alerts.hospitalId, hospitalId),
        eq(alerts.status, 'active'),
        gt(alerts.currentEscalationTier, 1)
      ))
      .orderBy(alerts.createdAt);
      
    console.log(`\n📊 Found ${escalatedAlerts.length} escalated alerts\n`);
    
    if (escalatedAlerts.length > 0) {
      console.log('First 5 alerts:');
      escalatedAlerts.slice(0, 5).forEach(alert => {
        console.log(`- Room ${alert.roomNumber}: ${alert.alertType} (Tier ${alert.currentEscalationTier})`);
      });
    }
    
    // Also check ALL active alerts for comparison
    const allActiveAlerts = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.hospitalId, hospitalId),
        eq(alerts.status, 'active')
      ));
      
    console.log(`\n📊 Total active alerts for hospital: ${allActiveAlerts.length}`);
    console.log(`📊 Escalated (tier > 1): ${escalatedAlerts.length}`);
    console.log(`📊 Non-escalated (tier = 1): ${allActiveAlerts.length - escalatedAlerts.length}`);
    
  } catch (error) {
    console.error('❌ Error testing escalation API:', error);
  } finally {
    process.exit(0);
  }
}

testEscalationAPI();