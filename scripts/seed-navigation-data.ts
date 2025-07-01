import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/password';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.DEV_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing required DATABASE_URL environment variable');
  process.exit(1);
}

// Initialize database connection
const sql = postgres(DATABASE_URL, {
  prepare: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const db = drizzle(sql, { schema });

interface SeedData {
  users: Array<{
    email: string;
    password: string;
    name: string;
    role: string;
    permissions: string[];
  }>;
  hospitals: Array<{
    name: string;
    address: string;
    phone: string;
  }>;
  alerts: Array<{
    roomNumber: string;
    alertType: string;
    urgencyLevel: string;
    status: string;
    description: string;
  }>;
  patients: Array<{
    name: string;
    roomNumber: string;
    dateOfBirth: string;
    medicalRecordNumber: string;
  }>;
  notifications: Array<{
    userId?: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
  }>;
}

const seedData: SeedData = {
  users: [
    {
      email: 'admin@navtest.com',
      password: 'Admin123!',
      name: 'Sarah Thompson',
      role: 'admin',
      permissions: ['view_alerts', 'create_alerts', 'view_patients', 'manage_patients', 'view_analytics', 'manage_shifts', 'view_audit_logs'],
    },
    {
      email: 'doctor@navtest.com',
      password: 'Doctor123!',
      name: 'Dr. Michael Chen',
      role: 'doctor',
      permissions: ['view_alerts', 'create_alerts', 'view_patients', 'view_analytics'],
    },
    {
      email: 'nurse@navtest.com',
      password: 'Nurse123!',
      name: 'Emily Rodriguez',
      role: 'nurse',
      permissions: ['view_alerts', 'create_alerts', 'view_patients'],
    },
    {
      email: 'operator@navtest.com',
      password: 'Operator123!',
      name: 'James Wilson',
      role: 'operator',
      permissions: ['view_alerts'],
    },
  ],
  hospitals: [
    {
      name: 'St. Mary\'s Medical Center',
      address: '450 Healthcare Plaza, San Francisco, CA 94107',
      phone: '(415) 555-0100',
    },
    {
      name: 'UCSF Children\'s Hospital',
      address: '1975 4th Street, San Francisco, CA 94158',
      phone: '(415) 555-0200',
    },
    {
      name: 'Pacific Heights Emergency Care',
      address: '2333 Buchanan St, San Francisco, CA 94115',
      phone: '(415) 555-0300',
    },
  ],
  alerts: [
    // Critical alerts - need immediate attention
    {
      roomNumber: 'ICU-202',
      alertType: 'emergency',
      urgencyLevel: 'critical',
      status: 'active',
      description: 'Code Blue - Cardiac arrest in progress',
    },
    {
      roomNumber: 'ER-15',
      alertType: 'emergency',
      urgencyLevel: 'critical',
      status: 'escalated',
      description: 'Trauma patient - immediate surgery required',
    },
    // High priority alerts
    {
      roomNumber: '305',
      alertType: 'fall_risk',
      urgencyLevel: 'high',
      status: 'active',
      description: 'Fall detected - elderly patient, possible hip injury',
    },
    {
      roomNumber: 'ICU-104',
      alertType: 'vital_signs',
      urgencyLevel: 'high',
      status: 'active',
      description: 'Oxygen saturation dropping - 82% and falling',
    },
    {
      roomNumber: '412',
      alertType: 'medication',
      urgencyLevel: 'high',
      status: 'active',
      description: 'Insulin administration overdue - diabetic patient',
    },
    // Medium priority
    {
      roomNumber: '208',
      alertType: 'call_button',
      urgencyLevel: 'medium',
      status: 'acknowledged',
      description: 'Post-surgery patient requesting pain medication',
    },
    {
      roomNumber: '316',
      alertType: 'vital_signs',
      urgencyLevel: 'medium',
      status: 'active',
      description: 'Blood pressure elevated - 165/95, monitoring required',
    },
    // Low priority
    {
      roomNumber: '115',
      alertType: 'call_button',
      urgencyLevel: 'low',
      status: 'active',
      description: 'Patient requesting meal adjustment - dietary restriction',
    },
    {
      roomNumber: '223',
      alertType: 'call_button',
      urgencyLevel: 'low',
      status: 'acknowledged',
      description: 'Extra blanket requested - room temperature complaint',
    },
    // Recent escalations
    {
      roomNumber: 'NICU-08',
      alertType: 'vital_signs',
      urgencyLevel: 'critical',
      status: 'escalated',
      description: 'Premature infant - respiratory distress escalating',
    },
  ],
  patients: [
    {
      name: 'Margaret Sullivan',
      roomNumber: 'ICU-202',
      dateOfBirth: '1945-03-15',
      medicalRecordNumber: 'MRN-2024-0789',
    },
    {
      name: 'James Mitchell',
      roomNumber: 'ER-15',
      dateOfBirth: '1982-07-22',
      medicalRecordNumber: 'MRN-2024-0790',
    },
    {
      name: 'Eleanor Patterson',
      roomNumber: '305',
      dateOfBirth: '1938-11-08',
      medicalRecordNumber: 'MRN-2024-0791',
    },
    {
      name: 'Carlos Rivera',
      roomNumber: 'ICU-104',
      dateOfBirth: '1960-05-30',
      medicalRecordNumber: 'MRN-2024-0792',
    },
    {
      name: 'David Thompson',
      roomNumber: '412',
      dateOfBirth: '1955-09-12',
      medicalRecordNumber: 'MRN-2024-0793',
    },
    {
      name: 'Susan Chen',
      roomNumber: '208',
      dateOfBirth: '1970-04-18',
      medicalRecordNumber: 'MRN-2024-0794',
    },
    {
      name: 'Robert Williams',
      roomNumber: '316',
      dateOfBirth: '1952-12-05',
      medicalRecordNumber: 'MRN-2024-0795',
    },
    {
      name: 'Baby Johnson',
      roomNumber: 'NICU-08',
      dateOfBirth: '2024-06-20',
      medicalRecordNumber: 'MRN-2024-0796',
    },
  ],
  notifications: [
    {
      title: '🚨 Critical Alert - ICU-202',
      message: 'Code Blue in progress - immediate response required',
      type: 'alert',
      isRead: false,
    },
    {
      title: 'New Patient Assignment',
      message: 'You\'ve been assigned to Eleanor Patterson in Room 305',
      type: 'alert',
      isRead: false,
    },
    {
      title: 'Shift Change Reminder',
      message: 'Night shift handover in 30 minutes - prepare your notes',
      type: 'shift',
      isRead: false,
    },
    {
      title: 'Medication Schedule Update',
      message: 'Updated insulin protocol for diabetic patients now in effect',
      type: 'system',
      isRead: false,
    },
    {
      title: 'Weekly Performance Report',
      message: 'Your response time average: 2.3 minutes (↓15% improvement)',
      type: 'system',
      isRead: true,
    },
  ],
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding for navigation testing...\n');

  try {
    // 1. Create hospitals/organizations
    console.log('Creating hospitals...');
    const hospitals = [];
    for (const hospitalData of seedData.hospitals) {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: hospitalData.name,
          type: 'hospital',
          settings: {
            address: hospitalData.address,
            phone: hospitalData.phone,
            features: {
              alertsEnabled: true,
              patientsEnabled: true,
              analyticsEnabled: true,
            },
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating hospital:', error);
        continue;
      }

      hospitals.push(data);
      console.log(`✅ Created hospital: ${data.name}`);
    }

    const primaryHospital = hospitals[0];
    if (!primaryHospital) {
      throw new Error('No hospitals created');
    }

    // 2. Create users with different roles
    console.log('\nCreating users with different roles...');
    const users = [];
    for (const userData of seedData.users) {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (authError) {
        console.error(`Error creating auth user ${userData.email}:`, authError);
        continue;
      }

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          organizationId: primaryHospital.id,
          permissions: userData.permissions,
          settings: {
            theme: 'system',
            notifications: {
              alerts: true,
              shifts: true,
              system: true,
            },
          },
        })
        .select()
        .single();

      if (profileError) {
        console.error(`Error creating profile for ${userData.email}:`, profileError);
        continue;
      }

      users.push(profileData);
      console.log(`✅ Created user: ${userData.name} (${userData.role}) - ${userData.email}`);
    }

    // 3. Create patients
    console.log('\nCreating patients...');
    for (const patientData of seedData.patients) {
      const { error } = await supabase
        .from('patients')
        .insert({
          ...patientData,
          hospitalId: primaryHospital.id,
          status: 'admitted',
          admissionDate: faker.date.recent({ days: 7 }),
        });

      if (error) {
        console.error('Error creating patient:', error);
        continue;
      }

      console.log(`✅ Created patient: ${patientData.name} in Room ${patientData.roomNumber}`);
    }

    // 4. Create alerts with different statuses
    console.log('\nCreating alerts...');
    for (const alertData of seedData.alerts) {
      const createdBy = users.find(u => u.role === 'nurse') || users[0];
      
      const { error } = await supabase
        .from('alerts')
        .insert({
          ...alertData,
          hospitalId: primaryHospital.id,
          createdBy: createdBy.id,
          createdByName: createdBy.name,
          createdAt: faker.date.recent({ days: 1 }),
          currentEscalationTier: alertData.status === 'escalated' ? 2 : 1,
          nextEscalationAt: alertData.status === 'active' 
            ? faker.date.soon({ days: 1 })
            : null,
          acknowledgedAt: alertData.status === 'acknowledged'
            ? faker.date.recent({ days: 1 })
            : null,
          acknowledgedBy: alertData.status === 'acknowledged'
            ? users.find(u => u.role === 'doctor')?.id
            : null,
          acknowledgedByName: alertData.status === 'acknowledged'
            ? users.find(u => u.role === 'doctor')?.name
            : null,
        });

      if (error) {
        console.error('Error creating alert:', error);
        continue;
      }

      console.log(`✅ Created ${alertData.status} alert for Room ${alertData.roomNumber}`);
    }

    // 5. Create notifications
    console.log('\nCreating notifications...');
    for (const user of users) {
      for (const notificationData of seedData.notifications) {
        // Skip certain notifications for certain roles
        if (notificationData.type === 'shift' && user.role === 'admin') continue;
        if (notificationData.type === 'alert' && user.role === 'operator') continue;

        const { error } = await supabase
          .from('notifications')
          .insert({
            userId: user.id,
            ...notificationData,
            createdAt: faker.date.recent({ days: 1 }),
          });

        if (error) {
          console.error('Error creating notification:', error);
          continue;
        }
      }
    }
    console.log('✅ Created sample notifications for all users');

    // 6. Create some activity logs
    console.log('\nCreating activity logs...');
    const activities = [
      { action: 'alert.created', details: 'Created emergency alert' },
      { action: 'alert.acknowledged', details: 'Acknowledged alert in Room 101' },
      { action: 'alert.resolved', details: 'Resolved medication alert' },
      { action: 'patient.admitted', details: 'Admitted new patient' },
      { action: 'shift.started', details: 'Started shift' },
      { action: 'shift.ended', details: 'Ended shift' },
    ];

    for (const user of users) {
      for (let i = 0; i < 3; i++) {
        const activity = faker.helpers.arrayElement(activities);
        const { error } = await supabase
          .from('activity_logs')
          .insert({
            userId: user.id,
            hospitalId: primaryHospital.id,
            action: activity.action,
            details: activity.details,
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            createdAt: faker.date.recent({ days: 7 }),
          });

        if (error) {
          console.error('Error creating activity log:', error);
        }
      }
    }
    console.log('✅ Created sample activity logs');

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('Test Credentials:');
    console.log('================');
    seedData.users.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
    console.log('\nYou can now test the responsive navigation with different user roles!');

  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();