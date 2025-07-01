# Patient Registration Flow

## Overview
The patient registration flow has been updated to provide a seamless experience from registration to viewing the newly created patient's details.

## Flow Steps

1. **Register Patient Button** - Available on the patients list screen for users with appropriate permissions (doctors and head doctors)

2. **Registration Form** (`/register-patient`)
   - Multi-step form with validation
   - Collects patient information including:
     - Basic info (name, DOB, gender, etc.)
     - Medical info (blood type, conditions, etc.)
     - Emergency contact

3. **After Successful Registration**:
   - The form calls `onSuccess` callback with the created patient data
   - The patients query is invalidated to ensure fresh data
   - User is navigated directly to the patient details page using:
     ```
     router.push(`/patient-details?patientId=${patient.id}`)
     ```

4. **Patient Details View** (`/patient-details`)
   - Shows the newly registered patient's information
   - Uses the `patientId` query parameter to fetch patient data

## Key Changes Made

1. **Fixed Navigation Parameter**: Changed from `id` to `patientId` to match the expected parameter in patient-details.tsx
2. **Added Query Invalidation**: Ensures the patients list is refreshed with new data
3. **Direct Navigation**: Users now go directly to view the patient they just created instead of back to the list

## Testing Steps

1. Log in as a doctor or head doctor
2. Navigate to the Patients tab
3. Click "Register" button
4. Fill out the patient registration form
5. Submit the form
6. Verify you are taken directly to the new patient's details page
7. Go back to the patients list and verify the new patient appears

## Permissions Required
- Only doctors and head doctors can register new patients
- The form checks permissions and shows appropriate error messages if unauthorized