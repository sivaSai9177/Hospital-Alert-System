import { useEffect, useRef, useCallback, useState } from 'react';
import { draftStorage } from '@/lib/storage/draft-storage';
import { logger } from '@/lib/core/debug/unified-logger';
import { useAuth } from '@/hooks/useAuth';
import { useToastStore } from '@/lib/stores/toast-store';
import { debounce } from '@/lib/core/utils/debounce';

interface UseSimpleFormDraftOptions<T> {
  /**
   * Unique key for this form's draft
   */
  formKey: string;
  
  /**
   * Current form data
   */
  data: T;
  
  /**
   * Function to update form data when draft is restored
   */
  onDataChange: (data: T) => void;
  
  /**
   * Fields to exclude from draft (e.g., passwords)
   */
  excludeFields?: (keyof T)[];
  
  /**
   * Auto-save delay in milliseconds (default: 1000ms)
   */
  autoSaveDelay?: number;
  
  /**
   * Whether to show notification when draft is restored
   */
  showRestoreNotification?: boolean;
  
  /**
   * Callback when draft is restored
   */
  onDraftRestored?: (data: T) => void;
}

/**
 * Simplified hook for persisting form drafts without react-hook-form
 * Works with regular state-based forms
 */
export function useSimpleFormDraft<T extends Record<string, any>>({
  formKey,
  data,
  onDataChange,
  excludeFields = [],
  autoSaveDelay = 1000,
  showRestoreNotification = true,
  onDraftRestored,
}: UseSimpleFormDraftOptions<T>) {
  const { user } = useAuth();
  const [draftAge, setDraftAge] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const isMountedRef = useRef(true);
  const hasRestoredRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  
  // Create user-specific draft key
  const draftKey = user ? `${user.id}:${formKey}` : formKey;
  
  // Filter out excluded fields
  const getFilteredData = useCallback((formData: T): Partial<T> => {
    const filtered = { ...formData };
    excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [excludeFields]);
  
  // Save draft function with debouncing
  const saveDraftDebounced = useRef(
    debounce(async (formData: T) => {
      if (!isMountedRef.current) return;
      
      const filteredData = getFilteredData(formData);
      
      // Don't save empty forms
      const hasData = Object.values(filteredData).some(
        value => value !== undefined && value !== '' && value !== null
      );
      
      if (hasData) {
        const dataString = JSON.stringify(filteredData);
        // Only save if data has changed
        if (dataString !== lastSavedDataRef.current) {
          await draftStorage.saveDraft(draftKey, filteredData);
          lastSavedDataRef.current = dataString;
          logger.healthcare.debug('Form draft saved', { 
            formKey, 
            fields: Object.keys(filteredData).length 
          });
        }
      }
    }, autoSaveDelay)
  ).current;
  
  // Save draft
  const saveDraft = useCallback(async () => {
    await saveDraftDebounced(data);
  }, [data, saveDraftDebounced]);
  
  // Clear draft
  const clearDraft = useCallback(async () => {
    await draftStorage.removeDraft(draftKey);
    lastSavedDataRef.current = '';
    logger.healthcare.debug('Form draft cleared', { formKey });
  }, [draftKey, formKey]);
  
  // Restore draft on mount
  useEffect(() => {
    const restoreDraft = async () => {
      // Only restore once per mount
      if (hasRestoredRef.current) return;
      hasRestoredRef.current = true;
      
      setIsRestoring(true);
      try {
        const draft = await draftStorage.loadDraft<Partial<T>>(draftKey);
        
        if (draft && Object.keys(draft).length > 0) {
          // Get draft age
          const age = await draftStorage.getDraftAge(draftKey);
          setDraftAge(age);
          
          // Update form data with draft
          onDataChange({ ...data, ...draft });
          
          logger.healthcare.info('Form draft restored', { 
            formKey, 
            fields: Object.keys(draft).length,
            ageMinutes: age 
          });
          
          // Show notification
          if (showRestoreNotification && age !== null) {
            // Don't show notification for very recent drafts (less than 1 minute)
            if (age >= 1) {
              const ageText = age < 60 
                ? `${age} minute${age !== 1 ? 's' : ''} ago`
                : `${Math.floor(age / 60)} hour${Math.floor(age / 60) !== 1 ? 's' : ''} ago`;
                
              useToastStore.getState().showInfo(
                'Draft Restored',
                `We found a draft from ${ageText}.`
              );
            }
          }
          
          // Call callback
          onDraftRestored?.(draft as T);
        }
      } catch (error) {
        logger.healthcare.error('Failed to restore draft', { 
          formKey, 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      } finally {
        setIsRestoring(false);
      }
    };
    
    restoreDraft();
    
    // Cleanup
    return () => {
      isMountedRef.current = false;
      saveDraftDebounced.cancel();
    };
  }, []); // Only run on mount
  
  // Auto-save draft when form data changes
  useEffect(() => {
    // Don't auto-save while restoring
    if (isRestoring) return;
    
    // Don't save on first render
    if (!hasRestoredRef.current) return;
    
    saveDraft();
  }, [data, saveDraft, isRestoring]);
  
  return {
    /**
     * Manually save the current draft
     */
    saveDraft,
    
    /**
     * Clear the saved draft
     */
    clearDraft,
    
    /**
     * Age of the restored draft in minutes
     */
    draftAge,
    
    /**
     * Whether draft is currently being restored
     */
    isRestoring,
  };
}