import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  ViewStyle,
  TextStyle,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { Input } from './Input';
import { Select, type SelectOption } from './Select';
import { cn } from '@/lib/core/utils';
import { useSpacing } from '@/lib/stores/spacing-store';
import { Symbol } from '@/components/universal/display/Symbols';
import { useAnimationStore } from '@/lib/stores/animation-store';
import { haptic } from '@/lib/ui/haptics';
import { useShadow } from '@/hooks/useShadow';
import { useTheme } from '@/lib/theme';
import { HStack } from '@/components/universal/layout';

export type DatePickerAnimationType = 'slide' | 'fade' | 'scale' | 'none';
export type CaptionLayout = 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'buttons';

export interface DatePickerProps {
  value?: Date | null;
  onValueChange?: (date: Date | null) => void;
  onChange?: (date: Date | null) => void; // Alias for onValueChange
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  minimumDate?: Date; // Alias for minDate
  maximumDate?: Date; // Alias for maxDate
  disabled?: boolean;
  format?: string;
  showTimePicker?: boolean;
  locale?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'filled' | 'ghost';
  className?: string;
  shadow?: 'sm' | 'base' | 'md' | 'lg' | 'none';
  style?: ViewStyle;
  inputStyle?: ViewStyle;
  calendarStyle?: ViewStyle;
  testID?: string;
  error?: string; // Add error prop
  captionLayout?: CaptionLayout; // New prop for header layout
  yearRange?: { start: number; end: number }; // Range of years to show
  
  // Animation props
  animated?: boolean;
  animationType?: DatePickerAnimationType;
  animationDuration?: number;
  calendarAnimation?: 'slide' | 'fade' | 'scale';
  dateSelectionAnimation?: boolean;
  monthTransition?: 'slide' | 'fade';
  useHaptics?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AnimatedView = Animated.View;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Size configurations
const sizeConfig = {
  sm: {
    fontSize: 'xs' as const,
    padding: 8,
    daySize: 32,
  },
  default: {
    fontSize: 'sm' as const,
    padding: 12,
    daySize: 40,
  },
  lg: {
    fontSize: 'base' as const,
    padding: 16,
    daySize: 48,
  },
};

// Variant classes
const variantClasses = {
  default: {
    input: 'border border-input bg-background',
    calendar: 'bg-background border border-border',
  },
  filled: {
    input: 'border-0 bg-muted',
    calendar: 'bg-card border-0',
  },
  ghost: {
    input: 'border-0 bg-transparent',
    calendar: 'bg-background/95 border border-border/50',
  },
};

// Day cell component for animations
const AnimatedDayCell = ({ 
  day, 
  isSelected, 
  isToday, 
  isDisabled, 
  onPress,
  animated,
  shouldAnimate,
  animationDuration,
  size,
}: any) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isDisabled ? 0.3 : 1);
  
  const handlePress = () => {
    if (!isDisabled) {
      if (animated && shouldAnimate()) {
        scale.value = withSequence(
          withSpring(0.9, { damping: 10, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 300 })
        );
      }
      onPress();
    }
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  const dayClasses = cn(
    'items-center justify-center rounded-lg',
    isSelected && 'bg-primary',
    isToday && !isSelected && 'border border-primary',
    isDisabled && 'opacity-30',
    !isDisabled && !isSelected && Platform.OS === 'web' && 'hover:bg-muted'
  );
  
  return (
    <AnimatedPressable
      onPress={handlePress}
      className={dayClasses}
      style={[
        {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        },
        animated && shouldAnimate() ? animatedStyle : {},
      ]}
    >
      <Text
        size={sizeConfig[size].fontSize}
        weight={isSelected || isToday ? 'semibold' : 'normal'}
        className={cn(
          isSelected ? 'text-primary-foreground' : 'text-foreground'
        )}
      >
        {day}
      </Text>
    </AnimatedPressable>
  );
};

