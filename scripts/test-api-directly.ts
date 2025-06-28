import { createCallerFactory } from '@/src/server/trpc';
import { appRouter } from '@/src/server/routers';
import { db } from '@/src/db';
import { eq } from 'drizzle-orm';
import { users, hospitals, healthcareUsers } from '@/src/db/healthcare-schema';

async function testAPIDirectly() {
  console.log('🔍 Testing getActiveAlerts API directly...\n');
  
  const userId = '5E3DfzRisBVISTEEQAvkGUkhayZKfKLs';
  const hospitalId = '4d1fe940-f7c1-43ad-84b8-5e8adae1db7a';
  
  try {
    // Get user data
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    console.log('User:', { id: user.id, name: user.name, role: user.role });
    
    // Get healthcare user data
    const [healthcareUser] = await db.select().from(healthcareUsers).where(eq(healthcareUsers.userId, userId));
    console.log('Healthcare User:', healthcareUser);
    
    // Get hospital data
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, hospitalId));
    console.log('Hospital:', { id: hospital.id, name: hospital.name });
    
    // Create a caller with user context
    const createCaller = createCallerFactory(appRouter);
    const caller = createCaller({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      session: null,
      hospitalContext: {
        userHospitalId: healthcareUser?.hospitalId || hospitalId,
        userOrganizationId: healthcareUser?.organizationId || hospital.organizationId,
        userRole: user.role,
      },
    });
    
    console.log('\n📞 Calling getActiveAlerts...');
    
    // Call the API
    const result = await caller.healthcare.getActiveAlerts({
      hospitalId: hospitalId,
      status: 'active',
      limit: 50,
    });
    
    console.log('\n📊 API Response:');
    console.log('Total alerts:', result.alerts.length);
    console.log('Pagination:', result.pagination);
    
    if (result.alerts.length > 0) {
      console.log('\nFirst 5 alerts:');
      result.alerts.slice(0, 5).forEach(alert => {
        console.log(`- Room ${alert.roomNumber}: ${alert.alertType} (Tier ${alert.currentEscalationTier})`);
      });
    }
    
    // Check escalated alerts
    const escalatedAlerts = result.alerts.filter(alert => alert.currentEscalationTier > 1);
    console.log(`\n📊 Escalated alerts (tier > 1): ${escalatedAlerts.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAPIDirectly();