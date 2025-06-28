import { z } from 'zod';
import { 
  router, 
  protectedProcedure, 
  createPermissionProcedure,
  adminProcedure,
  healthcareProcedure 
} from '../trpc';
import { db } from '@/src/db';
import { 
  alerts, 
  alertEscalations, 
  alertAcknowledgments,
  healthcareAuditLogs,
  healthcareUsers,
  alertTimelineEvents,
  hospitals,
  shiftLogs,
  shiftHandovers,
  departments,
  alertTemplates
} from '@/src/db/healthcare-schema';
import { patients, careTeamAssignments } from '@/src/db/patient-schema';
import { users } from '@/src/db/schema';
import { organization } from '@/src/db/organization-schema';
import { eq, and, desc, or, gte, lte, asc, sql, aliasedTable, count, gt, isNotNull } from 'drizzle-orm';
import { 
  CreateAlertSchema, 
  AcknowledgeAlertSchema,
  UpdateUserRoleSchema,
  HealthcareProfileSchema,
  HEALTHCARE_ESCALATION_TIERS,
  AlertType,
  UrgencyLevel
} from '@/types/healthcare';
import { patientSchemas, patientValidation, permissionValidators } from '@/lib/validations/healthcare';
import { log } from '@/lib/core/debug/server-logger';
import { escalationTimerService } from '../services/escalation-timer';
import { TRPCError } from '@trpc/server';
import { 
  alertEventHelpers,
  trackedHospitalAlerts
} from '../services/alert-subscriptions';
// Removed unused imports: notificationService, NotificationType, Priority

// Create permission-based procedures for healthcare roles
// Removed unused variable: operatorProcedure
const doctorProcedure = createPermissionProcedure('acknowledge_alerts');
const viewAlertsProcedure = createPermissionProcedure('view_alerts');
const shiftManagementProcedure = createPermissionProcedure('start_shift');
const viewShiftStatusProcedure = createPermissionProcedure('view_shift_status');

// Shift validation constants
const MAX_SHIFT_DURATION_HOURS = 24;
const MIN_BREAK_BETWEEN_SHIFTS_HOURS = 8;

