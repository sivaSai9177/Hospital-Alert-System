import { db } from '@/src/db';
import { alerts } from '@/src/db/healthcare-schema';
import { and, eq, gt } from 'drizzle-orm';

async function verifyEscalationQueue() {
  console.log('🔍 Verifying escalated alerts in the database...\n');

  try {
    // Fetch all escalated alerts
    const escalatedAlerts = await db
      .select({
        roomNumber: alerts.roomNumber,
        alertType: alerts.alertType,
        urgencyLevel: alerts.urgencyLevel,
        currentEscalationTier: alerts.currentEscalationTier,
        status: alerts.status,
        targetDepartment: alerts.targetDepartment,
        description: alerts.description,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .where(and(
        eq(alerts.status, 'active'),
        gt(alerts.currentEscalationTier, 1)
      ))
      .orderBy(alerts.currentEscalationTier, alerts.createdAt);

    if (escalatedAlerts.length === 0) {
      console.log('❌ No escalated alerts found in the database.');
      return;
    }

    console.log(`✅ Found ${escalatedAlerts.length} escalated alerts:\n`);

    // Group by tier
    const tiers: Record<number, typeof escalatedAlerts> = {};
    escalatedAlerts.forEach(alert => {
      const tier = alert.currentEscalationTier || 1;
      if (!tiers[tier]) tiers[tier] = [];
      tiers[tier].push(alert);
    });

    // Display by tier
    Object.entries(tiers)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .forEach(([tier, alerts]) => {
        console.log(`📊 Tier ${tier} (${alerts.length} alerts):`);
        alerts.forEach(alert => {
          const minutesAgo = Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 60000);
          console.log(`   - Room ${alert.roomNumber}: ${alert.alertType} (Level ${alert.urgencyLevel}) - ${alert.targetDepartment}`);
          console.log(`     "${alert.description}"`);
          console.log(`     Created ${minutesAgo} minutes ago\n`);
        });
      });

    // Summary stats
    console.log('📈 Summary:');
    console.log(`   Total escalated alerts: ${escalatedAlerts.length}`);
    console.log(`   Tier 2: ${tiers[2]?.length || 0}`);
    console.log(`   Tier 3: ${tiers[3]?.length || 0}`);
    console.log(`   Tier 4+: ${Object.entries(tiers).filter(([t]) => parseInt(t) >= 4).reduce((sum, [_, alerts]) => sum + alerts.length, 0)}`);

  } catch (error) {
    console.error('❌ Error verifying escalation queue:', error);
  } finally {
    process.exit(0);
  }
}

verifyEscalationQueue();