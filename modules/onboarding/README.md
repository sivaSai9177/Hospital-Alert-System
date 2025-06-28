# Onboarding Module

A comprehensive onboarding experience for healthcare professionals with role-based flows, professional verification, and organization setup.

## Overview

The onboarding module guides new users through:
1. Welcome introduction
2. Role selection (Doctor, Nurse, Head Doctor, Operator, Admin)
3. Account creation (email/password or social login)
4. Email verification
5. Professional profile setup
6. Hospital/organization selection
7. Department assignment
8. Permission configuration
9. Completion celebration

## Features

- **Glass Morphism UI**: Modern, elegant design with blur effects
- **Role-Based Flows**: Different paths based on selected role
- **Progress Tracking**: Visual progress indicators and persistence
- **Animated Transitions**: Smooth animations and haptic feedback
- **Social Login**: Google and GitHub authentication options
- **Professional Verification**: License number validation for healthcare roles
- **Multi-Hospital Support**: Users can belong to multiple hospitals
- **Offline Support**: Progress saved locally with session timeout

## Usage

### Starting Onboarding

```typescript
// Navigate to onboarding
router.push('/onboarding/welcome');

// Or check if user needs onboarding
if (!user.onboardingCompleted) {
  router.replace('/onboarding/welcome');
}
```

### Using the Onboarding Hook

```typescript
import { useOnboardingFlow } from '@/modules/onboarding';

function MyScreen() {
  const {
    state,
    updateUserData,
    completeStep,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingFlow();

  // Update user data
  updateUserData({ name: 'Dr. Smith' });

  // Complete current step and proceed
  completeStep('profile-setup');
  goToNextStep();
}
```

### Customizing Steps

Edit `utils/constants.ts` to modify:
- Available roles and their features
- Required vs optional steps
- Specializations and departments
- Progress calculation logic

## Architecture

```
modules/onboarding/
├── screens/          # Main onboarding screens
├── components/       # Reusable UI components
├── hooks/           # Business logic hooks
├── types/           # TypeScript definitions
└── utils/           # Constants and helpers
```

## Design Principles

1. **Progressive Disclosure**: Only show relevant fields based on role
2. **Error Prevention**: Real-time validation and helpful hints
3. **Quick Progress**: Auto-advance when possible
4. **Clear Navigation**: Always show progress and allow going back
5. **Graceful Degradation**: Work offline with sync later

## Accessibility

- Full keyboard navigation support
- Screen reader announcements
- High contrast mode support
- Respects reduce motion preferences
- Large touch targets (44x44 minimum)

## Testing

```bash
# Run onboarding tests
bun test modules/onboarding

# E2E onboarding flow
bun test:e2e onboarding
```

## Future Enhancements

- [ ] Bulk user import for organizations
- [ ] Video tutorials at each step
- [ ] Voice-guided onboarding
- [ ] AI-powered profile suggestions
- [ ] Custom onboarding paths per organization