export const healthcareRouter = router({
  // Get hospitals for an organization
  getOrganizationHospitals: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid().refine((val) => val !== 'undefined', {
        message: 'Valid UUID required for organizationId',
      }),
    }))
    .query(async ({ input, ctx }) => {
      const { organizationId } = input;
      
      try {
        // Verify user belongs to this organization
        if (ctx.hospitalContext?.userOrganizationId !== organizationId) {
          throw new Error('Access denied: You can only view hospitals for your organization');
        }
        
        const hospitalsList = await db
          .select()
          .from(hospitals)
          .where(eq(hospitals.organizationId, organizationId))
          .orderBy(desc(hospitals.isDefault), asc(hospitals.name));
        
        log.info('Fetched hospitals for organization', 'HEALTHCARE', {
          organizationId,
          hospitalCount: hospitalsList.length,
          userId: ctx.user.id,
        });
        
        return {
          hospitals: hospitalsList,
          defaultHospitalId: hospitalsList.find(h => h.isDefault)?.id,
        };
      } catch (error) {
        log.error('Failed to fetch organization hospitals', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),
    
  // Get a specific hospital
  getHospital: protectedProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const { hospitalId } = input;
      
      try {
        const [hospital] = await db
          .select()
          .from(hospitals)
          .where(eq(hospitals.id, hospitalId))
          .limit(1);
        
        if (!hospital) {
          throw new Error('Hospital not found');
        }
        
        // Verify user has access to this hospital
        if (ctx.hospitalContext?.userOrganizationId !== hospital.organizationId) {
          throw new Error('Access denied: You do not have access to this hospital');
        }
        
        return hospital;
      } catch (error) {
        log.error('Failed to fetch hospital', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          hospitalId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),
    
  // Set user's default hospital
  setDefaultHospital: protectedProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { hospitalId } = input;
      
      try {
        // Verify hospital exists and user has access
        const [hospital] = await db
          .select()
          .from(hospitals)
          .where(eq(hospitals.id, hospitalId))
          .limit(1);
        
        if (!hospital) {
          throw new Error('Hospital not found');
        }
        
        if (ctx.hospitalContext?.userOrganizationId !== hospital.organizationId) {
          throw new Error('Access denied: You can only select hospitals from your organization');
        }
        
        // Update user's default hospital
        await db
          .update(users)
          .set({ 
            defaultHospitalId: hospitalId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));
        
        log.info('Updated user default hospital', 'HEALTHCARE', {
          userId: ctx.user.id,
          hospitalId,
          hospitalName: hospital.name,
        });
        
        return { success: true, hospital };
      } catch (error) {
        log.error('Failed to set default hospital', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          hospitalId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  // Create a new alert (operators only)
  createAlert: healthcareProcedure
    .use(async ({ ctx, next }) => {
      // Apply rate limiting
      const { healthcareRateLimiters } = await import('../middleware/rate-limiter');
      return healthcareRateLimiters.createAlert({ ctx, next });
    })
    .input(CreateAlertSchema)
    .mutation(async ({ input, ctx }) => {
      const { roomNumber, alertType, urgencyLevel, description, hospitalId, targetDepartment } = input;
      
      // Use user's hospital context
      const userHospitalId = ctx.hospitalContext?.userHospitalId;
      
      if (!userHospitalId) {
        throw new Error('Hospital assignment required. Please complete your profile.');
      }
      
      // Validate user has access to the hospital through their organization
      let alertHospitalId = hospitalId || userHospitalId;
      
      if (hospitalId && ctx.user.organizationId) {
        // Check if the hospital belongs to the user's organization
        const [hospitalAccess] = await db
          .select({ id: hospitals.id })
          .from(hospitals)
          .where(
            and(
              eq(hospitals.id, hospitalId),
              eq(hospitals.organizationId, ctx.user.organizationId)
            )
          )
          .limit(1);
        
        if (!hospitalAccess) {
          throw new Error('You can only create alerts for hospitals within your organization.');
        }
        
        alertHospitalId = hospitalId;
      } else if (!userHospitalId) {
        throw new Error('Hospital assignment required. Please complete your profile.');
      }
      
      try {
        // Create the alert
        const [newAlert] = await db.insert(alerts).values({
          roomNumber,
          alertType,
          urgencyLevel,
          description,
          targetDepartment,
          createdBy: ctx.user.id,
          hospitalId: alertHospitalId,
          status: 'active',
          // Set escalation timer based on urgency
          nextEscalationAt: new Date(Date.now() + HEALTHCARE_ESCALATION_TIERS[0].timeout_minutes * 60 * 1000),
        }).returning();

        // Log the alert creation
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'alert_created',
          entityType: 'alert',
          entityId: newAlert.id,
          hospitalId: alertHospitalId,
          metadata: {
            alertType,
            urgencyLevel,
            roomNumber,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        // Emit alert created event
        await alertEventHelpers.emitAlertCreated(newAlert);

        // Send push notifications to relevant healthcare staff
        try {
          const { notificationService, NotificationType, Priority } = await import('../services/notifications');
          
          // Get on-duty healthcare staff (doctors and nurses)
          // If targetDepartment is specified, only notify staff in that department
          const whereConditions = [
            eq(healthcareUsers.hospitalId, alertHospitalId),
            eq(healthcareUsers.isOnDuty, true),
            or(
              eq(users.role, 'doctor'),
              eq(users.role, 'nurse'),
              eq(users.role, 'head_doctor')
            )
          ];
          
          if (targetDepartment) {
            whereConditions.push(eq(users.department, targetDepartment));
          }
          
          const onDutyStaff = await db
            .select({
              userId: healthcareUsers.userId,
              role: users.role,
            })
            .from(healthcareUsers)
            .innerJoin(users, eq(healthcareUsers.userId, users.id))
            .where(and(...whereConditions));

          if (onDutyStaff.length > 0) {
            // Send notification to all on-duty staff
            await notificationService.sendBatch(
              onDutyStaff.map(staff => ({
                id: `alert-${newAlert.id}-${staff.userId}`,
                type: NotificationType.ALERT_CREATED,
                recipient: {
                  userId: staff.userId,
                },
                priority: urgencyLevel === 3 ? Priority.CRITICAL : Priority.HIGH,
                data: {
                  alertId: newAlert.id,
                  roomNumber,
                  alertType,
                  urgencyLevel,
                  description,
                  targetDepartment,
                },
                organizationId: hospitalId,
              }))
            );
          }
        } catch (notificationError) {
          // Don't fail the alert creation if notifications fail
          log.error('Failed to send push notifications for alert', 'HEALTHCARE', notificationError);
        }

        log.info('Alert created', 'HEALTHCARE', {
          alertId: newAlert.id,
          alertType,
          urgencyLevel,
          roomNumber,
          targetDepartment,
          createdBy: ctx.user.id,
        });

        return {
          success: true,
          alert: newAlert,
        };
      } catch (error) {
        log.error('Failed to create alert', 'HEALTHCARE', error);
        throw new Error('Failed to create alert');
      }
    }),

  // Get active alerts (based on user role)
  getActiveAlerts: healthcareProcedure
    .input(z.object({
      hospitalId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      cursor: z.string().optional(), // For cursor-based pagination
      status: z.enum(['active', 'acknowledged', 'resolved', 'all']).default('active'),
      urgencyLevel: z.number().min(1).max(5).optional(),
      alertType: z.string().optional(),
      sortBy: z.enum(['createdAt', 'urgencyLevel', 'acknowledgedAt']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;
      
      // Log context for debugging
      log.debug('getActiveAlerts called', 'HEALTHCARE', {
        userId: ctx.user.id,
        userRole: (ctx.user as any).role,
        inputHospitalId: input.hospitalId,
        ctxHospitalId: ctx.hospitalContext?.userHospitalId,
        hasHospitalContext: !!ctx.hospitalContext?.userHospitalId,
      });
      
      // Use user's hospital if not specified
      const hospitalId = input.hospitalId || ctx.hospitalContext?.userHospitalId;
      
      if (!hospitalId) {
        log.error('Hospital context missing in getActiveAlerts', 'HEALTHCARE', {
          userId: ctx.user.id,
          userRole: (ctx.user as any).role,
          inputHospitalId: input.hospitalId,
          ctxHospitalId: ctx.hospitalContext?.userHospitalId,
        });
        throw new Error('Hospital context required. Please ensure you have selected a hospital in your profile.');
      }
      
      try {
        // Build where conditions based on filters
        const conditions = [eq(alerts.hospitalId, hospitalId)];
        
        // Status filter
        if (input.status !== 'all') {
          conditions.push(eq(alerts.status, input.status));
        }
        
        // Urgency level filter
        if (input.urgencyLevel !== undefined) {
          conditions.push(eq(alerts.urgencyLevel, input.urgencyLevel));
        }
        
        // Alert type filter
        if (input.alertType) {
          conditions.push(eq(alerts.alertType, input.alertType));
        }
        
        // Cursor-based pagination
        if (input.cursor) {
          const cursorDate = new Date(input.cursor);
          if (input.sortOrder === 'desc') {
            conditions.push(lte(alerts.createdAt, cursorDate));
          } else {
            conditions.push(gte(alerts.createdAt, cursorDate));
          }
        }
        
        // Build order by clause
        const orderByClause = [];
        switch (input.sortBy) {
          case 'urgencyLevel':
            orderByClause.push(
              input.sortOrder === 'desc' 
                ? desc(alerts.urgencyLevel) 
                : asc(alerts.urgencyLevel)
            );
            break;
          case 'acknowledgedAt':
            orderByClause.push(
              input.sortOrder === 'desc'
                ? desc(alerts.acknowledgedAt)
                : asc(alerts.acknowledgedAt)
            );
            break;
          case 'createdAt':
          default:
            orderByClause.push(
              input.sortOrder === 'desc'
                ? desc(alerts.createdAt)
                : asc(alerts.createdAt)
            );
        }
        
        // Always add secondary sort by ID for stable pagination
        orderByClause.push(desc(alerts.id));
        
        // Get total count for pagination
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(alerts)
          .where(and(...conditions));
        
        const totalCount = countResult?.count || 0;

        // Create aliases for user tables
        const creatorUser = aliasedTable(users, 'creatorUser');
        const acknowledgedUser = aliasedTable(users, 'acknowledgedUser');
        
        // Get paginated alerts
        const activeAlerts = await db
          .select({
            alert: alerts,
            creator: {
              id: creatorUser.id,
              name: creatorUser.name,
              email: creatorUser.email,
            },
            acknowledgedByUser: {
              id: acknowledgedUser.id,
              name: acknowledgedUser.name,
              email: acknowledgedUser.email,
            },
          })
          .from(alerts)
          .leftJoin(creatorUser, eq(alerts.createdBy, creatorUser.id))
          .leftJoin(acknowledgedUser, eq(alerts.acknowledgedBy, acknowledgedUser.id))
          .where(and(...conditions))
          .orderBy(...orderByClause)
          .limit(limit + 1) // Fetch one extra to determine if there's a next page
          .offset(offset);

        // Check if there's a next page
        const hasMore = activeAlerts.length > limit;
        const paginatedAlerts = hasMore ? activeAlerts.slice(0, -1) : activeAlerts;
        
        // Calculate next cursor
        const nextCursor = hasMore && paginatedAlerts.length > 0
          ? paginatedAlerts[paginatedAlerts.length - 1].alert.createdAt.toISOString()
          : null;

        // Map the alerts with user information
        const mappedAlerts = paginatedAlerts.map(({ alert, creator, acknowledgedByUser }) => ({
          ...alert,
          createdByName: creator?.name || 'Unknown',
          acknowledgedByName: acknowledgedByUser?.name || null,
          currentEscalationTier: alert.currentEscalationTier || 1,
          escalationLevel: alert.escalationLevel || 1,
        }));

        log.info('Successfully fetched active alerts', 'HEALTHCARE', {
          hospitalId,
          alertCount: mappedAlerts.length,
          totalCount,
          hasMore,
          userId: ctx.user.id,
        });

        return {
          alerts: mappedAlerts,
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore,
            nextCursor,
          },
        };
      } catch (error) {
        log.error('Failed to fetch active alerts', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          hospitalId,
          userId: ctx.user.id,
        });
        throw new Error('Failed to fetch active alerts: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }),

  // Get alert statistics
  getAlertStats: healthcareProcedure
    .query(async ({ ctx }) => {
      try {
        log.info('Getting alert stats', 'HEALTHCARE', {
          userId: ctx.user.id,
          userRole: ctx.user.role,
          hospitalContext: ctx.hospitalContext,
        });

        // Get user's hospital context from database
        const [healthcareUser] = await db
          .select()
          .from(healthcareUsers)
          .where(eq(healthcareUsers.userId, ctx.user.id))
          .limit(1);
        
        log.info('Healthcare user lookup', 'HEALTHCARE', {
          userId: ctx.user.id,
          healthcareUser: healthcareUser ? 'found' : 'not found',
          hospitalId: healthcareUser?.hospitalId,
        });
        
        if (!healthcareUser?.hospitalId) {
          return {
            active: 0,
            acknowledged: 0,
            resolved: 0,
            escalated: 0,
            avgResponseTime: 0,
          };
        }

        const hospitalId = healthcareUser.hospitalId;

        // Get active alerts count
        const [activeCount] = await db
          .select({ count: count() })
          .from(alerts)
          .where(and(
            eq(alerts.hospitalId, hospitalId),
            eq(alerts.status, 'active'),
            sql`${alerts.resolvedAt} IS NULL`
          ));

        // Get acknowledged count
        const [acknowledgedCount] = await db
          .select({ count: count() })
          .from(alerts)
          .where(and(
            eq(alerts.hospitalId, hospitalId),
            eq(alerts.status, 'acknowledged'),
            sql`${alerts.resolvedAt} IS NULL`
          ));

        // Get resolved count (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [resolvedCount] = await db
          .select({ count: count() })
          .from(alerts)
          .where(and(
            eq(alerts.hospitalId, hospitalId),
            sql`${alerts.resolvedAt} IS NOT NULL`,
            gt(alerts.resolvedAt, yesterday)
          ));

        // Get escalated alerts
        const [escalatedCount] = await db
          .select({ count: count() })
          .from(alerts)
          .where(and(
            eq(alerts.hospitalId, hospitalId),
            eq(alerts.status, 'active'),
            gt(alerts.currentEscalationTier, 1)
          ));

        // Calculate average response time
        const recentAlerts = await db
          .select({
            responseTime: sql<number>`EXTRACT(EPOCH FROM (${alerts.acknowledgedAt} - ${alerts.createdAt}))`.as('response_time')
          })
          .from(alerts)
          .where(and(
            eq(alerts.hospitalId, hospitalId),
            isNotNull(alerts.acknowledgedAt),
            gt(alerts.createdAt, yesterday)
          ))
          .limit(100);

        const avgResponseTime = recentAlerts.length > 0
          ? Math.round(recentAlerts.reduce((sum, a) => sum + (a.responseTime || 0), 0) / recentAlerts.length)
          : 0;

        return {
          active: activeCount?.count || 0,
          acknowledged: acknowledgedCount?.count || 0,
          resolved: resolvedCount?.count || 0,
          escalated: escalatedCount?.count || 0,
          avgResponseTime,
        };
      } catch (error) {
        log.error('Failed to fetch alert stats', 'HEALTHCARE', error);
        throw new Error('Failed to fetch alert statistics');
      }
    }),

  getDepartments: healthcareProcedure
    .input(z.object({
      hospitalId: z.string().optional(),
    }))
    .query(async () => {
      // Removed unused hospitalId variable
      
      // In a real app, this would come from a departments table
      // For now, return mock departments
      return [
        { id: 'emergency', name: 'Emergency' },
        { id: 'icu', name: 'ICU' },
        { id: 'cardiology', name: 'Cardiology' },
        { id: 'pediatrics', name: 'Pediatrics' },
        { id: 'general', name: 'General Ward' },
        { id: 'orthopedics', name: 'Orthopedics' },
        { id: 'neurology', name: 'Neurology' },
      ];
    }),

  getActivityLogs: healthcareProcedure
    .input(z.object({
      hospitalId: z.string().optional(),
      userId: z.string().optional(),
      search: z.string().optional(),
      type: z.enum(['alert', 'patient', 'auth', 'system', 'audit']).optional(),
      severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
      timeRange: z.enum(['1h', '24h', '7d', '30d', 'custom']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const hospitalId = input.hospitalId || ctx.hospitalContext?.userHospitalId;
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (input.timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          startDate = input.startDate || new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }
      
      const endDate = input.endDate || now;
      
      // Build where conditions
      const whereConditions = [
        eq(healthcareAuditLogs.hospitalId, hospitalId),
        gte(healthcareAuditLogs.timestamp, startDate),
        lte(healthcareAuditLogs.timestamp, endDate),
      ];
      
      if (input.userId) {
        whereConditions.push(eq(healthcareAuditLogs.userId, input.userId));
      }
      
      if (input.type) {
        whereConditions.push(eq(healthcareAuditLogs.entityType, input.type));
      }
      
      if (input.severity) {
        whereConditions.push(eq(healthcareAuditLogs.severity, input.severity));
      }
      
      if (input.search) {
        whereConditions.push(
          or(
            sql`${healthcareAuditLogs.action} ILIKE ${`%${input.search}%`}`,
            sql`${healthcareAuditLogs.metadata}::text ILIKE ${`%${input.search}%`}`
          )
        );
      }
      
      // Get logs with user information
      const logs = await db
        .select({
          id: healthcareAuditLogs.id,
          timestamp: healthcareAuditLogs.timestamp,
          type: healthcareAuditLogs.entityType,
          action: healthcareAuditLogs.action,
          userId: healthcareAuditLogs.userId,
          userName: users.name,
          userRole: users.role,
          entityType: healthcareAuditLogs.entityType,
          entityId: healthcareAuditLogs.entityId,
          description: sql<string>`
            CASE
              WHEN ${healthcareAuditLogs.action} = 'alert_created' THEN 'Created new alert'
              WHEN ${healthcareAuditLogs.action} = 'alert_acknowledged' THEN 'Acknowledged alert'
              WHEN ${healthcareAuditLogs.action} = 'alert_resolved' THEN 'Resolved alert'
              WHEN ${healthcareAuditLogs.action} = 'patient_updated' THEN 'Updated patient information'
              WHEN ${healthcareAuditLogs.action} = 'login' THEN 'User logged in'
              WHEN ${healthcareAuditLogs.action} = 'logout' THEN 'User logged out'
              ELSE ${healthcareAuditLogs.action}
            END
          `,
          severity: healthcareAuditLogs.severity,
          metadata: healthcareAuditLogs.metadata,
          ipAddress: healthcareAuditLogs.ipAddress,
          userAgent: healthcareAuditLogs.userAgent,
        })
        .from(healthcareAuditLogs)
        .leftJoin(users, eq(healthcareAuditLogs.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(healthcareAuditLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(healthcareAuditLogs)
        .where(and(...whereConditions));
      
      return {
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          type: log.type || 'system',
          action: log.action,
          user: {
            id: log.userId,
            name: log.userName || 'System',
            role: log.userRole || 'system',
          },
          entityType: log.entityType,
          entityId: log.entityId,
          description: log.description,
          severity: log.severity || 'info',
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        })),
        total: countResult?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  getResponseAnalytics: healthcareProcedure
    .input(z.object({
      hospitalId: z.string().optional(),
      departmentId: z.string().optional(),
      timeRange: z.enum(['24h', '7d', '30d', '90d', 'custom']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const hospitalId = input.hospitalId || ctx.hospitalContext?.userHospitalId;
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (input.timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          startDate = input.startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }
      
      const endDate = input.endDate || now;
      
      // Build where conditions
      const whereConditions = [
        eq(alerts.hospitalId, hospitalId),
        gte(alerts.createdAt, startDate),
        lte(alerts.createdAt, endDate),
      ];
      
      // Removed department filtering as alerts table doesn't have department column
      
      // Get overview stats
      const overviewStats = await db
        .select({
          totalAlerts: count(),
          acknowledgedAlerts: count(sql`CASE WHEN ${alerts.acknowledgedAt} IS NOT NULL THEN 1 END`),
          resolvedAlerts: count(sql`CASE WHEN ${alerts.status} = 'resolved' THEN 1 END`),
          escalatedAlerts: count(sql`CASE WHEN ${alerts.status} = 'escalated' THEN 1 END`),
          activeAlerts: count(sql`CASE WHEN ${alerts.status} = 'active' THEN 1 END`),
          avgResponseTime: sql<number>`
            AVG(
              EXTRACT(EPOCH FROM (
                COALESCE(${alerts.acknowledgedAt}, CURRENT_TIMESTAMP) - ${alerts.createdAt}
              )) / 60
            )
          `,
        })
        .from(alerts)
        .where(and(...whereConditions));
      
      // Get response time trend (daily)
      const responseTimeTrend = await db
        .select({
          date: sql<string>`DATE(${alerts.createdAt})`,
          avgTime: sql<number>`
            AVG(
              EXTRACT(EPOCH FROM (
                COALESCE(${alerts.acknowledgedAt}, CURRENT_TIMESTAMP) - ${alerts.createdAt}
              )) / 60
            )
          `,
          count: count(),
        })
        .from(alerts)
        .where(and(...whereConditions))
        .groupBy(sql`DATE(${alerts.createdAt})`)
        .orderBy(sql`DATE(${alerts.createdAt})`);
      
      // Get hospital breakdown instead of department
      const departmentBreakdown = await db
        .select({
          department: alerts.hospitalId,
          alerts: count(),
          avgResponseTime: sql<number>`
            AVG(
              EXTRACT(EPOCH FROM (
                COALESCE(${alerts.acknowledgedAt}, CURRENT_TIMESTAMP) - ${alerts.createdAt}
              )) / 60
            )
          `,
        })
        .from(alerts)
        .where(and(...whereConditions))
        .groupBy(alerts.hospitalId);
      
      // Get alert type distribution
      const alertTypeDistribution = await db
        .select({
          type: alerts.alertType,
          count: count(),
        })
        .from(alerts)
        .where(and(...whereConditions))
        .groupBy(alerts.alertType);
      
      const stats = overviewStats[0];
      const responseRate = stats.totalAlerts > 0 
        ? (stats.acknowledgedAlerts / stats.totalAlerts) * 100 
        : 0;
      const escalationRate = stats.totalAlerts > 0 
        ? (stats.escalatedAlerts / stats.totalAlerts) * 100 
        : 0;
      
      return {
        overview: {
          totalAlerts: stats.totalAlerts,
          averageResponseTime: Math.round((stats.avgResponseTime || 0) * 10) / 10,
          responseRate: Math.round(responseRate * 10) / 10,
          escalationRate: Math.round(escalationRate * 10) / 10,
          acknowledgedAlerts: stats.acknowledgedAlerts,
          resolvedAlerts: stats.resolvedAlerts,
          activeAlerts: stats.activeAlerts,
        },
        responseTimeTrend: responseTimeTrend.map(item => ({
          date: item.date,
          avgTime: Math.round((item.avgTime || 0) * 10) / 10,
          count: item.count,
        })),
        departmentBreakdown: departmentBreakdown.map(item => ({
          name: item.department || 'Unknown',
          alerts: item.alerts,
          avgResponseTime: Math.round((item.avgResponseTime || 0) * 10) / 10,
        })),
        alertTypeDistribution: alertTypeDistribution.map(item => {
          const percentage = stats.totalAlerts > 0 
            ? (item.count / stats.totalAlerts) * 100 
            : 0;
          return {
            type: item.type,
            count: item.count,
            percentage: Math.round(percentage * 10) / 10,
          };
        }),
      };
    }),

  // Acknowledge an alert (doctors and nurses)
  acknowledgeAlert: doctorProcedure
    .use(async ({ ctx, next }) => {
      // Apply rate limiting
      const { healthcareRateLimiters } = await import('../middleware/rate-limiter');
      return healthcareRateLimiters.acknowledgeAlert({ ctx, next });
    })
    .input(AcknowledgeAlertSchema)
    .mutation(async ({ input, ctx }) => {
      const { 
        alertId, 
        urgencyAssessment, 
        responseAction, 
        estimatedResponseTime, 
        delegateTo,
        notes 
      } = input;
      
      // Validate user has organizationId
      if (!ctx.hospitalContext?.userOrganizationId) {
        throw new Error('Organization required. Please complete your profile to use healthcare features.');
      }
      
      try {
        // Validate required fields based on response action
        if ((responseAction === 'responding' || responseAction === 'delayed') && !estimatedResponseTime) {
          throw new Error('Estimated response time is required for this action');
        }
        
        if (responseAction === 'delegating' && !delegateTo) {
          throw new Error('Delegate recipient is required for delegation');
        }

        // Get the alert
        const [alert] = await db
          .select()
          .from(alerts)
          .where(eq(alerts.id, alertId))
          .limit(1);

        if (!alert) {
          throw new Error('Alert not found');
        }

        if (alert.status !== 'active') {
          throw new Error('Alert is not active');
        }

        // Calculate response time
        const responseTimeSeconds = Math.floor(
          (Date.now() - alert.createdAt.getTime()) / 1000
        );

        // Determine new urgency level based on assessment
        let newUrgencyLevel = alert.urgencyLevel;
        if (urgencyAssessment === 'increase' && alert.urgencyLevel > 1) {
          newUrgencyLevel = alert.urgencyLevel - 1; // Lower number = higher urgency
        } else if (urgencyAssessment === 'decrease' && alert.urgencyLevel < 5) {
          newUrgencyLevel = alert.urgencyLevel + 1; // Higher number = lower urgency
        }

        // Update alert status and urgency
        await db
          .update(alerts)
          .set({
            status: 'acknowledged',
            acknowledgedBy: ctx.user.id,
            acknowledgedAt: new Date(),
            urgencyLevel: newUrgencyLevel,
          })
          .where(eq(alerts.id, alertId));

        // Create acknowledgment record with extended data
        await db.insert(alertAcknowledgments).values({
          alertId,
          userId: ctx.user.id,
          responseTimeSeconds,
          notes,
          urgencyAssessment,
          responseAction,
          estimatedResponseTime: estimatedResponseTime || null,
          delegatedTo: delegateTo || null,
        }).returning();

        // Create timeline event
        await db.insert(alertTimelineEvents).values({
          alertId,
          eventType: 'acknowledged',
          userId: ctx.user.id,
          description: `Alert acknowledged by ${ctx.user.name || ctx.user.email}`,
          metadata: {
            responseAction,
            urgencyAssessment,
            estimatedResponseTime,
            delegateTo,
            responseTimeSeconds,
          },
        });

        // If urgency was changed, create another timeline event
        if (newUrgencyLevel !== alert.urgencyLevel) {
          await db.insert(alertTimelineEvents).values({
            alertId,
            eventType: 'urgency_changed',
            userId: ctx.user.id,
            description: `Urgency ${urgencyAssessment === 'increase' ? 'increased' : 'decreased'} from Level ${alert.urgencyLevel} to Level ${newUrgencyLevel}`,
            metadata: {
              previousUrgency: alert.urgencyLevel,
              newUrgency: newUrgencyLevel,
              reason: urgencyAssessment,
            },
          });
        }

        // Escalation timer will be handled by the alert status update

        // Log the acknowledgment
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'alert_acknowledged',
          entityType: 'alert',
          entityId: alertId,
          hospitalId: alert.hospitalId,
          metadata: {
            responseTimeSeconds,
            escalationLevel: alert.escalationLevel,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        // Emit alert acknowledged event
        await alertEventHelpers.emitAlertAcknowledged(
          alertId,
          alert.hospitalId,
          ctx.user.id
        );

        // Send push notification to alert creator
        try {
          const { notificationService, NotificationType, Priority } = await import('../services/notifications');
          
          // Notify the alert creator that their alert has been acknowledged
          await notificationService.send({
            id: `ack-${alertId}-${alert.createdBy}`,
            type: NotificationType.ALERT_ACKNOWLEDGED,
            recipient: {
              userId: alert.createdBy,
            },
            priority: Priority.MEDIUM,
            data: {
              alertId,
              roomNumber: alert.roomNumber,
              alertType: alert.alertType,
              acknowledgedBy: ctx.user.name || ctx.user.email,
              responseAction,
              estimatedResponseTime,
            },
            organizationId: alert.hospitalId,
          });
        } catch (notificationError) {
          log.error('Failed to send acknowledgment notification', 'HEALTHCARE', notificationError);
        }

        log.info('Alert acknowledged', 'HEALTHCARE', {
          alertId,
          acknowledgedBy: ctx.user.id,
          responseTimeSeconds,
        });

        return {
          success: true,
          responseTimeSeconds,
        };
      } catch (error) {
        log.error('Failed to acknowledge alert', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Resolve an alert
  resolveAlert: doctorProcedure
    .input(z.object({
      alertId: z.string().uuid(),
      resolution: z.string().min(10, "Resolution notes must be at least 10 characters"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { alertId, resolution } = input;
      
      try {
        // Update alert status
        const [resolvedAlert] = await db
          .update(alerts)
          .set({
            status: 'resolved',
            resolvedAt: new Date(),
            description: resolution,
          })
          .where(
            and(
              eq(alerts.id, alertId),
              eq(alerts.status, 'acknowledged')
            )
          )
          .returning();

        if (!resolvedAlert) {
          throw new Error('Alert not found or not acknowledged');
        }

        // Log the resolution
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'alert_resolved',
          entityType: 'alert',
          entityId: alertId,
          hospitalId: resolvedAlert.hospitalId,
          metadata: {
            resolution,
            totalTimeSeconds: Math.floor(
              (resolvedAlert.resolvedAt.getTime() - resolvedAlert.createdAt.getTime()) / 1000
            ),
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        // Emit alert resolved event
        await alertEventHelpers.emitAlertResolved(
          alertId,
          resolvedAlert.hospitalId,
          ctx.user.id,
          resolution
        );

        return {
          success: true,
          alert: resolvedAlert,
        };
      } catch (error) {
        log.error('Failed to resolve alert', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Get alert history
  getAlertHistory: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { hospitalId, startDate, endDate, limit, offset } = input;
      
      try {
        const conditions = [eq(alerts.hospitalId, hospitalId)];

        if (startDate) {
          conditions.push(gte(alerts.createdAt, startDate));
        }

        if (endDate) {
          conditions.push(lte(alerts.createdAt, endDate));
        }

        const alertHistory = await db
          .select()
          .from(alerts)
          .where(and(...conditions))
          .orderBy(desc(alerts.createdAt))
          .limit(limit)
          .offset(offset);

        return {
          alerts: alertHistory,
          total: alertHistory.length,
        };
      } catch (error) {
        log.error('Failed to fetch alert history', 'HEALTHCARE', error);
        throw new Error('Failed to fetch alert history');
      }
    }),

  // Update user healthcare profile
  updateHealthcareProfile: protectedProcedure
    .input(HealthcareProfileSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if healthcare user record exists
        const existing = await db
          .select()
          .from(healthcareUsers)
          .where(eq(healthcareUsers.userId, ctx.user.id))
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(healthcareUsers)
            .set({
              hospitalId: input.hospitalId,
              licenseNumber: input.licenseNumber,
              department: input.department as any, // Cast to department enum type
              specialization: input.specialization,
              isOnDuty: input.isOnDuty,
            })
            .where(eq(healthcareUsers.userId, ctx.user.id));
        } else {
          // Create new record
          await db.insert(healthcareUsers).values({
            userId: ctx.user.id,
            hospitalId: input.hospitalId,
            licenseNumber: input.licenseNumber,
            department: input.department as any, // Cast to department enum type
            specialization: input.specialization,
            isOnDuty: input.isOnDuty,
          });
        }

        return {
          success: true,
        };
      } catch (error) {
        log.error('Failed to update healthcare profile', 'HEALTHCARE', error);
        throw new Error('Failed to update healthcare profile');
      }
    }),

  // Admin: Update user role
  updateUserRole: adminProcedure
    .input(UpdateUserRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const { userId, role } = input;
      
      try {
        // Update user role
        await db
          .update(users)
          .set({ role })
          .where(eq(users.id, userId));

        // Log the role change
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'role_changed',
          entityType: 'user',
          entityId: userId,
          hospitalId: input.hospitalId,
          metadata: {
            newRole: role,
            changedBy: ctx.user.id,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        return {
          success: true,
        };
      } catch (error) {
        log.error('Failed to update user role', 'HEALTHCARE', error);
        throw new Error('Failed to update user role');
      }
    }),

  // Get user's current on-duty status
  getOnDutyStatus: viewShiftStatusProcedure
    .query(async ({ ctx }) => {
      log.debug('Fetching on-duty status', 'HEALTHCARE', {
        userId: ctx.user.id,
        userRole: ctx.user.role,
      });
      
      try {
        const [healthcareUser] = await db
          .select()
          .from(healthcareUsers)
          .where(eq(healthcareUsers.userId, ctx.user.id))
          .limit(1);

        // If no healthcare user profile exists and user has healthcare role
        if (!healthcareUser && ['doctor', 'nurse', 'head_doctor', 'operator'].includes((ctx.user as any).role)) {
          // Get hospital from context or user's default
          const hospitalId = ctx.hospitalContext?.userHospitalId || (ctx.user as any).defaultHospitalId;
          
          if (!hospitalId) {
            log.warn('No hospital assignment for healthcare user', 'HEALTHCARE', {
              userId: ctx.user.id,
              role: (ctx.user as any).role,
            });
            throw new Error('Hospital assignment required. Please complete your profile to use shift features.');
          }
          
          try {
            await db.insert(healthcareUsers).values({
              userId: ctx.user.id,
              hospitalId,
              department: 'general_medicine' as any,
              isOnDuty: false,
            });
            
            log.info('Auto-created healthcare user profile', 'HEALTHCARE', { 
              userId: ctx.user.id,
              role: (ctx.user as any).role,
              hospitalId
            });
          } catch (insertError) {
            log.error('Failed to auto-create healthcare profile', 'HEALTHCARE', insertError);
            throw new Error('Failed to initialize healthcare profile');
          }
        }

        return {
          isOnDuty: healthcareUser?.isOnDuty || false,
          shiftStartTime: healthcareUser?.shiftStartTime,
          shiftEndTime: healthcareUser?.shiftEndTime,
        };
      } catch (error) {
        log.error('Failed to get on-duty status', 'HEALTHCARE', error);
        throw new Error('Failed to get on-duty status');
      }
    }),

  // Toggle on-duty status
  toggleOnDuty: shiftManagementProcedure
    .input(z.object({
      isOnDuty: z.boolean(),
      handoverNotes: z.string()
        .min(10, 'Handover notes must be at least 10 characters')
        .max(500, 'Handover notes must be at most 500 characters')
        .optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info('Shift toggle request received', 'HEALTHCARE', {
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: input.isOnDuty ? 'start_shift' : 'end_shift',
        hasHandoverNotes: !!input.handoverNotes,
        hospitalContext: ctx.hospitalContext,
      });
      
      // Validate user has hospital context
      if (!ctx.hospitalContext?.userHospitalId) {
        log.error('No hospital context for shift toggle', 'HEALTHCARE', {
          userId: ctx.user.id,
          userRole: ctx.user.role,
        });
        throw new Error('Hospital assignment required. Please complete your profile to use shift features.');
      }
      
      try {
        const now = new Date();
        
        // Get current healthcare user data
        const [currentUser] = await db
          .select({
            userId: healthcareUsers.userId,
            hospitalId: healthcareUsers.hospitalId,
            shiftStartTime: healthcareUsers.shiftStartTime,
            shiftEndTime: healthcareUsers.shiftEndTime,
            isOnDuty: healthcareUsers.isOnDuty,
          })
          .from(healthcareUsers)
          .where(eq(healthcareUsers.userId, ctx.user.id))
          .limit(1);
        
        if (!currentUser) {
          throw new Error('Healthcare profile not found. Please contact administrator.');
        }
        
        // Validate hospital matches context
        if (currentUser.hospitalId !== ctx.hospitalContext.userHospitalId) {
          log.error('Hospital mismatch in shift toggle', 'HEALTHCARE', {
            userId: ctx.user.id,
            profileHospitalId: currentUser.hospitalId,
            contextHospitalId: ctx.hospitalContext.userHospitalId,
          });
          throw new Error('Hospital assignment mismatch. Please contact administrator.');
        }
        
        log.debug('User shift status before toggle', 'HEALTHCARE', {
          userId: ctx.user.id,
          currentStatus: currentUser.isOnDuty,
          shiftStartTime: currentUser.shiftStartTime,
          shiftEndTime: currentUser.shiftEndTime,
        });
        
        // Perform shift validations
        if (input.isOnDuty) {
          // Starting shift validations
          if (currentUser.isOnDuty) {
            throw new Error('You are already on duty. Please end your current shift first.');
          }
          
          // Check minimum break between shifts
          if (currentUser.shiftEndTime) {
            const hoursSinceLastShift = (now.getTime() - new Date(currentUser.shiftEndTime).getTime()) / (1000 * 60 * 60);
            log.debug('Checking break time between shifts', 'HEALTHCARE', {
              userId: ctx.user.id,
              lastShiftEnd: currentUser.shiftEndTime,
              hoursSinceLastShift,
              requiredBreak: MIN_BREAK_BETWEEN_SHIFTS_HOURS,
            });
            
            if (hoursSinceLastShift < MIN_BREAK_BETWEEN_SHIFTS_HOURS) {
              const remainingBreak = Math.ceil(MIN_BREAK_BETWEEN_SHIFTS_HOURS - hoursSinceLastShift);
              log.warn('Insufficient break between shifts', 'HEALTHCARE', {
                userId: ctx.user.id,
                hoursSinceLastShift,
                remainingBreakNeeded: remainingBreak,
              });
              throw new Error(`You need at least ${MIN_BREAK_BETWEEN_SHIFTS_HOURS} hours break between shifts. Please wait ${remainingBreak} more hour(s).`);
            }
          }
        } else {
          // Ending shift validations
          if (!currentUser.isOnDuty) {
            throw new Error('You are not currently on duty.');
          }
          
          // Check shift duration
          if (currentUser.shiftStartTime) {
            const shiftDurationHours = (now.getTime() - new Date(currentUser.shiftStartTime).getTime()) / (1000 * 60 * 60);
            if (shiftDurationHours > MAX_SHIFT_DURATION_HOURS) {
              log.warn('Shift exceeded maximum duration', 'HEALTHCARE', {
                userId: ctx.user.id,
                shiftDurationHours,
                maxAllowed: MAX_SHIFT_DURATION_HOURS,
              });
            }
          }
          
          // Check for active alerts - require handover notes if any exist
          const activeAlertCount = await db
            .select({ count: count() })
            .from(alerts)
            .where(
              and(
                eq(alerts.hospitalId, currentUser.hospitalId),
                eq(alerts.status, 'active')
              )
            )
            .then(result => result[0]?.count || 0);
          
          log.info('Active alerts check for shift end', 'HEALTHCARE', {
            userId: ctx.user.id,
            hospitalId: currentUser.hospitalId,
            activeAlertCount,
            hasHandoverNotes: !!input.handoverNotes,
          });
          
          if (activeAlertCount > 0 && !input.handoverNotes) {
            log.warn('Shift end blocked - active alerts without handover', 'HEALTHCARE', {
              userId: ctx.user.id,
              activeAlertCount,
            });
            throw new Error(`There are ${activeAlertCount} active alerts. Please provide handover notes for the incoming shift.`);
          }
        }
        
        // Update duty status
        await db
          .update(healthcareUsers)
          .set({
            isOnDuty: input.isOnDuty,
            shiftStartTime: input.isOnDuty ? now : currentUser.shiftStartTime,
            shiftEndTime: input.isOnDuty ? null : now,
          })
          .where(eq(healthcareUsers.userId, ctx.user.id));

        // Calculate shift duration for logging
        const shiftDurationMinutes = !input.isOnDuty && currentUser.shiftStartTime 
          ? Math.floor((now.getTime() - new Date(currentUser.shiftStartTime).getTime()) / 1000 / 60)
          : null;

        // Log audit event
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: input.isOnDuty ? 'shift_started' : 'shift_ended',
          entityType: 'user',
          entityId: ctx.user.id,
          hospitalId: currentUser.hospitalId,
          metadata: {
            shiftStartTime: input.isOnDuty ? now : currentUser.shiftStartTime,
            shiftEndTime: input.isOnDuty ? null : now,
            handoverNotes: input.handoverNotes,
            duration: shiftDurationMinutes,
            durationHours: shiftDurationMinutes ? Math.round(shiftDurationMinutes / 60 * 10) / 10 : null,
          },
          success: true,
        });
        
        log.info('Shift toggled successfully', 'HEALTHCARE', {
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          userRole: ctx.user.role,
          isOnDuty: input.isOnDuty,
          hospitalId: currentUser.hospitalId,
          action: input.isOnDuty ? 'shift_started' : 'shift_ended',
          durationMinutes: shiftDurationMinutes,
          durationHours: shiftDurationMinutes ? Math.round(shiftDurationMinutes / 60 * 10) / 10 : null,
          hasHandoverNotes: !!input.handoverNotes,
        });

        return {
          success: true,
          isOnDuty: input.isOnDuty,
          shiftDuration: shiftDurationMinutes,
          shiftDurationHours: shiftDurationMinutes ? Math.round(shiftDurationMinutes / 60 * 10) / 10 : null,
        };
      } catch (error) {
        log.error('Failed to toggle on-duty status', 'HEALTHCARE', {
          userId: ctx.user.id,
          action: input.isOnDuty ? 'start_shift' : 'end_shift',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error instanceof Error ? error : new Error('Failed to toggle shift status');
      }
    }),

  // Get detailed shift status with validations
  getShiftStatus: viewShiftStatusProcedure
    .query(async ({ ctx }) => {
      log.debug('Fetching shift status', 'HEALTHCARE', {
        userId: ctx.user.id,
        userRole: ctx.user.role,
      });
      
      try {
        const [healthcareUser] = await db
          .select()
          .from(healthcareUsers)
          .where(eq(healthcareUsers.userId, ctx.user.id))
          .limit(1);

        if (!healthcareUser) {
          return {
            isOnDuty: false,
            canStartShift: false,
            canEndShift: false,
            reason: 'Healthcare profile not found',
          };
        }

        const now = new Date();
        let canStartShift = true;
        let canEndShift = healthcareUser.isOnDuty;
        let startShiftReason = '';
        let endShiftReason = '';
        let shiftDurationHours = null;
        let hoursUntilCanStart = null;

        // Check if can start shift
        if (healthcareUser.isOnDuty) {
          canStartShift = false;
          startShiftReason = 'Already on duty';
        } else if (healthcareUser.shiftEndTime) {
          const hoursSinceLastShift = (now.getTime() - new Date(healthcareUser.shiftEndTime).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastShift < MIN_BREAK_BETWEEN_SHIFTS_HOURS) {
            canStartShift = false;
            hoursUntilCanStart = Math.ceil(MIN_BREAK_BETWEEN_SHIFTS_HOURS - hoursSinceLastShift);
            startShiftReason = `Need ${hoursUntilCanStart} more hour(s) of break`;
          }
        }

        // Check current shift duration
        if (healthcareUser.isOnDuty && healthcareUser.shiftStartTime) {
          shiftDurationHours = (now.getTime() - new Date(healthcareUser.shiftStartTime).getTime()) / (1000 * 60 * 60);
          if (shiftDurationHours > MAX_SHIFT_DURATION_HOURS) {
            endShiftReason = `Shift exceeded maximum ${MAX_SHIFT_DURATION_HOURS} hours`;
          }
        }

        // Get active alerts count
        const activeAlertCount = await db
          .select({ count: count() })
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, healthcareUser.hospitalId),
              eq(alerts.status, 'active')
            )
          )
          .then(result => result[0]?.count || 0);

        const result = {
          isOnDuty: healthcareUser.isOnDuty,
          shiftStartTime: healthcareUser.shiftStartTime,
          shiftEndTime: healthcareUser.shiftEndTime,
          canStartShift,
          canEndShift,
          startShiftReason,
          endShiftReason,
          shiftDurationHours: shiftDurationHours ? Math.round(shiftDurationHours * 10) / 10 : null,
          hoursUntilCanStart,
          maxShiftDurationHours: MAX_SHIFT_DURATION_HOURS,
          minBreakHours: MIN_BREAK_BETWEEN_SHIFTS_HOURS,
          activeAlertCount,
          requiresHandover: activeAlertCount > 0,
        };
        
        log.debug('Shift status fetched', 'HEALTHCARE', {
          userId: ctx.user.id,
          ...result,
        });
        
        return result;
      } catch (error) {
        log.error('Failed to get shift status', 'HEALTHCARE', {
          userId: ctx.user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw new Error('Failed to get shift status');
      }
    }),

  // Get on-duty staff for a department
  getOnDutyStaff: healthcareProcedure
    .input(z.object({
      department: z.string().optional(),
      hospitalId: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Use user's hospital if not specified
        const hospitalId = input.hospitalId || ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital context required');
        }
        
        let conditions = [
          eq(healthcareUsers.isOnDuty, true),
          eq(healthcareUsers.hospitalId, hospitalId)
        ];
        
        if (input.department) {
          conditions.push(eq(healthcareUsers.department, input.department as any));
        }
        
        const onDutyStaff = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            image: users.image,
            department: healthcareUsers.department,
            specialization: healthcareUsers.specialization,
            shiftStartTime: healthcareUsers.shiftStartTime,
          })
          .from(healthcareUsers)
          .innerJoin(users, eq(healthcareUsers.userId, users.id))
          .where(and(...conditions));
        
        return {
          staff: onDutyStaff,
          total: onDutyStaff.length,
        };
      } catch (error) {
        log.error('Failed to get on-duty staff', 'HEALTHCARE', error);
        throw new Error('Failed to get on-duty staff');
      }
    }),

  // Get escalation status for an alert
  getEscalationStatus: viewAlertsProcedure
    .input(z.object({
      alertId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        const status = await escalationTimerService.getEscalationStatus(input.alertId);
        return status;
      } catch (error) {
        log.error('Failed to get escalation status', 'HEALTHCARE', error);
        throw new Error('Failed to get escalation status');
      }
    }),

  // Get single alert details
  getAlert: viewAlertsProcedure
    .input(z.object({
      alertId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        const [alert] = await db
          .select({
            id: alerts.id,
            alertType: alerts.alertType,
            urgencyLevel: alerts.urgencyLevel,
            roomNumber: alerts.roomNumber,
            // Removed patientName as it doesn't exist in alerts table
            patientId: alerts.patientId,
            description: alerts.description,
            status: alerts.status,
            hospitalId: alerts.hospitalId,
            createdAt: alerts.createdAt,
            createdBy: alerts.createdBy,
            acknowledgedBy: alerts.acknowledgedBy,
            acknowledgedAt: alerts.acknowledgedAt,
            resolvedBy: alerts.acknowledgedBy,
            resolvedAt: alerts.resolvedAt,
            creatorName: users.name,
            currentEscalationTier: alerts.currentEscalationTier,
            nextEscalationAt: alerts.nextEscalationAt,
            targetDepartment: alerts.targetDepartment,
          })
          .from(alerts)
          .leftJoin(users, eq(alerts.createdBy, users.id))
          .where(eq(alerts.id, input.alertId))
          .limit(1);

        if (!alert) {
          throw new Error('Alert not found');
        }

        // Get escalation history for the alert
        const escalations = await db
          .select({
            id: alertEscalations.id,
            alertId: alertEscalations.alertId,
            from_role: alertEscalations.from_role,
            to_role: alertEscalations.to_role,
            escalatedAt: alertEscalations.escalatedAt,
            reason: alertEscalations.reason,
          })
          .from(alertEscalations)
          .where(eq(alertEscalations.alertId, input.alertId))
          .orderBy(asc(alertEscalations.escalatedAt));

        return {
          ...alert,
          escalations,
        };
      } catch (error) {
        log.error('Failed to get alert', 'HEALTHCARE', error);
        throw new Error('Failed to get alert details');
      }
    }),

  // Removed duplicate getOnDutyStaff definition

  // Get escalation history for an alert
  getEscalationHistory: viewAlertsProcedure
    .input(z.object({
      alertId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        const escalations = await db
          .select({
            escalation: alertEscalations,
            alertInfo: {
              id: alerts.id,
              roomNumber: alerts.roomNumber,
              alertType: alerts.alertType,
            },
          })
          .from(alertEscalations)
          .leftJoin(alerts, eq(alertEscalations.alertId, alerts.id))
          .where(eq(alertEscalations.alertId, input.alertId))
          .orderBy(desc(alertEscalations.escalatedAt));

        return {
          escalations,
          total: escalations.length,
        };
      } catch (error) {
        log.error('Failed to get escalation history', 'HEALTHCARE', error);
        throw new Error('Failed to get escalation history');
      }
    }),

  // Manually trigger escalation (admin only)
  triggerEscalation: adminProcedure
    .input(z.object({
      alertId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await escalationTimerService.triggerEscalation(input.alertId);
        
        // Log manual escalation
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'manual_escalation',
          entityType: 'alert',
          entityId: input.alertId,
          hospitalId: ctx.hospitalContext?.userOrganizationId,
          metadata: result,
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        return result;
      } catch (error) {
        log.error('Failed to trigger manual escalation', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Get active escalations summary for dashboard
  getActiveEscalations: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        // Get all active alerts with their escalation status
        const activeAlerts = await db
          .select({
            id: alerts.id,
            roomNumber: alerts.roomNumber,
            alertType: alerts.alertType,
            urgencyLevel: alerts.urgencyLevel,
            currentEscalationTier: alerts.currentEscalationTier,
            nextEscalationAt: alerts.nextEscalationAt,
            createdAt: alerts.createdAt,
            acknowledgedAt: alerts.acknowledgedAt,
          })
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, input.hospitalId),
              eq(alerts.status, 'active')
            )
          )
          .orderBy(desc(alerts.currentEscalationTier), desc(alerts.urgencyLevel));

        // Calculate time until next escalation for each alert
        const alertsWithTiming = activeAlerts.map(alert => {
          const timeUntilEscalation = alert.nextEscalationAt
            ? Math.max(0, alert.nextEscalationAt.getTime() - Date.now())
            : null;

          return {
            ...alert,
            timeUntilEscalation,
            isOverdue: timeUntilEscalation === 0,
            minutesUntilEscalation: timeUntilEscalation ? Math.ceil(timeUntilEscalation / 60000) : null,
          };
        });

        // Group by escalation tier
        const byTier = alertsWithTiming.reduce((acc, alert) => {
          const tier = alert.currentEscalationTier;
          if (!acc[tier]) {
            acc[tier] = [];
          }
          acc[tier].push(alert);
          return acc;
        }, {} as Record<number, typeof alertsWithTiming>);

        return {
          totalActive: activeAlerts.length,
          byTier,
          overdue: alertsWithTiming.filter(a => a.isOverdue).length,
          nextEscalationIn5Minutes: alertsWithTiming.filter(
            a => a.minutesUntilEscalation && a.minutesUntilEscalation <= 5
          ).length,
        };
      } catch (error) {
        log.error('Failed to get active escalations', 'HEALTHCARE', error);
        throw new Error('Failed to get active escalations');
      }
    }),

  // Get metrics for dashboard - use healthcare procedure for broader access
  getMetrics: healthcareProcedure
    .use(async ({ ctx, next }) => {
      // Apply rate limiting
      const { healthcareRateLimiters } = await import('../middleware/rate-limiter');
      return healthcareRateLimiters.getMetrics({ ctx, next });
    })
    .input(z.object({
      timeRange: z.enum(['1h', '6h', '24h', '7d']).default('24h'),
      department: z.string().default('all').refine((val) => val !== 'undefined', {
        message: 'Department cannot be "undefined"',
      }),
    }))
    .query(async ({ input }) => {
      try {
        // Mock metrics data (in a real app, this would aggregate from database)
        const activeAlerts = Math.floor(Math.random() * 10) + 5;
        const staffOnline = Math.floor(Math.random() * 20) + 15;
        
        const metrics = {
          // Primary metrics
          activeAlerts,
          alertsTrend: Math.random() > 0.5 ? Math.floor(Math.random() * 20) - 10 : 0,
          alertCapacity: 50,
          
          // Response times
          avgResponseTime: parseFloat((Math.random() * 5 + 1).toFixed(1)),
          
          // Staff metrics
          staffOnline,
          totalStaff: 30,
          minStaffRequired: 15,
          
          // Alert breakdown
          criticalAlerts: Math.floor(activeAlerts * 0.2),
          urgentAlerts: Math.floor(activeAlerts * 0.3),
          standardAlerts: Math.floor(activeAlerts * 0.5),
          resolvedToday: Math.floor(Math.random() * 20) + 10,
          
          // Department stats
          departmentStats: [
            { id: 'emergency', name: 'Emergency', alerts: 3, responseRate: 0.95 },
            { id: 'icu', name: 'ICU', alerts: 2, responseRate: 0.98 },
            { id: 'cardiology', name: 'Cardiology', alerts: 1, responseRate: 0.92 },
            { id: 'general', name: 'General', alerts: 4, responseRate: 0.88 },
          ],
        };
        
        log.info('Metrics fetched', 'HEALTHCARE', {
          timeRange: input.timeRange,
          department: input.department,
        });
        
        return metrics;
      } catch (error) {
        log.error('Failed to fetch metrics', 'HEALTHCARE', error);
        throw new Error('Failed to fetch metrics');
      }
    }),
    
  // Get alert timeline - full lifecycle events
  getAlertTimeline: viewAlertsProcedure
    .input(z.object({
      alertId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        // Get the main alert details with proper aliases
        const creatorUser = aliasedTable(users, 'creatorUser');
        const acknowledgedByUser = aliasedTable(users, 'acknowledgedByUser');
        
        const [alert] = await db
          .select({
            alert: alerts,
            creator: {
              id: creatorUser.id,
              name: creatorUser.name,
              email: creatorUser.email,
            },
            acknowledgedBy: {
              id: acknowledgedByUser.id,
              name: acknowledgedByUser.name,
              email: acknowledgedByUser.email,
            },
          })
          .from(alerts)
          .leftJoin(creatorUser, eq(alerts.createdBy, creatorUser.id))
          .leftJoin(acknowledgedByUser, eq(alerts.acknowledgedBy, acknowledgedByUser.id))
          .where(eq(alerts.id, input.alertId))
          .limit(1);

        if (!alert) {
          throw new Error('Alert not found');
        }

        // Get all timeline events
        const timelineEvents = await db
          .select({
            event: alertTimelineEvents,
            user: {
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
            },
          })
          .from(alertTimelineEvents)
          .leftJoin(users, eq(alertTimelineEvents.userId, users.id))
          .where(eq(alertTimelineEvents.alertId, input.alertId))
          .orderBy(asc(alertTimelineEvents.eventTime));

        // Get all acknowledgments
        const acknowledgments = await db
          .select({
            acknowledgment: alertAcknowledgments,
            user: {
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
            },
          })
          .from(alertAcknowledgments)
          .leftJoin(users, eq(alertAcknowledgments.userId, users.id))
          .where(eq(alertAcknowledgments.alertId, input.alertId))
          .orderBy(asc(alertAcknowledgments.acknowledgedAt));

        // Get all escalations
        const escalations = await db
          .select()
          .from(alertEscalations)
          .where(eq(alertEscalations.alertId, input.alertId))
          .orderBy(asc(alertEscalations.escalatedAt));

        // Combine into a unified timeline
        const timeline = [
          // Created event
          {
            type: 'created',
            time: alert.alert.createdAt,
            user: alert.creator,
            data: {
              roomNumber: alert.alert.roomNumber,
              alertType: alert.alert.alertType,
              urgencyLevel: alert.alert.urgencyLevel,
              description: alert.alert.description,
            },
          },
          // Timeline events
          ...timelineEvents.map(e => ({
            type: e.event.eventType,
            time: e.event.eventTime,
            user: e.user,
            data: {
              description: e.event.description,
              metadata: e.event.metadata,
            },
          })),
          // Acknowledgments
          ...acknowledgments.map(a => ({
            type: 'acknowledged',
            time: a.acknowledgment.acknowledgedAt,
            user: a.user,
            data: {
              responseTimeSeconds: a.acknowledgment.responseTimeSeconds,
              notes: a.acknowledgment.notes,
            },
          })),
          // Escalations
          ...escalations.map(e => ({
            type: 'escalated',
            time: e.escalatedAt,
            user: null,
            data: {
              fromRole: e.from_role,
              toRole: e.to_role,
              reason: e.reason,
            },
          })),
          // Resolved event
          ...(alert.alert.resolvedAt ? [{
            type: 'resolved',
            time: alert.alert.resolvedAt,
            user: alert.acknowledgedBy,
            data: {
              description: alert.alert.description,
            },
          }] : []),
        ].sort((a, b) => a.time.getTime() - b.time.getTime());

        return {
          alert: alert.alert,
          timeline,
          totalEvents: timeline.length,
          responseTime: alert.alert.acknowledgedAt 
            ? Math.floor((alert.alert.acknowledgedAt.getTime() - alert.alert.createdAt.getTime()) / 1000)
            : null,
          resolutionTime: alert.alert.resolvedAt
            ? Math.floor((alert.alert.resolvedAt.getTime() - alert.alert.createdAt.getTime()) / 1000)
            : null,
        };
      } catch (error) {
        log.error('Failed to fetch alert timeline', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Bulk acknowledge alerts
  bulkAcknowledgeAlerts: doctorProcedure
    .input(z.object({
      alertIds: z.array(z.string().uuid()),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const results = [];
        
        for (const alertId of input.alertIds) {
          try {
            // Get the alert
            const [alert] = await db
              .select()
              .from(alerts)
              .where(eq(alerts.id, alertId))
              .limit(1);

            if (!alert || alert.status !== 'active') {
              results.push({
                alertId,
                success: false,
                error: 'Alert not found or not active',
              });
              continue;
            }

            // Calculate response time
            const responseTimeSeconds = Math.floor(
              (Date.now() - alert.createdAt.getTime()) / 1000
            );

            // Update alert status
            await db
              .update(alerts)
              .set({
                status: 'acknowledged',
                acknowledgedBy: ctx.user.id,
                acknowledgedAt: new Date(),
              })
              .where(eq(alerts.id, alertId));

            // Create acknowledgment record
            await db.insert(alertAcknowledgments).values({
              alertId,
              userId: ctx.user.id,
              responseTimeSeconds,
              notes: input.notes,
            });

            // Create timeline event
            await db.insert(alertTimelineEvents).values({
              alertId,
              eventType: 'acknowledged',
              userId: ctx.user.id,
              description: `Bulk acknowledged with ${input.alertIds.length - 1} other alerts`,
              metadata: {
                bulkOperation: true,
                totalAlerts: input.alertIds.length,
              },
            });

            results.push({
              alertId,
              success: true,
              responseTimeSeconds,
            });
          } catch (error) {
            results.push({
              alertId,
              success: false,
              error: error.message,
            });
          }
        }

        // Log bulk operation
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'bulk_alert_acknowledged',
          entityType: 'alert',
          entityId: input.alertIds[0], // Use first alert ID as reference
          hospitalId: ctx.hospitalContext?.userHospitalId || ctx.hospitalContext?.userOrganizationId,
          metadata: {
            alertIds: input.alertIds,
            successCount: results.filter(r => r.success).length,
            failureCount: results.filter(r => !r.success).length,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        return {
          results,
          summary: {
            total: input.alertIds.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        };
      } catch (error) {
        log.error('Failed to bulk acknowledge alerts', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Transfer alert to another user
  transferAlert: doctorProcedure
    .input(z.object({
      alertId: z.string().uuid(),
      toUserId: z.string().uuid(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the alert
        const [alert] = await db
          .select()
          .from(alerts)
          .where(eq(alerts.id, input.alertId))
          .limit(1);

        if (!alert) {
          throw new Error('Alert not found');
        }

        if (alert.acknowledgedBy !== ctx.user.id) {
          throw new Error('You can only transfer alerts you have acknowledged');
        }

        // Update alert with new acknowledged user
        await db
          .update(alerts)
          .set({
            acknowledgedBy: input.toUserId,
            handoverNotes: input.reason,
          })
          .where(eq(alerts.id, input.alertId));

        // Create timeline event
        await db.insert(alertTimelineEvents).values({
          alertId: input.alertId,
          eventType: 'transferred',
          userId: ctx.user.id,
          description: input.reason,
          metadata: {
            fromUserId: ctx.user.id,
            toUserId: input.toUserId,
          },
        });

        // Log the transfer
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'alert_transferred',
          entityType: 'alert',
          entityId: input.alertId,
          hospitalId: alert.hospitalId,
          metadata: {
            fromUserId: ctx.user.id,
            toUserId: input.toUserId,
            reason: input.reason,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });

        // Emit transfer event
        await alertEventHelpers.emitAlertUpdated(
          input.alertId,
          alert.hospitalId,
          {
            transferred: true,
            fromUserId: ctx.user.id,
            toUserId: input.toUserId,
          }
        );

        return {
          success: true,
          transferredTo: input.toUserId,
        };
      } catch (error) {
        log.error('Failed to transfer alert', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Get alert analytics
  getAlertAnalytics: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
      startDate: z.date(),
      endDate: z.date(),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .query(async ({ input }) => {
      try {
        // Get alerts within date range
        const alertsInRange = await db
          .select()
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, input.hospitalId),
              gte(alerts.createdAt, input.startDate),
              lte(alerts.createdAt, input.endDate)
            )
          );

        // Calculate metrics
        const totalAlerts = alertsInRange.length;
        const acknowledgedAlerts = alertsInRange.filter(a => a.acknowledgedAt).length;
        const resolvedAlerts = alertsInRange.filter(a => a.resolvedAt).length;
        const escalatedAlerts = alertsInRange.filter(a => a.escalationLevel > 1).length;

        // Calculate average response times
        const responseTimes = alertsInRange
          .filter(a => a.acknowledgedAt)
          .map(a => (a.acknowledgedAt!.getTime() - a.createdAt.getTime()) / 1000);
        
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        // Group by alert type
        const byAlertType = alertsInRange.reduce((acc, alert) => {
          if (!acc[alert.alertType]) {
            acc[alert.alertType] = {
              total: 0,
              acknowledged: 0,
              avgResponseTime: 0,
              responseTimes: [],
            };
          }
          acc[alert.alertType].total++;
          if (alert.acknowledgedAt) {
            acc[alert.alertType].acknowledged++;
            const responseTime = (alert.acknowledgedAt.getTime() - alert.createdAt.getTime()) / 1000;
            acc[alert.alertType].responseTimes.push(responseTime);
          }
          return acc;
        }, {} as Record<string, any>);

        // Calculate average response times by type
        Object.keys(byAlertType).forEach(type => {
          const times = byAlertType[type].responseTimes;
          byAlertType[type].avgResponseTime = times.length > 0
            ? times.reduce((a: number, b: number) => a + b, 0) / times.length
            : 0;
          delete byAlertType[type].responseTimes; // Clean up temporary array
        });

        // Group by urgency level
        const byUrgency = alertsInRange.reduce((acc, alert) => {
          if (!acc[alert.urgencyLevel]) {
            acc[alert.urgencyLevel] = {
              total: 0,
              acknowledged: 0,
              escalated: 0,
            };
          }
          acc[alert.urgencyLevel].total++;
          if (alert.acknowledgedAt) acc[alert.urgencyLevel].acknowledged++;
          if (alert.escalationLevel > 1) acc[alert.urgencyLevel].escalated++;
          return acc;
        }, {} as Record<number, any>);

        // Time series data
        const timeSeries = await generateTimeSeries(
          alertsInRange,
          input.startDate,
          input.endDate,
          input.groupBy
        );

        return {
          summary: {
            totalAlerts,
            acknowledgedAlerts,
            resolvedAlerts,
            escalatedAlerts,
            acknowledgmentRate: totalAlerts > 0 ? (acknowledgedAlerts / totalAlerts) * 100 : 0,
            resolutionRate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0,
            escalationRate: totalAlerts > 0 ? (escalatedAlerts / totalAlerts) * 100 : 0,
            avgResponseTime: Math.round(avgResponseTime),
          },
          byAlertType,
          byUrgency,
          timeSeries,
        };
      } catch (error) {
        log.error('Failed to fetch alert analytics', 'HEALTHCARE', error);
        throw error;
      }
    }),

  // Get active alerts with more details
  getActiveAlertsDetailed: viewAlertsProcedure
    .input(z.object({
      includeResolved: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Mock enhanced alert data
        const mockAlerts = [
          {
            id: 'alert-1',
            roomNumber: '302',
            alertType: 'cardiac' as const,
            urgency: 5,
            description: 'Patient experiencing chest pain',
            status: 'active' as const,
            createdAt: new Date(Date.now() - 5 * 60 * 1000),
            createdBy: 'user-1',
            createdByName: 'Operator Smith',
            hospitalId: 'hospital-1',
            acknowledged: false,
            acknowledgedAt: null,
            acknowledgedBy: null,
            acknowledgedByName: null,
            resolved: false,
            resolvedAt: null,
            resolvedBy: null,
            resolvedByName: null,
          },
          {
            id: 'alert-2',
            roomNumber: '215',
            alertType: 'fall' as const,
            urgency: 3,
            description: 'Patient fall detected',
            status: 'acknowledged' as const,
            createdAt: new Date(Date.now() - 15 * 60 * 1000),
            createdBy: 'user-2',
            createdByName: 'Operator Johnson',
            hospitalId: 'hospital-1',
            acknowledged: true,
            acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000),
            acknowledgedBy: 'user-3',
            acknowledgedByName: 'Nurse Davis',
            resolved: false,
            resolvedAt: null,
            resolvedBy: null,
            resolvedByName: null,
          },
        ];
        
        const alerts = mockAlerts.filter(alert => 
          !alert.resolved || input.includeResolved
        );
        
        return {
          alerts,
          total: alerts.length,
        };
      } catch (error) {
        log.error('Failed to fetch active alerts', 'HEALTHCARE', error);
        throw new Error('Failed to fetch active alerts');
      }
    }),

  // Subscribe to alerts (real-time implementation)
  subscribeToAlerts: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
      lastEventId: z.string().optional(), // For reconnection support
    }).optional())
    .subscription(async function* ({ input, ctx }) {
      const hospitalId = input?.hospitalId || ctx.hospitalContext?.userHospitalId || ctx.hospitalContext?.userOrganizationId;
      
      if (!hospitalId) {
        throw new Error('Hospital ID is required for alert subscription');
      }
      
      log.info('Alert subscription started', 'HEALTHCARE', {
        userId: ctx.user.id,
        hospitalId,
      });
      
      // Use the tracked subscription for reconnection support
      const subscription = trackedHospitalAlerts(hospitalId, input?.lastEventId);
      
      try {
        for await (const event of subscription) {
          // Transform the event for the client
          yield {
            id: `event-${Date.now()}`,
            type: event.type,
            alertId: event.alertId,
            hospitalId: event.hospitalId,
            timestamp: event.timestamp,
            data: event.data,
          };
        }
      } catch (error) {
        log.error('Alert subscription error', 'HEALTHCARE', error);
        throw error;
      } finally {
        log.info('Alert subscription ended', 'HEALTHCARE', {
          userId: ctx.user.id,
          hospitalId,
        });
      }
    }),
    
  // Subscribe to metrics (real-time implementation) 
  subscribeToMetrics: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
      interval: z.number().min(1000).max(60000).default(5000), // Update interval in ms
    }).optional())
    .subscription(async function* ({ input, ctx }) {
      const hospitalId = input?.hospitalId || ctx.hospitalContext?.userHospitalId || ctx.hospitalContext?.userOrganizationId;
      const interval = input?.interval || 5000;
      
      if (!hospitalId) {
        throw new Error('Hospital ID is required for metrics subscription');
      }
      
      log.info('Metrics subscription started', 'HEALTHCARE', {
        userId: ctx.user.id,
        hospitalId,
        interval,
      });
      
      try {
        while (true) {
          // Fetch real metrics from database
          const [activeAlertsCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(alerts)
            .where(
              and(
                eq(alerts.hospitalId, hospitalId),
                or(
                  eq(alerts.status, 'active'),
                  eq(alerts.status, 'acknowledged')
                )
              )
            );
          
          const [staffOnlineCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(healthcareUsers)
            .where(
              and(
                eq(healthcareUsers.hospitalId, hospitalId),
                eq(healthcareUsers.isOnDuty, true)
              )
            );
          
          // Calculate response rate (last hour)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const [recentAlerts] = await db
            .select({
              total: sql<number>`count(*)`,
              acknowledged: sql<number>`count(case when acknowledged_at is not null then 1 end)`
            })
            .from(alerts)
            .where(
              and(
                eq(alerts.hospitalId, hospitalId),
                gte(alerts.createdAt, oneHourAgo)
              )
            );
          
          const responseRate = recentAlerts.total > 0 
            ? (recentAlerts.acknowledged / recentAlerts.total) 
            : 1;
          
          // Get critical alerts count
          const [criticalCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(alerts)
            .where(
              and(
                eq(alerts.hospitalId, hospitalId),
                eq(alerts.status, 'active'),
                gte(alerts.urgencyLevel, 4)
              )
            );
          
          yield {
            timestamp: new Date(),
            activeAlerts: activeAlertsCount.count || 0,
            criticalAlerts: criticalCount.count || 0,
            staffOnline: staffOnlineCount.count || 0,
            responseRate: parseFloat(responseRate.toFixed(2)),
            avgResponseTime: await calculateAvgResponseTime(hospitalId, oneHourAgo),
          };
          
          // Wait for next update
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        log.error('Metrics subscription error', 'HEALTHCARE', error);
        throw error;
      } finally {
        log.info('Metrics subscription ended', 'HEALTHCARE', {
          userId: ctx.user.id,
          hospitalId,
        });
      }
    }),
    
  // Acknowledge patient alert (for patient card)
  acknowledgePatientAlert: doctorProcedure
    .input(z.object({
      alertId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // In a real app, this would update the database
        log.info('Patient alert acknowledged', 'HEALTHCARE', {
          alertId: input.alertId,
          userId: ctx.user.id,
        });
        
        return {
          success: true,
          alertId: input.alertId,
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.user.id,
        };
      } catch (error) {
        log.error('Failed to acknowledge patient alert', 'HEALTHCARE', error);
        throw new Error('Failed to acknowledge patient alert');
      }
    }),

  // Removed duplicate subscribeToAlerts and subscribeToMetrics definitions

  // Get active alerts with organization data
  getActiveAlertsWithOrg: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { hospitalId, limit, offset } = input;
      
      try {
        // Validate hospitalId is not empty
        if (!hospitalId) {
          throw new Error('Hospital ID is required');
        }
        
        // Log the query for debugging
        log.info('Fetching active alerts with org', 'HEALTHCARE', {
          hospitalId,
          limit,
          offset,
          userId: ctx.user.id
        });
        
        // Get active alerts with proper hospital and organization data
        const activeAlerts = await db
          .select({
            id: alerts.id,
            alertType: alerts.alertType,
            urgencyLevel: alerts.urgencyLevel,
            roomNumber: alerts.roomNumber,
            patientId: alerts.patientId,
            patientName: sql<string>`COALESCE('Patient ' || ${alerts.patientId}, 'Unknown')`,
            description: alerts.description,
            status: alerts.status,
            hospitalId: alerts.hospitalId,
            createdAt: alerts.createdAt,
            createdBy: alerts.createdBy,
            createdByName: users.name,
            acknowledgedBy: alerts.acknowledgedBy,
            acknowledgedByName: sql<string | null>`NULL`,
            acknowledgedAt: alerts.acknowledgedAt,
            currentEscalationTier: alerts.currentEscalationTier,
            nextEscalationAt: alerts.nextEscalationAt,
            escalationLevel: alerts.escalationLevel,
            resolvedAt: alerts.resolvedAt,
            organizationId: hospitals.organizationId,
            organizationName: organization.name,
          })
          .from(alerts)
          .leftJoin(users, eq(alerts.createdBy, users.id))
          .leftJoin(hospitals, eq(alerts.hospitalId, hospitals.id))
          .leftJoin(organization, eq(hospitals.organizationId, organization.id))
          .where(
            and(
              eq(alerts.hospitalId, hospitalId),
              or(
                eq(alerts.status, 'active'),
                eq(alerts.status, 'acknowledged')
              )
            )
          )
          .orderBy(desc(alerts.urgencyLevel), desc(alerts.createdAt))
          .limit(limit)
          .offset(offset);

        // Log successful query
        log.info('Active alerts fetched successfully', 'HEALTHCARE', {
          hospitalId,
          alertCount: activeAlerts.length
        });

        return {
          alerts: activeAlerts,
          total: activeAlerts.length,
        };
      } catch (error) {
        log.error('Failed to fetch active alerts with org data', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          hospitalId,
          userId: ctx.user.id
        });
        throw new Error(`Failed to fetch active alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get organization-specific alert statistics
  getOrganizationAlertStats: viewAlertsProcedure
    .input(z.object({
      organizationId: z.string(),
      timeRange: z.enum(['today', 'week', 'month']).default('today'),
    }))
    .query(async ({ input, ctx }) => {
      const { organizationId, timeRange } = input;
      
      try {
        let startDate: Date;
        const now = new Date();
        
        switch (timeRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        }

        // Get organization alerts
        const orgAlerts = await db
          .select({
            id: alerts.id,
            urgencyLevel: alerts.urgencyLevel,
            status: alerts.status,
            createdAt: alerts.createdAt,
            acknowledgedAt: alerts.acknowledgedAt,
            resolvedAt: alerts.resolvedAt,
          })
          .from(alerts)
          .leftJoin(users, eq(alerts.createdBy, users.id))
          .where(
            and(
              eq(users.organizationId, organizationId),
              gte(alerts.createdAt, startDate)
            )
          );

        // Calculate statistics
        const totalAlerts = orgAlerts.length;
        const resolvedAlerts = orgAlerts.filter(a => a.status === 'resolved').length;
        const acknowledgedAlerts = orgAlerts.filter(a => a.acknowledgedAt).length;
        
        // Calculate average response time
        const responseTimes = orgAlerts
          .filter(a => a.acknowledgedAt)
          .map(a => {
            if (!a.acknowledgedAt) return 0;
            return (new Date(a.acknowledgedAt).getTime() - new Date(a.createdAt).getTime()) / 60000; // in minutes
          });
        
        const avgResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;

        const resolutionRate = totalAlerts > 0
          ? Math.round((resolvedAlerts / totalAlerts) * 100)
          : 100;

        return {
          totalAlerts,
          resolvedAlerts,
          acknowledgedAlerts,
          avgResponseTime,
          resolutionRate,
        };
      } catch (error) {
        log.error('Failed to fetch organization alert stats', 'HEALTHCARE', error);
        throw new Error('Failed to fetch organization alert statistics');
      }
    }),

  // Get single alert by ID
  getAlertById: viewAlertsProcedure
    .input(z.object({
      alertId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const { alertId } = input;
      
      try {
        // Create aliases for user tables
        const creatorUser = aliasedTable(users, 'creatorUser');
        const acknowledgedUser = aliasedTable(users, 'acknowledgedUser');
        const resolvedUser = aliasedTable(users, 'resolvedUser');
        
        const [alert] = await db
          .select({
            id: alerts.id,
            alertType: alerts.alertType,
            urgencyLevel: alerts.urgencyLevel,
            roomNumber: alerts.roomNumber,
            patientId: alerts.patientId,
            description: alerts.description,
            status: alerts.status,
            hospitalId: alerts.hospitalId,
            createdAt: alerts.createdAt,
            createdBy: alerts.createdBy,
            createdByName: creatorUser.name,
            acknowledged: sql<boolean>`${alerts.acknowledgedAt} IS NOT NULL`,
            acknowledgedBy: alerts.acknowledgedBy,
            acknowledgedByName: acknowledgedUser.name,
            acknowledgedAt: alerts.acknowledgedAt,
            resolved: sql<boolean>`${alerts.resolvedAt} IS NOT NULL`,
            resolvedBy: alerts.acknowledgedBy,
            resolvedByName: resolvedUser.name,
            resolvedAt: alerts.resolvedAt,
            currentEscalationTier: alerts.currentEscalationTier,
            escalationLevel: alerts.escalationLevel,
            nextEscalationAt: alerts.nextEscalationAt,
          })
          .from(alerts)
          .leftJoin(creatorUser, eq(alerts.createdBy, creatorUser.id))
          .leftJoin(acknowledgedUser, eq(alerts.acknowledgedBy, acknowledgedUser.id))
          .leftJoin(resolvedUser, eq(alerts.acknowledgedBy, resolvedUser.id))
          .where(eq(alerts.id, alertId))
          .limit(1);
        
        if (!alert) {
          throw new Error('Alert not found');
        }
        
        return alert;
      } catch (error) {
        log.error('Failed to fetch alert by ID', 'HEALTHCARE', error);
        throw new Error('Failed to fetch alert details');
      }
    }),

  // Get patients for a healthcare professional
  getMyPatients: protectedProcedure
    .input(patientSchemas.patientFilters)
    .query(async ({ input, ctx }) => {
      try {
        // Check permissions
        const userRole = (ctx.user as any).role || 'user';
        if (!permissionValidators.canViewPatientData(userRole)) {
          throw new TRPCError({ 
            code: 'FORBIDDEN',
            message: 'You do not have permission to view patient data'
          });
        }

        // Log context for debugging
        log.info('getMyPatients called', 'HEALTHCARE', {
          inputHospitalId: input.hospitalId,
          userId: ctx.user?.id,
          userRole,
          filters: input,
        });

        // Build query conditions
        const conditions = [
          eq(patients.hospitalId, input.hospitalId),
        ];

        // Add status filter (using isActive field)
        if (input.status === 'admitted') {
          conditions.push(eq(patients.isActive, true));
        } else if (input.status === 'discharged') {
          conditions.push(eq(patients.isActive, false));
        }

        // Add department filter
        if (input.department) {
          // Get department ID from department name
          const [dept] = await db
            .select({ id: departments.id })
            .from(departments)
            .where(and(
              eq(departments.hospitalId, input.hospitalId),
              eq(departments.name, input.department)
            ))
            .limit(1);
          
          if (dept) {
            conditions.push(eq(patients.departmentId, dept.id));
          }
        }

        // Role-based filtering
        if (userRole === 'doctor') {
          conditions.push(eq(patients.primaryDoctorId, ctx.user.id));
        } else if (userRole === 'nurse') {
          conditions.push(eq(patients.attendingNurseId, ctx.user.id));
        }
        // Head doctors and admins see all patients in the hospital

        // Execute query
        const patientsQuery = await db
          .select()
          .from(patients)
          .where(and(...conditions))
          .orderBy(desc(patients.admissionDate))
          .limit(input.limit || 20)
          .offset(input.offset || 0);

        // Get total count
        const [{ count: totalCount }] = await db
          .select({ count: count() })
          .from(patients)
          .where(and(...conditions));

        // Search query filter (done in memory for simplicity)
        let filteredPatients = patientsQuery;
        if (input.searchQuery) {
          const query = input.searchQuery.toLowerCase();
          filteredPatients = patientsQuery.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.roomNumber.toLowerCase().includes(query) ||
            p.mrn.toLowerCase().includes(query)
          );
        }

        return {
          patients: filteredPatients,
          total: Number(totalCount),
          limit: input.limit || 20,
          offset: input.offset || 0,
        };
      } catch (error) {
        log.error('Failed to fetch patients', 'HEALTHCARE', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch patient list',
        });
      }
    }),

  // Create a new patient
  createPatient: protectedProcedure
    .input(patientSchemas.createPatient)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check permissions
        const userRole = (ctx.user as any).role || 'user';
        if (!['doctor', 'head_doctor', 'admin'].includes(userRole)) {
          throw new TRPCError({ 
            code: 'FORBIDDEN',
            message: 'Only doctors can register new patients'
          });
        }

        // Get hospital info for MRN generation
        const [hospital] = await db
          .select({ code: hospitals.code })
          .from(hospitals)
          .where(eq(hospitals.id, input.hospitalId))
          .limit(1);

        if (!hospital) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Hospital not found',
          });
        }

        // Generate medical record number
        const mrn = patientValidation.generateMedicalRecordNumber(hospital.code);

        // Get department ID if department name provided
        let departmentId = null;
        if (input.department) {
          const [dept] = await db
            .select({ id: departments.id })
            .from(departments)
            .where(and(
              eq(departments.hospitalId, input.hospitalId),
              eq(departments.name, input.department)
            ))
            .limit(1);
          departmentId = dept?.id || null;
        }

        // Create patient
        const [patient] = await db.insert(patients).values({
          hospitalId: input.hospitalId,
          mrn,
          name: input.name,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          roomNumber: input.roomNumber,
          departmentId,
          primaryDoctorId: ctx.user.id,
          attendingNurseId: null,
          isActive: true,
          admissionDate: new Date(),
          primaryDiagnosis: input.diagnosis,
          emergencyContact: input.emergencyContact,
        }).returning();

        log.info('Patient created', 'HEALTHCARE', {
          patientId: patient.id,
          mrn: patient.mrn,
          createdBy: ctx.user.id,
        });

        return { patient, success: true };
      } catch (error) {
        log.error('Failed to create patient', 'HEALTHCARE', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create patient',
        });
      }
    }),

  // Get patient by ID
  getPatientById: protectedProcedure
    .input(z.object({
      patientId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check permissions
        const userRole = (ctx.user as any).role || 'user';
        if (!permissionValidators.canViewPatientData(userRole)) {
          throw new TRPCError({ 
            code: 'FORBIDDEN',
            message: 'You do not have permission to view patient data'
          });
        }

        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.id, input.patientId))
          .limit(1);

        if (!patient) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Patient not found',
          });
        }

        // Role-based access check
        if (userRole === 'doctor' && patient.primaryDoctorId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your assigned patients',
          });
        }
        if (userRole === 'nurse' && patient.attendingNurseId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view patients assigned to you',
          });
        }

        return { patient };
      } catch (error) {
        log.error('Failed to fetch patient details', 'HEALTHCARE', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch patient details',
        });
      }
    }),

  // Update patient information
  updatePatient: protectedProcedure
    .input(z.object({
      patientId: z.string().uuid(),
      updates: patientSchemas.updatePatient,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check permissions
        const userRole = (ctx.user as any).role || 'user';
        if (!['doctor', 'head_doctor', 'nurse', 'admin'].includes(userRole)) {
          throw new TRPCError({ 
            code: 'FORBIDDEN',
            message: 'You do not have permission to update patient data'
          });
        }

        // Nurses can only update medical notes, not reassign patients
        if (userRole === 'nurse' && input.updates.assignedNurseId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Nurses cannot reassign patients',
          });
        }

        const [updatedPatient] = await db
          .update(patients)
          .set({
            ...input.updates,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, input.patientId))
          .returning();

        if (!updatedPatient) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Patient not found',
          });
        }

        log.info('Patient updated', 'HEALTHCARE', {
          patientId: input.patientId,
          updatedBy: ctx.user.id,
          updates: Object.keys(input.updates),
        });

        return { patient: updatedPatient, success: true };
      } catch (error) {
        log.error('Failed to update patient', 'HEALTHCARE', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update patient',
        });
      }
    }),

  // Discharge patient
  dischargePatient: protectedProcedure
    .input(patientSchemas.dischargePatient)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check permissions - only doctors can discharge patients
        const userRole = (ctx.user as any).role || 'user';
        if (!['doctor', 'head_doctor', 'admin'].includes(userRole)) {
          throw new TRPCError({ 
            code: 'FORBIDDEN',
            message: 'Only doctors can discharge patients'
          });
        }

        const [dischargedPatient] = await db
          .update(patients)
          .set({
            isActive: false,
            dischargeDate: input.dischargeDate,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, input.patientId))
          .returning();

        if (!dischargedPatient) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Patient not found',
          });
        }

        log.info('Patient discharged', 'HEALTHCARE', {
          patientId: input.patientId,
          dischargedBy: ctx.user.id,
        });

        return { patient: dischargedPatient, success: true };
      } catch (error) {
        log.error('Failed to discharge patient', 'HEALTHCARE', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to discharge patient',
        });
      }
    }),

  // Get patient alerts history
  getPatientAlerts: protectedProcedure
    .input(z.object({
      patientId: z.string().uuid(),
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check permissions
        const userRole = (ctx.user as any).role || 'user';
        if (!permissionValidators.canViewPatientData(userRole)) {
          throw new TRPCError({ 
            code: 'FORBIDDEN',
            message: 'You do not have permission to view patient data'
          });
        }

        // Get patient alerts
        const patientAlerts = await db
          .select({
            alert: alerts,
            acknowledgment: alertAcknowledgments,
          })
          .from(alerts)
          .leftJoin(
            alertAcknowledgments,
            eq(alerts.id, alertAcknowledgments.alertId)
          )
          .where(eq(alerts.patientId, input.patientId))
          .orderBy(desc(alerts.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          alerts: patientAlerts,
          total: patientAlerts.length,
        };
      } catch (error) {
        log.error('Failed to fetch patient alerts', 'HEALTHCARE', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch patient alerts',
        });
      }
    }),

  // Get available hospitals for a user to join
  getAvailableHospitals: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Get user's organization
        const [userDetails] = await db
          .select({
            organizationId: users.organizationId,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (!userDetails?.organizationId) {
          throw new Error('User does not belong to any organization');
        }

        // Get all hospitals in the user's organization
        const availableHospitals = await db
          .select({
            id: hospitals.id,
            name: hospitals.name,
            isDefault: hospitals.isDefault,
          })
          .from(hospitals)
          .where(eq(hospitals.organizationId, userDetails.organizationId))
          .orderBy(desc(hospitals.isDefault), asc(hospitals.name));

        log.info('Fetched available hospitals for user', 'HEALTHCARE', {
          userId: ctx.user.id,
          organizationId: userDetails.organizationId,
          hospitalCount: availableHospitals.length,
        });

        return availableHospitals;
      } catch (error) {
        log.error('Failed to fetch available hospitals', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  // Join a hospital (assign user to hospital)
  joinHospital: protectedProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { hospitalId } = input;
      
      try {
        // Verify hospital exists and user has access
        const [hospital] = await db
          .select()
          .from(hospitals)
          .where(eq(hospitals.id, hospitalId))
          .limit(1);

        if (!hospital) {
          throw new Error('Hospital not found');
        }

        // Get user's organization
        const [userDetails] = await db
          .select({
            organizationId: users.organizationId,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (!userDetails?.organizationId) {
          throw new Error('User does not belong to any organization');
        }

        // Verify hospital belongs to user's organization
        if (hospital.organizationId !== userDetails.organizationId) {
          throw new Error('Hospital does not belong to your organization');
        }

        // Get current user details to check if they need profile completion
        const [currentUser] = await db
          .select({
            role: users.role,
            needsProfileCompletion: users.needsProfileCompletion,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        // Update user's default hospital and profile completion status
        const updateData: any = {
          defaultHospitalId: hospitalId,
          updatedAt: new Date(),
        };
        
        // If user is a guest (OAuth user), update their role and profile completion
        if (currentUser?.role === 'guest') {
          updateData.role = 'operator'; // Default healthcare role
          updateData.needsProfileCompletion = false;
        } else if (currentUser?.needsProfileCompletion) {
          // For non-guest users, just mark profile as complete
          updateData.needsProfileCompletion = false;
        }
        
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.id));

        // Check if user already has a healthcare profile
        const [existingHealthcareUser] = await db
          .select()
          .from(healthcareUsers)
          .where(eq(healthcareUsers.userId, ctx.user.id))
          .limit(1);

        if (!existingHealthcareUser) {
          // Create healthcare user profile
          await db.insert(healthcareUsers).values({
            userId: ctx.user.id,
            hospitalId: hospitalId,
            department: 'general_medicine' as any,
            isOnDuty: false,
          });
        } else {
          // Update existing healthcare user's hospital
          await db
            .update(healthcareUsers)
            .set({
              hospitalId: hospitalId,
            })
            .where(eq(healthcareUsers.userId, ctx.user.id));
        }

        // Log the hospital assignment
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'hospital_joined',
          entityType: 'hospital',
          entityId: hospitalId,
          hospitalId: hospitalId,
          metadata: {
            hospitalName: hospital.name,
            organizationId: hospital.organizationId,
          },
          ipAddress: ctx.req.headers.get('x-forwarded-for') || ctx.req.headers.get('x-real-ip') || 'unknown',
          userAgent: ctx.req.headers.get('user-agent') || 'unknown',
        });

        log.info('User joined hospital', 'HEALTHCARE', {
          userId: ctx.user.id,
          hospitalId: hospitalId,
          hospitalName: hospital.name,
          previousRole: currentUser?.role,
          newRole: currentUser?.role === 'guest' ? 'operator' : currentUser?.role,
          profileCompleted: currentUser?.role === 'guest' || currentUser?.needsProfileCompletion,
        });

        return {
          success: true,
          hospital: {
            id: hospital.id,
            name: hospital.name,
          },
        };
      } catch (error) {
        log.error('Failed to join hospital', 'HEALTHCARE', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: ctx.user.id,
          hospitalId,
        });
        throw error;
      }
    }),


    
    
    
  // Get shift summary
  getShiftSummary: healthcareProcedure
    .query(async ({ ctx }) => {
      try {
        const hospitalId = ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital assignment required');
        }
        
        // Get active shift
        const [activeShift] = await db
          .select()
          .from(shiftLogs)
          .where(
            and(
              eq(shiftLogs.userId, ctx.user.id),
              eq(shiftLogs.status, 'active')
            )
          )
          .limit(1);
        
        if (!activeShift) {
          return null;
        }
        
        // Calculate duration
        const now = new Date();
        const durationMinutes = Math.floor(
          (now.getTime() - activeShift.shiftStart.getTime()) / 60000
        );
        
        // Get alerts handled during shift
        const alertStats = await db
          .select({
            total: count(),
            acknowledged: sql<number>`count(case when ${alerts.acknowledgedBy} = ${ctx.user.id} then 1 end)`,
            active: sql<number>`count(case when ${alerts.status} = 'active' then 1 end)`,
          })
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, hospitalId),
              gte(alerts.createdAt, activeShift.shiftStart)
            )
          );
        
        // Get alerts by type
        const alertsByType = await db
          .select({
            alertType: alerts.alertType,
            count: count(),
          })
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, hospitalId),
              gte(alerts.createdAt, activeShift.shiftStart)
            )
          )
          .groupBy(alerts.alertType);
        
        // Get alerts by urgency
        const alertsByUrgency = await db
          .select({
            urgencyLevel: alerts.urgencyLevel,
            count: count(),
          })
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, hospitalId),
              gte(alerts.createdAt, activeShift.shiftStart)
            )
          )
          .groupBy(alerts.urgencyLevel);
        
        return {
          shiftStart: activeShift.shiftStart,
          shiftDuration: durationMinutes,
          alertsHandled: alertStats[0]?.acknowledged || 0,
          totalAlerts: alertStats[0]?.total || 0,
          activeAlerts: alertStats[0]?.active || 0,
          alertsByType: Object.fromEntries(
            alertsByType.map(a => [a.alertType, a.count])
          ),
          alertsByUrgency: Object.fromEntries(
            alertsByUrgency.map(a => [a.urgencyLevel.toString(), a.count])
          ),
        };
      } catch (error) {
        log.error('Failed to get shift summary', 'HEALTHCARE', error);
        throw new Error('Failed to get shift summary');
      }
    }),
    
  // End shift with detailed handover
  endShift: healthcareProcedure
    .input(z.object({
      handoverNotes: z.string().min(1, 'Handover notes are required'),
      criticalAlerts: z.array(z.string().uuid()).optional(),
      followUpRequired: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { handoverNotes, criticalAlerts = [], followUpRequired = [] } = input;
      
      try {
        const hospitalId = ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital assignment required');
        }
        
        // Get active shift
        const [activeShift] = await db
          .select()
          .from(shiftLogs)
          .where(
            and(
              eq(shiftLogs.userId, ctx.user.id),
              eq(shiftLogs.status, 'active')
            )
          )
          .limit(1);
        
        if (!activeShift) {
          throw new Error('No active shift found');
        }
        
        // Check for unresolved critical alerts
        const [unresolvedCritical] = await db
          .select({ count: count() })
          .from(alerts)
          .where(
            and(
              eq(alerts.hospitalId, hospitalId),
              eq(alerts.status, 'active'),
              gte(alerts.urgencyLevel, 5)
            )
          );
        
        if (unresolvedCritical.count > 0) {
          throw new Error('Cannot end shift with unresolved critical alerts');
        }
        
        // Calculate shift duration
        const shiftEnd = new Date();
        const durationMinutes = Math.floor(
          (shiftEnd.getTime() - activeShift.shiftStart.getTime()) / 60000
        );
        
        // Check minimum shift duration
        if (durationMinutes < 30) {
          throw new Error('Minimum shift duration not met (30 minutes required)');
        }
        
        // Create handover
        const [handover] = await db
          .insert(shiftHandovers)
          .values({
            fromUserId: ctx.user.id,
            hospitalId,
            shiftLogId: activeShift.id,
            handoverNotes,
            criticalAlerts,
            followUpRequired,
            status: 'pending',
          })
          .returning();
        
        // Update shift log
        await db
          .update(shiftLogs)
          .set({
            shiftEnd,
            durationMinutes,
            status: 'completed',
            handoverId: handover.id,
          })
          .where(eq(shiftLogs.id, activeShift.id));
        
        // Update healthcare user status
        await db
          .update(healthcareUsers)
          .set({
            isOnDuty: false,
            shiftEndTime: shiftEnd,
          })
          .where(eq(healthcareUsers.userId, ctx.user.id));
        
        // Log audit
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'shift_ended_with_handover',
          entityType: 'shift',
          entityId: activeShift.id,
          hospitalId,
          metadata: { 
            shiftId: activeShift.id,
            handoverId: handover.id,
            durationMinutes,
            criticalAlertCount: criticalAlerts.length,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });
        
        return {
          success: true,
          handoverId: handover.id,
          shiftDuration: durationMinutes,
        };
      } catch (error) {
        log.error('Failed to end shift with handover', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Get pending handovers
  getPendingHandovers: healthcareProcedure
    .query(async ({ ctx }) => {
      try {
        const hospitalId = ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital assignment required');
        }
        
        // Get pending handovers for the hospital
        const pendingHandovers = await db
          .select({
            id: shiftHandovers.id,
            fromUserId: shiftHandovers.fromUserId,
            fromUserName: users.name,
            fromUserEmail: users.email,
            handoverNotes: shiftHandovers.handoverNotes,
            criticalAlerts: shiftHandovers.criticalAlerts,
            followUpRequired: shiftHandovers.followUpRequired,
            createdAt: shiftHandovers.createdAt,
            shiftLogId: shiftHandovers.shiftLogId,
            status: shiftHandovers.status,
          })
          .from(shiftHandovers)
          .leftJoin(users, eq(shiftHandovers.fromUserId, users.id))
          .where(
            and(
              eq(shiftHandovers.hospitalId, hospitalId),
              eq(shiftHandovers.status, 'pending'),
              // Don't show user's own handovers
              sql`${shiftHandovers.fromUserId} != ${ctx.user.id}`
            )
          )
          .orderBy(desc(shiftHandovers.createdAt));
        
        return pendingHandovers;
      } catch (error) {
        log.error('Failed to get pending handovers', 'HEALTHCARE', error);
        throw new Error('Failed to get pending handovers');
      }
    }),
    
  // Accept handover and start shift
  acceptHandover: healthcareProcedure
    .input(z.object({
      handoverId: z.string().uuid(),
      acknowledgment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { handoverId, acknowledgment } = input;
      
      try {
        const hospitalId = ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital assignment required');
        }
        
        // Start transaction
        const result = await db.transaction(async (tx) => {
          // Get handover details
          const [handover] = await tx
            .select()
            .from(shiftHandovers)
            .where(
              and(
                eq(shiftHandovers.id, handoverId),
                eq(shiftHandovers.status, 'pending')
              )
            )
            .limit(1);
          
          if (!handover) {
            throw new Error('Handover not found or already accepted');
          }
          
          // Verify hospital match
          if (handover.hospitalId !== hospitalId) {
            throw new Error('Handover belongs to different hospital');
          }
          
          // Check if user already has active shift
          const [existingShift] = await tx
            .select()
            .from(shiftLogs)
            .where(
              and(
                eq(shiftLogs.userId, ctx.user.id),
                eq(shiftLogs.status, 'active')
              )
            )
            .limit(1);
          
          if (existingShift) {
            throw new Error('Already on duty. Please end current shift first.');
          }
          
          // Accept handover
          await tx
            .update(shiftHandovers)
            .set({
              toUserId: ctx.user.id,
              status: 'accepted',
              acceptedAt: new Date(),
              acknowledgmentNotes: acknowledgment,
            })
            .where(eq(shiftHandovers.id, handoverId));
          
          // Start new shift
          const [newShift] = await tx
            .insert(shiftLogs)
            .values({
              userId: ctx.user.id,
              hospitalId,
              shiftStart: new Date(),
              status: 'active',
            })
            .returning();
          
          // Update healthcare user status
          await tx
            .update(healthcareUsers)
            .set({
              isOnDuty: true,
              shiftStartTime: new Date(),
              shiftEndTime: null,
            })
            .where(eq(healthcareUsers.userId, ctx.user.id));
          
          // Log audit
          await tx.insert(healthcareAuditLogs).values({
            userId: ctx.user.id,
            action: 'handover_accepted',
            entityType: 'handover',
            entityId: handoverId,
            hospitalId,
            metadata: { 
              handoverId,
              newShiftId: newShift.id,
              fromUserId: handover.fromUserId,
            },
            ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
            userAgent: ctx.req.headers?.['user-agent'],
          });
          
          return {
            success: true,
            shiftStarted: true,
            shiftId: newShift.id,
          };
        });
        
        return result;
      } catch (error) {
        log.error('Failed to accept handover', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Get handover metrics
  getHandoverMetrics: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
      timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
    }))
    .query(async ({ input }) => {
      const { hospitalId, timeRange } = input;
      
      try {
        let startDate = new Date();
        switch (timeRange) {
          case '24h':
            startDate.setHours(startDate.getHours() - 24);
            break;
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
        }
        
        // Get handover statistics
        const handovers = await db
          .select({
            id: shiftHandovers.id,
            status: shiftHandovers.status,
            createdAt: shiftHandovers.createdAt,
            acceptedAt: shiftHandovers.acceptedAt,
            criticalAlerts: shiftHandovers.criticalAlerts,
          })
          .from(shiftHandovers)
          .where(
            and(
              eq(shiftHandovers.hospitalId, hospitalId),
              gte(shiftHandovers.createdAt, startDate)
            )
          );
        
        // Calculate metrics
        const totalHandovers = handovers.length;
        const acceptedHandovers = handovers.filter(h => h.status === 'accepted').length;
        const pendingHandovers = handovers.filter(h => h.status === 'pending').length;
        
        // Calculate average handover time (time to accept)
        const acceptedWithTime = handovers.filter(h => h.acceptedAt);
        const handoverTimes = acceptedWithTime.map(h => {
          return (h.acceptedAt!.getTime() - h.createdAt.getTime()) / 60000; // in minutes
        });
        const averageHandoverTime = handoverTimes.length > 0
          ? Math.round(handoverTimes.reduce((a, b) => a + b, 0) / handoverTimes.length)
          : 0;
        
        // Count critical alerts transferred
        const criticalAlertsTransferred = handovers.reduce((total, h) => {
          return total + (h.criticalAlerts as any[]).length;
        }, 0);
        
        // Group by shift (morning, evening, night)
        const handoversByShift = {
          morning: 0,
          evening: 0,
          night: 0,
        };
        
        handovers.forEach(h => {
          const hour = h.createdAt.getHours();
          if (hour >= 6 && hour < 14) {
            handoversByShift.morning++;
          } else if (hour >= 14 && hour < 22) {
            handoversByShift.evening++;
          } else {
            handoversByShift.night++;
          }
        });
        
        return {
          totalHandovers,
          acceptedHandovers,
          pendingHandovers,
          averageHandoverTime,
          criticalAlertsTransferred,
          handoversByShift,
          acceptanceRate: totalHandovers > 0 
            ? Math.round((acceptedHandovers / totalHandovers) * 100)
            : 100,
        };
      } catch (error) {
        log.error('Failed to get handover metrics', 'HEALTHCARE', error);
        throw new Error('Failed to get handover metrics');
      }
    }),
    
  // ============ ALERT TEMPLATES ============
  
  // Get alert templates
  getAlertTemplates: viewAlertsProcedure
    .input(z.object({
      hospitalId: z.string().uuid().optional(),
      includeGlobal: z.boolean().default(true),
      activeOnly: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const hospitalId = input.hospitalId || ctx.hospitalContext?.userHospitalId;
        
        if (!hospitalId && !input.includeGlobal) {
          throw new Error('Hospital ID required when not including global templates');
        }
        
        // Build query conditions
        const conditions = [];
        
        if (input.activeOnly) {
          conditions.push(eq(alertTemplates.isActive, true));
        }
        
        if (hospitalId && input.includeGlobal) {
          conditions.push(
            or(
              eq(alertTemplates.hospitalId, hospitalId),
              eq(alertTemplates.isGlobal, true)
            )
          );
        } else if (hospitalId) {
          conditions.push(eq(alertTemplates.hospitalId, hospitalId));
        } else {
          conditions.push(eq(alertTemplates.isGlobal, true));
        }
        
        const templates = await db
          .select({
            template: alertTemplates,
            creator: {
              id: users.id,
              name: users.name,
              email: users.email,
            },
          })
          .from(alertTemplates)
          .leftJoin(users, eq(alertTemplates.createdBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(alertTemplates.isGlobal), asc(alertTemplates.name));
        
        return {
          templates: templates.map(t => ({
            ...t.template,
            creatorName: t.creator?.name || 'Unknown',
          })),
          total: templates.length,
        };
      } catch (error) {
        log.error('Failed to get alert templates', 'HEALTHCARE', error);
        throw new Error('Failed to get alert templates');
      }
    }),
    
  // Create alert template (operators and admins)
  createAlertTemplate: healthcareProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      alertType: AlertType,
      urgencyLevel: UrgencyLevel,
      defaultDescription: z.string().optional(),
      targetDepartment: z.string().optional(),
      icon: z.string().max(10).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      isGlobal: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Only admins can create global templates
        if (input.isGlobal && ctx.user.role !== 'admin') {
          throw new Error('Only administrators can create global templates');
        }
        
        const hospitalId = ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital context required');
        }
        
        const [newTemplate] = await db.insert(alertTemplates).values({
          ...input,
          hospitalId,
          createdBy: ctx.user.id,
          targetDepartment: input.targetDepartment as any,
        }).returning();
        
        // Audit log
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'template_created',
          entityType: 'alert',
          entityId: newTemplate.id,
          hospitalId,
          metadata: {
            templateName: input.name,
            alertType: input.alertType,
            urgencyLevel: input.urgencyLevel,
            isGlobal: input.isGlobal,
          },
        });
        
        log.info('Alert template created', 'HEALTHCARE', {
          templateId: newTemplate.id,
          name: input.name,
          createdBy: ctx.user.id,
        });
        
        return {
          success: true,
          template: newTemplate,
        };
      } catch (error) {
        log.error('Failed to create alert template', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Update alert template
  updateAlertTemplate: healthcareProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      urgencyLevel: UrgencyLevel.optional(),
      defaultDescription: z.string().optional(),
      targetDepartment: z.string().optional(),
      icon: z.string().max(10).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { templateId, ...updates } = input;
      
      try {
        // Get the template to check ownership
        const [template] = await db
          .select()
          .from(alertTemplates)
          .where(eq(alertTemplates.id, templateId))
          .limit(1);
        
        if (!template) {
          throw new Error('Template not found');
        }
        
        // Check permissions
        const userHospitalId = ctx.hospitalContext?.userHospitalId;
        if (template.hospitalId !== userHospitalId && ctx.user.role !== 'admin') {
          throw new Error('You can only update templates from your own hospital');
        }
        
        // Update the template
        await db
          .update(alertTemplates)
          .set({
            ...updates,
            targetDepartment: updates.targetDepartment as any,
            updatedAt: new Date(),
          })
          .where(eq(alertTemplates.id, templateId));
        
        // Audit log
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'template_updated',
          entityType: 'alert',
          entityId: templateId,
          hospitalId: template.hospitalId,
          metadata: {
            updates,
          },
        });
        
        log.info('Alert template updated', 'HEALTHCARE', {
          templateId,
          updates,
          updatedBy: ctx.user.id,
        });
        
        return {
          success: true,
        };
      } catch (error) {
        log.error('Failed to update alert template', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Delete alert template
  deleteAlertTemplate: adminProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const [template] = await db
          .select()
          .from(alertTemplates)
          .where(eq(alertTemplates.id, input.templateId))
          .limit(1);
        
        if (!template) {
          throw new Error('Template not found');
        }
        
        // Soft delete by marking as inactive
        await db
          .update(alertTemplates)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(alertTemplates.id, input.templateId));
        
        // Audit log
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'template_deleted',
          entityType: 'alert',
          entityId: input.templateId,
          hospitalId: template.hospitalId,
          metadata: {
            templateName: template.name,
          },
        });
        
        log.info('Alert template deleted', 'HEALTHCARE', {
          templateId: input.templateId,
          deletedBy: ctx.user.id,
        });
        
        return {
          success: true,
        };
      } catch (error) {
        log.error('Failed to delete alert template', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Create alert from template
  createAlertFromTemplate: healthcareProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      roomNumber: z.string()
        .min(1, "Room number is required")
        .max(10, "Room number cannot exceed 10 characters"),
      description: z.string().max(500).optional(),
      patientId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the template
        const [template] = await db
          .select()
          .from(alertTemplates)
          .where(eq(alertTemplates.id, input.templateId))
          .limit(1);
        
        if (!template || !template.isActive) {
          throw new Error('Template not found or inactive');
        }
        
        const hospitalId = ctx.hospitalContext?.userHospitalId;
        if (!hospitalId) {
          throw new Error('Hospital context required');
        }
        
        // Create the alert
        const [newAlert] = await db.insert(alerts).values({
          roomNumber: input.roomNumber,
          alertType: template.alertType,
          urgencyLevel: template.urgencyLevel,
          description: input.description || template.defaultDescription,
          targetDepartment: template.targetDepartment,
          patientId: input.patientId,
          createdBy: ctx.user.id,
          hospitalId,
          status: 'active',
          nextEscalationAt: new Date(Date.now() + HEALTHCARE_ESCALATION_TIERS[0].timeout_minutes * 60 * 1000),
        }).returning();
        
        // Log the creation
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'alert_created_from_template',
          entityType: 'alert',
          entityId: newAlert.id,
          hospitalId,
          metadata: {
            templateId: template.id,
            templateName: template.name,
            alertType: template.alertType,
            urgencyLevel: template.urgencyLevel,
            roomNumber: input.roomNumber,
          },
        });
        
        // Emit alert created event
        await alertEventHelpers.emitAlertCreated(newAlert);
        
        // Send notifications (reuse existing logic)
        try {
          const { notificationService, NotificationType, Priority } = await import('../services/notifications');
          
          const onDutyStaff = await db
            .select({
              userId: healthcareUsers.userId,
              role: users.role,
            })
            .from(healthcareUsers)
            .innerJoin(users, eq(healthcareUsers.userId, users.id))
            .where(
              and(
                eq(healthcareUsers.hospitalId, hospitalId),
                eq(healthcareUsers.isOnDuty, true),
                or(
                  eq(users.role, 'doctor'),
                  eq(users.role, 'nurse'),
                  eq(users.role, 'head_doctor')
                )
              )
            );
          
          if (onDutyStaff.length > 0) {
            await notificationService.sendBatch(
              onDutyStaff.map(staff => ({
                id: `alert-${newAlert.id}-${staff.userId}`,
                type: NotificationType.ALERT_CREATED,
                recipient: {
                  userId: staff.userId,
                },
                priority: template.urgencyLevel === 1 ? Priority.CRITICAL : Priority.HIGH,
                data: {
                  alertId: newAlert.id,
                  roomNumber: input.roomNumber,
                  alertType: template.alertType,
                  urgencyLevel: template.urgencyLevel,
                  description: newAlert.description,
                  fromTemplate: template.name,
                },
                organizationId: hospitalId,
              }))
            );
          }
        } catch (notificationError) {
          log.error('Failed to send notifications for templated alert', 'HEALTHCARE', notificationError);
        }
        
        log.info('Alert created from template', 'HEALTHCARE', {
          alertId: newAlert.id,
          templateId: template.id,
          templateName: template.name,
          createdBy: ctx.user.id,
        });
        
        return {
          success: true,
          alert: newAlert,
        };
      } catch (error) {
        log.error('Failed to create alert from template', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Batch acknowledge alerts
  batchAcknowledgeAlerts: doctorProcedure
    .use(async ({ ctx, next }) => {
      // Apply rate limiting
      const { healthcareRateLimiters } = await import('../middleware/rate-limiter');
      return healthcareRateLimiters.acknowledgeAlert({ ctx, next });
    })
    .input(z.object({
      alertIds: z.array(z.string().uuid()).min(1).max(50),
      urgencyAssessment: z.enum(['maintain', 'increase', 'decrease']).default('maintain'),
      responseAction: z.enum(['responding', 'monitoring', 'delegating', 'delayed']).default('responding'),
      estimatedResponseTime: z.number().min(1).max(120).optional(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { alertIds, urgencyAssessment, responseAction, estimatedResponseTime, notes } = input;
      
      // Validate user has organizationId
      if (!ctx.hospitalContext?.userOrganizationId) {
        throw new Error('Organization required. Please complete your profile to use healthcare features.');
      }
      
      try {
        // Get all alerts
        const alertsToAcknowledge = await db
          .select()
          .from(alerts)
          .where(
            and(
              sql`${alerts.id} = ANY(${alertIds})`,
              eq(alerts.status, 'active')
            )
          );
        
        if (alertsToAcknowledge.length === 0) {
          throw new Error('No active alerts found with the provided IDs');
        }
        
        const acknowledgedAlerts = [];
        const errors = [];
        
        // Process each alert
        for (const alert of alertsToAcknowledge) {
          try {
            // Calculate response time
            const responseTimeSeconds = Math.floor(
              (Date.now() - alert.createdAt.getTime()) / 1000
            );
            
            // Determine new urgency level
            let newUrgencyLevel = alert.urgencyLevel;
            if (urgencyAssessment === 'increase' && alert.urgencyLevel > 1) {
              newUrgencyLevel = alert.urgencyLevel - 1;
            } else if (urgencyAssessment === 'decrease' && alert.urgencyLevel < 5) {
              newUrgencyLevel = alert.urgencyLevel + 1;
            }
            
            // Update alert
            await db
              .update(alerts)
              .set({
                status: 'acknowledged',
                acknowledgedBy: ctx.user.id,
                acknowledgedAt: new Date(),
                urgencyLevel: newUrgencyLevel,
              })
              .where(eq(alerts.id, alert.id));
            
            // Create acknowledgment record
            await db.insert(alertAcknowledgments).values({
              alertId: alert.id,
              userId: ctx.user.id,
              responseTimeSeconds,
              notes,
              urgencyAssessment,
              responseAction,
              estimatedResponseTime: estimatedResponseTime || null,
              delegatedTo: null,
            });
            
            // Create timeline event
            await db.insert(alertTimelineEvents).values({
              alertId: alert.id,
              eventType: 'acknowledged',
              userId: ctx.user.id,
              description: `Alert acknowledged by ${ctx.user.name || ctx.user.email} (batch operation)`,
              metadata: {
                responseAction,
                urgencyAssessment,
                estimatedResponseTime,
                responseTimeSeconds,
                batchOperation: true,
              },
            });
            
            // Emit event
            await alertEventHelpers.emitAlertAcknowledged(
              alert.id,
              alert.hospitalId,
              ctx.user.id
            );
            
            acknowledgedAlerts.push(alert.id);
          } catch (error) {
            errors.push({
              alertId: alert.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        // Log batch operation
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'batch_alerts_acknowledged',
          entityType: 'alert',
          entityId: alertIds.join(','),
          hospitalId: ctx.hospitalContext?.userHospitalId || '',
          metadata: {
            totalAlerts: alertIds.length,
            successfulAcknowledgments: acknowledgedAlerts.length,
            failedAcknowledgments: errors.length,
            errors: errors.length > 0 ? errors : undefined,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });
        
        log.info('Batch alerts acknowledged', 'HEALTHCARE', {
          userId: ctx.user.id,
          totalAlerts: alertIds.length,
          acknowledged: acknowledgedAlerts.length,
          failed: errors.length,
        });
        
        return {
          success: true,
          acknowledged: acknowledgedAlerts,
          errors,
        };
      } catch (error) {
        log.error('Failed to batch acknowledge alerts', 'HEALTHCARE', error);
        throw error;
      }
    }),
    
  // Batch resolve alerts
  batchResolveAlerts: doctorProcedure
    .input(z.object({
      alertIds: z.array(z.string().uuid()).min(1).max(50),
      resolution: z.string().min(1).max(500),
      followUpRequired: z.boolean().default(false),
      followUpNotes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { alertIds, resolution, followUpRequired, followUpNotes } = input;
      
      // Validate user has organizationId
      if (!ctx.hospitalContext?.userOrganizationId) {
        throw new Error('Organization required. Please complete your profile to use healthcare features.');
      }
      
      try {
        // Get all alerts
        const alertsToResolve = await db
          .select()
          .from(alerts)
          .where(
            and(
              sql`${alerts.id} = ANY(${alertIds})`,
              or(
                eq(alerts.status, 'active'),
                eq(alerts.status, 'acknowledged')
              )
            )
          );
        
        if (alertsToResolve.length === 0) {
          throw new Error('No active or acknowledged alerts found with the provided IDs');
        }
        
        const resolvedAlerts = [];
        const errors = [];
        
        // Process each alert
        for (const alert of alertsToResolve) {
          try {
            // Update alert
            await db
              .update(alerts)
              .set({
                status: 'resolved',
                resolvedBy: ctx.user.id,
                resolvedAt: new Date(),
                resolution,
                followUpRequired,
              })
              .where(eq(alerts.id, alert.id));
            
            // Create timeline event
            await db.insert(alertTimelineEvents).values({
              alertId: alert.id,
              eventType: 'resolved',
              userId: ctx.user.id,
              description: `Alert resolved by ${ctx.user.name || ctx.user.email} (batch operation)`,
              metadata: {
                resolution,
                followUpRequired,
                followUpNotes,
                batchOperation: true,
              },
            });
            
            // Emit event
            await alertEventHelpers.emitAlertResolved(
              alert.id,
              alert.hospitalId,
              ctx.user.id
            );
            
            resolvedAlerts.push(alert.id);
          } catch (error) {
            errors.push({
              alertId: alert.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        // Log batch operation
        await db.insert(healthcareAuditLogs).values({
          userId: ctx.user.id,
          action: 'batch_alerts_resolved',
          entityType: 'alert',
          entityId: alertIds.join(','),
          hospitalId: ctx.hospitalContext?.userHospitalId || '',
          metadata: {
            totalAlerts: alertIds.length,
            successfulResolutions: resolvedAlerts.length,
            failedResolutions: errors.length,
            errors: errors.length > 0 ? errors : undefined,
          },
          ipAddress: ctx.req.headers?.['x-forwarded-for'] || ctx.req.headers?.['x-real-ip'],
          userAgent: ctx.req.headers?.['user-agent'],
        });
        
        log.info('Batch alerts resolved', 'HEALTHCARE', {
          userId: ctx.user.id,
          totalAlerts: alertIds.length,
          resolved: resolvedAlerts.length,
          failed: errors.length,
        });
        
        return {
          success: true,
          resolved: resolvedAlerts,
          errors,
        };
      } catch (error) {
        log.error('Failed to batch resolve alerts', 'HEALTHCARE', error);
        throw error;
      }
    }),
});

// Helper function to generate time series data
async function generateTimeSeries(
  alerts: any[],
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month'
) {
  const timeSeries: Record<string, any> = {};
  
  // Initialize buckets based on groupBy
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = getTimeKey(current, groupBy);
    timeSeries[key] = {
      date: new Date(current),
      total: 0,
      acknowledged: 0,
      resolved: 0,
      escalated: 0,
      avgResponseTime: 0,
      responseTimes: [],
    };
    
    // Increment based on groupBy
    if (groupBy === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (groupBy === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  // Populate data
  alerts.forEach(alert => {
    const key = getTimeKey(alert.createdAt, groupBy);
    if (timeSeries[key]) {
      timeSeries[key].total++;
      if (alert.acknowledgedAt) {
        timeSeries[key].acknowledged++;
        const responseTime = (alert.acknowledgedAt.getTime() - alert.createdAt.getTime()) / 1000;
        timeSeries[key].responseTimes.push(responseTime);
      }
      if (alert.resolvedAt) timeSeries[key].resolved++;
      if (alert.escalationLevel > 1) timeSeries[key].escalated++;
    }
  });
  
  // Calculate averages
  Object.values(timeSeries).forEach((bucket: any) => {
    if (bucket.responseTimes.length > 0) {
      bucket.avgResponseTime = bucket.responseTimes.reduce((a: number, b: number) => a + b, 0) / bucket.responseTimes.length;
    }
    delete bucket.responseTimes; // Clean up
  });
  
  return Object.values(timeSeries).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
}

function getTimeKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  if (groupBy === 'day') {
    return date.toISOString().split('T')[0];
  } else if (groupBy === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0];
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

// Helper function to calculate average response time
async function calculateAvgResponseTime(hospitalId: string, since: Date): Promise<number> {
  const result = await db
    .select({
      avgSeconds: sql<number>`
        avg(
          extract(epoch from (acknowledged_at - created_at))
        )
      `
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.hospitalId, hospitalId),
        gte(alerts.createdAt, since),
        sql`acknowledged_at is not null`
      )
    );
  
  return Math.round(result[0]?.avgSeconds || 0);
}