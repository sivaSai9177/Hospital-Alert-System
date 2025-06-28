import React from 'react';
import { Pressable, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography';
import { Symbol } from '@/components/universal/display/Symbols';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useAnimationStore } from '@/lib/stores/animation-store';
import { haptic } from '@/lib/ui/haptics';
import { ActivityIndicator } from '@/components/universal/display';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SelectionButtonProps {
  // Core props
  value: string;
  selected: boolean;
  onPress: () => void;
  
  // Display props
  icon?: string | React.ReactNode;
  label: string;
  description?: string;
  
  // Style variants
  variant?: 'card' | 'checkbox' | 'radio';
  size?: 'sm' | 'md' | 'lg';
  layout?: 'vertical' | 'horizontal';
  
  // Colors
  color?: string;
  
  // Features
  showCheckmark?: boolean;
  disabled?: boolean;
  loading?: boolean;
  
  // Grid support
  aspectRatio?: number;
  padding?: number | string;
}

export function SelectionButton({
  value,
  selected,
  onPress,
  icon,
  label,
  description,
  variant = 'card',
  size = 'md',
  layout = 'vertical',
  color,
  showCheckmark = true,
  disabled = false,
  loading = false,
  aspectRatio,
  padding,
}: SelectionButtonProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { shouldAnimate } = useAnimationStore();
  
  
  // Animation values
  const scale = useSharedValue(1);
  const checkmarkScale = useSharedValue(selected ? 1 : 0);
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Update checkmark animation when selected changes
  React.useEffect(() => {
    if (shouldAnimate()) {
      checkmarkScale.value = withSpring(selected ? 1 : 0, {
        damping: 15,
        stiffness: 300,
      });
    } else {
      checkmarkScale.value = selected ? 1 : 0;
    }
  }, [selected, shouldAnimate, checkmarkScale]);
  
  // Size configuration
  const sizeConfig = {
    sm: {
      padding: spacing[2],
      iconSize: 28,
      textSize: 'xs' as const,
      checkmarkSize: spacing[4],
      borderRadius: spacing[2],
    },
    md: {
      padding: spacing[3],
      iconSize: 32,
      textSize: 'sm' as const,
      checkmarkSize: spacing[5],
      borderRadius: spacing[3],
    },
    lg: {
      padding: spacing[4],
      iconSize: 36,
      textSize: 'base' as const,
      checkmarkSize: spacing[6],
      borderRadius: spacing[3],
    },
  };
  
  const config = sizeConfig[size];
  const selectedColor = color || theme.primary;
  
  // Handle press
  const handlePress = () => {
    if (disabled || loading) return;
    
    haptic('light');
    
    if (shouldAnimate()) {
      scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 400,
      });
      
      setTimeout(() => {
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 400,
        });
      }, 100);
    }
    
    onPress();
  };
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkScale.value,
  }));
  
  // Render icon
  const renderIcon = () => {
    if (loading) {
      return <ActivityIndicator size="sm" color={selected ? selectedColor : theme.mutedForeground} />;
    }
    
    if (!icon) return null;
    
    if (typeof icon === 'string') {
      // Check if it's an emoji - better detection for complex emojis
      const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component})+$/u;
      if (emojiRegex.test(icon) || icon.length <= 4) {
        return (
          <Text size={size === 'sm' ? 'xl' : size === 'md' ? '2xl' : '3xl'}>
            {icon}
          </Text>
        );
      }
      // Assume it's a symbol name
      return (
        <Symbol 
          name={icon as any} 
          size={config.iconSize} 
          color={selected ? selectedColor : theme.mutedForeground}
        />
      );
    }
    
    return icon;
  };
  
  // Variant-specific styles
  const getVariantStyles = () => {
    const baseStyles = {
      backgroundColor: variant === 'card' ? theme.muted : theme.card,
      borderColor: selected ? selectedColor : isHovered ? theme.primary : theme.border,
      borderWidth: selected ? 2 : 1,
      borderRadius: config.borderRadius,
      padding: typeof padding === 'number' ? padding : config.padding,
      opacity: disabled ? 0.5 : 1,
      minHeight: config.iconSize + config.padding * 2, // Ensure minimum touch target
    };
    
    switch (variant) {
      case 'checkbox':
        return {
          ...baseStyles,
          aspectRatio: undefined,
        };
      case 'radio':
        return {
          ...baseStyles,
          borderRadius: 999,
          aspectRatio: 1,
        };
      case 'card':
      default:
        return {
          ...baseStyles,
          aspectRatio: layout === 'horizontal' ? undefined : aspectRatio,
          paddingVertical: layout === 'horizontal' ? config.padding : baseStyles.padding,
          paddingHorizontal: layout === 'horizontal' ? config.padding * 1.5 : baseStyles.padding,
        };
    }
  };
  
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => setIsHovered(true)}
      onPressOut={() => setIsHovered(false)}
      onHoverIn={() => Platform.OS === 'web' && setIsHovered(true)}
      onHoverOut={() => Platform.OS === 'web' && setIsHovered(false)}
      disabled={disabled}
      hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }} // Ensure no negative hit slop
      style={[
        {
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        },
        getVariantStyles(),
        animatedStyle,
      ]}
    >
      {/* Hover/Selected background overlay */}
      {(selected || isHovered) && !disabled && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: selected 
              ? selectedColor + '10' 
              : theme.primary + '05',
            borderRadius: config.borderRadius,
          }}
          pointerEvents="none"
        />
      )}
      
      {/* Selection indicator */}
      {showCheckmark && selected && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: config.padding / 2,
              right: config.padding / 2,
              backgroundColor: selectedColor,
              borderRadius: config.checkmarkSize / 2,
              width: config.checkmarkSize,
              height: config.checkmarkSize,
              alignItems: 'center',
              justifyContent: 'center',
            },
            checkmarkAnimatedStyle,
          ]}
          pointerEvents="none"
        >
          <Symbol 
            name="checkmark" 
            size={config.checkmarkSize * 0.6} 
            color={theme.primaryForeground}
          />
        </Animated.View>
      )}
      
      {/* Content */}
      <View
        style={{
          flexDirection: layout === 'horizontal' ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[layout === 'horizontal' ? 1.5 : 1.5],
          flex: 1,
        }}
        pointerEvents="none"
      >
        {renderIcon()}
        
        <View style={{ 
          flex: layout === 'horizontal' ? 1 : undefined,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text
            size={config.textSize}
            weight={selected ? 'semibold' : 'medium'}
            colorTheme={selected ? 'foreground' : 'mutedForeground'}
            align="center"
            numberOfLines={layout === 'horizontal' ? 1 : 2}
          >
            {label}
          </Text>
          
          {description && (
            <Text
              size="xs"
              colorTheme="mutedForeground"
              align={layout === 'horizontal' ? 'left' : 'center'}
              numberOfLines={1}
              style={{ marginTop: spacing[0.5] }}
            >
              {description}
            </Text>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

// Example usage:
/*
// Vertical card style (default)
<SelectionButton
  value="emergency"
  selected={selectedDepartment === 'emergency'}
  onPress={() => setSelectedDepartment('emergency')}
  icon="🚨"
  label="Emergency"
  color="#FF0000"
/>

// Horizontal checkbox style
<SelectionButton
  value="terms"
  selected={acceptedTerms}
  onPress={() => setAcceptedTerms(!acceptedTerms)}
  icon="checkmark.shield"
  label="I accept the terms and conditions"
  variant="checkbox"
  layout="horizontal"
  size="sm"
/>

// Radio button style
<SelectionButton
  value="male"
  selected={gender === 'male'}
  onPress={() => setGender('male')}
  icon="👨"
  label="Male"
  variant="radio"
/>
*/