export const DatePicker = React.forwardRef<View, DatePickerProps>(({
  value,
  onValueChange,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  minimumDate,
  maximumDate,
  disabled = false,
  format = 'MM/DD/YYYY',
  showTimePicker = false,
  locale = 'en-US',
  size = 'default',
  variant = 'default',
  className,
  shadow = 'lg',
  style,
  inputStyle,
  calendarStyle,
  testID,
  error,
  captionLayout = 'buttons',
  yearRange,
  // Animation props
  animated = true,
  animationType = 'slide',
  animationDuration = 200,
  calendarAnimation = 'slide',
  dateSelectionAnimation = true,
  monthTransition = 'slide',
  useHaptics = true,
}, ref) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const { shouldAnimate, enableAnimations } = useAnimationStore();
  const shadowStyle = useShadow(shadow);
  const [isOpen, setIsOpen] = useState(false);
  // Ensure value is a valid Date object
  const validDate = value instanceof Date && !isNaN(value.getTime()) ? value : null;
  
  const [selectedDate, setSelectedDate] = useState(validDate || new Date());
  const [currentMonth, setCurrentMonth] = useState(validDate?.getMonth() || new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(validDate?.getFullYear() || new Date().getFullYear());
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation values for input trigger
  const chevronRotation = useSharedValue(0);
  const inputScale = useSharedValue(1);
  
  // Handle prop aliases
  const handleChange = onChange || onValueChange;
  const minDateValue = minimumDate || minDate;
  const maxDateValue = maximumDate || maxDate;
  
  const config = sizeConfig[size];
  const classes = variantClasses[variant];
  
  // Generate year options for dropdown
  const currentYearValue = new Date().getFullYear();
  const startYear = yearRange?.start || currentYearValue - 100;
  const endYear = yearRange?.end || currentYearValue + 50;
  
  const yearOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [];
    for (let year = endYear; year >= startYear; year--) {
      // Check if this year is disabled based on min/max dates
      let isDisabled = false;
      
      if (minDateValue && year < minDateValue.getFullYear()) {
        isDisabled = true;
      }
      if (maxDateValue && year > maxDateValue.getFullYear()) {
        isDisabled = true;
      }
      
      options.push({
        label: String(year),
        value: String(year),
        disabled: isDisabled,
      });
    }
    return options;
  }, [startYear, endYear, minDateValue, maxDateValue]);
  
  // Generate month options
  const monthOptions: SelectOption[] = useMemo(() => {
    return MONTHS.map((month, index) => {
      // Check if this month is disabled based on min/max dates
      let isDisabled = false;
      
      if (minDateValue || maxDateValue) {
        const firstDayOfMonth = new Date(currentYear, index, 1);
        const lastDayOfMonth = new Date(currentYear, index + 1, 0);
        
        if (minDateValue && lastDayOfMonth < minDateValue) {
          isDisabled = true;
        }
        if (maxDateValue && firstDayOfMonth > maxDateValue) {
          isDisabled = true;
        }
      }
      
      return {
        label: month,
        value: String(index),
        disabled: isDisabled,
      };
    });
  }, [currentYear, minDateValue, maxDateValue]);
  
  // Sync state when value prop changes
  useEffect(() => {
    const validDate = value instanceof Date && !isNaN(value.getTime()) ? value : null;
    if (validDate) {
      setSelectedDate(validDate);
      setCurrentMonth(validDate.getMonth());
      setCurrentYear(validDate.getFullYear());
    }
  }, [value]);
  
  // Update animations when open state changes
  useEffect(() => {
    if (enableAnimations) {
      chevronRotation.value = withSpring(isOpen ? 180 : 0, {
        damping: 15,
        stiffness: 300,
      });
    }
  }, [isOpen, enableAnimations, chevronRotation]);
  
  // Format date
  const formatDate = (date: Date) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return format
      .replace('MM', month)
      .replace('DD', day)
      .replace('YYYY', String(year));
  };
  
  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get first day of month
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [currentMonth, currentYear]);
  
  // Handle trigger press
  const handleTriggerPress = () => {
    if (!disabled) {
      setIsOpen(true);
      if (useHaptics) {
        haptic('light');
      }
    }
  };
  
  // Handle hover effects
  const handleHoverIn = () => {
    if (!disabled && Platform.OS === 'web') {
      setIsHovered(true);
      if (enableAnimations) {
        inputScale.value = withSpring(1.02, {
          damping: 20,
          stiffness: 300,
        });
      }
    }
  };
  
  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      setIsHovered(false);
      if (enableAnimations) {
        inputScale.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
        });
      }
    }
  };
  
  // Handle date selection
  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    
    if (minDateValue && newDate < minDateValue) return;
    if (maxDateValue && newDate > maxDateValue) return;
    
    setSelectedDate(newDate);
    if (handleChange) {
      handleChange(newDate);
    }
    
    if (useHaptics) {
      haptic('selection');
    }
    
    setTimeout(() => setIsOpen(false), 150);
  };
  
  // Handle today button
  const handleToday = () => {
    const today = new Date();
    // Normalize to start of day for comparison
    today.setHours(0, 0, 0, 0);
    
    // Check if today is within allowed date range
    if (minDateValue || maxDateValue) {
      const minDate = minDateValue ? new Date(minDateValue) : null;
      const maxDate = maxDateValue ? new Date(maxDateValue) : null;
      
      if (minDate) {
        minDate.setHours(0, 0, 0, 0);
        if (today < minDate) {
          if (useHaptics) {
            haptic('error');
          }
          return;
        }
      }
      
      if (maxDate) {
        maxDate.setHours(23, 59, 59, 999);
        if (today > maxDate) {
          if (useHaptics) {
            haptic('error');
          }
          return;
        }
      }
    }
    
    setSelectedDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    
    if (handleChange) {
      handleChange(today);
    }
    
    if (useHaptics) {
      haptic('success');
    }
    
    setTimeout(() => setIsOpen(false), 150);
  };
  
  // Handle month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
    
    if (useHaptics) {
      haptic('light');
    }
  };
  
  // Handle month change from dropdown
  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value, 10);
    setCurrentMonth(newMonth);
    if (useHaptics) {
      haptic('light');
    }
  };
  
  // Handle year change from dropdown
  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    setCurrentYear(newYear);
    if (useHaptics) {
      haptic('light');
    }
  };
  
  // Input classes
  const inputClasses = cn(
    'flex-row items-center justify-between rounded-lg transition-all duration-200',
    classes.input,
    disabled && 'opacity-50',
    Platform.OS === 'web' && !disabled && 'hover:border-ring',
    className
  );
  
  // Calendar classes
  const calendarClasses = cn(
    'rounded-lg shadow-xl',
    classes.calendar
  );
  
  // Animated styles
  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));
  
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));
  
  const enteringAnimation = animationType === 'fade' ? FadeIn : 
                           animationType === 'scale' ? FadeIn.springify() :
                           SlideInDown;
  
  const exitingAnimation = animationType === 'fade' ? FadeOut :
                          animationType === 'scale' ? FadeOut :
                          SlideInUp;
  
  return (
    <View>
      {/* Date Input */}
      <AnimatedPressable
        ref={ref}
        onPress={handleTriggerPress}
        onPressIn={() => {
          if (!disabled && enableAnimations) {
            inputScale.value = withSpring(0.98, {
              damping: 20,
              stiffness: 400,
            });
          }
        }}
        onPressOut={() => {
          if (!disabled && enableAnimations) {
            inputScale.value = withSpring(isHovered ? 1.02 : 1, {
              damping: 20,
              stiffness: 400,
            });
          }
        }}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        className={inputClasses}
        style={[
          {
            backgroundColor: theme.muted,
            padding: config.padding,
            borderColor: error ? theme.destructive : isHovered ? theme.ring : theme.border,
            borderWidth: error ? 2 : 1,
            borderRadius: spacing[2],
            minHeight: config.daySize,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: Platform.OS === 'web' ? (disabled ? 'not-allowed' : 'pointer') : undefined,
          },
          inputStyle,
          style,
          enableAnimations ? inputAnimatedStyle : {},
        ]}
        testID={testID}
      >
        <Text
          size={config.fontSize}
          className={value ? 'text-foreground' : 'text-muted-foreground'}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <AnimatedView style={chevronAnimatedStyle}>
          <Symbol
            name="calendar"
            size={config.fontSize === 'xs' ? 16 : config.fontSize === 'sm' ? 18 : 20}
            color={error ? theme.destructive : theme.mutedForeground}
          />
        </AnimatedView>
      </AnimatedPressable>
      {error && (
        <Text size="xs" colorTheme="destructive" style={{ marginTop: spacing[1] }}>
          {error}
        </Text>
      )}
      
      {/* Calendar Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setIsOpen(false)}
        >
          <AnimatedView
            entering={animated && shouldAnimate() ? enteringAnimation : undefined}
            exiting={animated && shouldAnimate() ? exitingAnimation : undefined}
            className={calendarClasses}
            style={[
              {
                width: Platform.OS === 'web' ? spacing[96] : '90%',
                maxWidth: captionLayout !== 'buttons' ? 450 : 400,
                minWidth: captionLayout !== 'buttons' ? 350 : 320,
                padding: spacing[4],
                backgroundColor: theme.background,
              },
              shadowStyle,
              calendarStyle,
            ]}
          >
            {/* Header */}
            <View className="mb-4">
              {captionLayout === 'buttons' ? (
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => navigateMonth('prev')}
                    className="p-2 rounded-lg"
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                  >
                    <Symbol name="chevron.left" size={20} color={theme.foreground} />
                  </Pressable>
                  
                  <Text size="lg" weight="semibold" colorTheme="foreground">
                    {MONTHS[currentMonth]} {currentYear}
                  </Text>
                  
                  <Pressable
                    onPress={() => navigateMonth('next')}
                    className="p-2 rounded-lg"
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                  >
                    <Symbol name="chevron.right" size={20} color={theme.foreground} />
                  </Pressable>
                </View>
              ) : (
                <HStack gap={2} align="center" style={{ justifyContent: 'space-between' }}>
                  <Pressable
                    onPress={() => navigateMonth('prev')}
                    className="p-2 rounded-lg"
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                  >
                    <Symbol name="chevron.left" size={16} color={theme.foreground} />
                  </Pressable>
                  
                  <HStack gap={1.5} style={{ flex: 1, justifyContent: 'center' }}>
                    {(captionLayout === 'dropdown' || captionLayout === 'dropdown-months') && (
                      <View style={{ minWidth: 120 }}>
                        <Select
                          value={String(currentMonth)}
                          onValueChange={handleMonthChange}
                          options={monthOptions}
                          size="sm"
                          variant="ghost"
                          dropdownClassName="min-w-[150px]"
                        />
                      </View>
                    )}
                    
                    {captionLayout === 'dropdown' && (
                      <View style={{ minWidth: 80 }}>
                        <Select
                          value={String(currentYear)}
                          onValueChange={handleYearChange}
                          options={yearOptions}
                          size="sm"
                          variant="ghost"
                          dropdownClassName="min-w-[100px]"
                        />
                      </View>
                    )}
                    
                    {captionLayout === 'dropdown-years' && (
                      <HStack gap={1} align="center">
                        <Text size="base" weight="semibold" colorTheme="foreground">
                          {MONTHS[currentMonth]}
                        </Text>
                        <View style={{ minWidth: 80 }}>
                          <Select
                            value={String(currentYear)}
                            onValueChange={handleYearChange}
                            options={yearOptions}
                            size="sm"
                            variant="ghost"
                            dropdownClassName="min-w-[100px]"
                          />
                        </View>
                      </HStack>
                    )}
                    
                    {captionLayout === 'dropdown-months' && (
                      <Text size="base" weight="semibold" colorTheme="foreground">
                        {currentYear}
                      </Text>
                    )}
                  </HStack>
                  
                  <Pressable
                    onPress={() => navigateMonth('next')}
                    className="p-2 rounded-lg"
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                  >
                    <Symbol name="chevron.right" size={16} color={theme.foreground} />
                  </Pressable>
                </HStack>
              )}
            </View>
            
            {/* Weekdays */}
            <View className="flex-row mb-2">
              {WEEKDAYS.map((day) => (
                <View
                  key={day}
                  style={{ 
                    width: Platform.OS === 'web' ? '14.28%' : `${100/7}%`,
                    alignItems: 'center',
                  }}
                >
                  <Text size="xs" className="text-muted-foreground" weight="medium">
                    {day}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Calendar Days */}
            <View className="flex-row flex-wrap">
              {calendarDays.map((day, index) => {
                const dayWidth = Platform.OS === 'web' ? '14.28%' : `${100/7}%`;
                return (
                  <View
                    key={index}
                    style={{ 
                      width: dayWidth, 
                      padding: spacing[0.5],
                      aspectRatio: 1,
                    }}
                  >
                    {day && (
                      <AnimatedDayCell
                        day={day}
                        isSelected={
                          selectedDate &&
                          day === selectedDate.getDate() &&
                          currentMonth === selectedDate.getMonth() &&
                          currentYear === selectedDate.getFullYear()
                        }
                        isToday={
                          day === new Date().getDate() &&
                          currentMonth === new Date().getMonth() &&
                          currentYear === new Date().getFullYear()
                        }
                        isDisabled={
                          (minDateValue && new Date(currentYear, currentMonth, day) < minDateValue) ||
                          (maxDateValue && new Date(currentYear, currentMonth, day) > maxDateValue)
                        }
                        onPress={() => handleSelectDate(day)}
                        animated={animated}
                        shouldAnimate={shouldAnimate}
                        animationDuration={animationDuration}
                        size={size}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            
            {/* Actions */}
            <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onPress={handleToday}
                disabled={(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  if (minDateValue) {
                    const minDate = new Date(minDateValue);
                    minDate.setHours(0, 0, 0, 0);
                    if (today < minDate) return true;
                  }
                  
                  if (maxDateValue) {
                    const maxDate = new Date(maxDateValue);
                    maxDate.setHours(23, 59, 59, 999);
                    if (today > maxDate) return true;
                  }
                  
                  return false;
                })()}
              >
                Today
              </Button>
              
              <HStack gap={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => {
                    if (handleChange) {
                      handleChange(selectedDate);
                    }
                    setIsOpen(false);
                  }}
                >
                  OK
                </Button>
              </HStack>
            </View>
          </AnimatedView>
        </Pressable>
      </Modal>
    </View>
  );
});

DatePicker.displayName = 'DatePicker';