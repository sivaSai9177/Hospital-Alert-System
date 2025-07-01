import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveOrganization } from '@/lib/stores/organization-store';
import { useHospitalStore } from '@/lib/stores/hospital-store';
import { api } from '@/lib/api/trpc';
import { log } from '@/lib/core/debug/unified-logger';

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const { user, isRefreshing } = useAuth();
  const { organization } = useActiveOrganization();
  const { 
    setHospitals, 
    setCurrentHospital, 
    clearHospitalData,
    setLoading 
  } = useHospitalStore();

  // Use user's organizationId if organization store is not populated yet
  const organizationId = organization?.id || user?.organizationId;
  
  // Fetch hospitals when organization changes
  const { data: hospitalsData, isLoading, error } = api.healthcare.getOrganizationHospitals.useQuery(
    { organizationId: organizationId || '' },
    { 
      enabled: !!organizationId && !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Update hospital store when data changes
  useEffect(() => {
    log.info('[HospitalProvider] Hospital data update', 'HOSPITAL', {
      hasData: !!hospitalsData,
      hospitalCount: hospitalsData?.hospitals?.length || 0,
      userDefaultHospitalId: user?.defaultHospitalId,
      organizationId,
    });
    
    if (hospitalsData?.hospitals) {
      setHospitals(hospitalsData.hospitals);
      
      // If user has a default hospital, select it
      if (user?.defaultHospitalId) {
        const defaultHospital = hospitalsData.hospitals.find(
          h => h.id === user.defaultHospitalId
        );
        if (defaultHospital) {
          log.info('[HospitalProvider] Setting default hospital', 'HOSPITAL', {
            hospitalId: defaultHospital.id,
            hospitalName: defaultHospital.name,
          });
          setCurrentHospital(defaultHospital);
        } else {
          log.warn('[HospitalProvider] Default hospital not found in list', 'HOSPITAL', {
            defaultHospitalId: user.defaultHospitalId,
            availableHospitals: hospitalsData.hospitals.map(h => ({ id: h.id, name: h.name })),
          });
        }
      }
    }
  }, [hospitalsData, user?.defaultHospitalId, setHospitals, setCurrentHospital, organizationId]);

  // Clear hospital data when user logs out or organization changes
  useEffect(() => {
    if (!user || !organization) {
      clearHospitalData();
    }
  }, [user, organization, clearHospitalData]);

  // Update loading state
  useEffect(() => {
    setLoading(isLoading || isRefreshing);
  }, [isLoading, isRefreshing, setLoading]);

  // Log errors
  useEffect(() => {
    if (error) {
      log.error('Failed to fetch hospitals', 'HOSPITAL', error);
    }
  }, [error]);

  return <>{children}</>;
}