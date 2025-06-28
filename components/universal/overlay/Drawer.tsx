import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Pressable,
  PanResponder,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ViewStyle,
  StyleSheet,
  Text as RNText,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Symbol } from '@/components/universal/display/Symbols';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useAnimationStore } from '@/lib/stores/animation-store';
import { haptic } from '@/lib/ui/haptics';
import { cn } from '@/lib/core/utils';
import { Text as UniversalText } from '@/components/universal/typography/Text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedView = Animated.View;
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export type DrawerAnimationType = 'slide' | 'fade' | 'scale' | 'none';

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  animationDuration?: number;
  swipeEnabled?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showHandle?: boolean;
  style?: ViewStyle;
  overlayStyle?: ViewStyle;
  testID?: string;
  
  // Animation props
  animated?: boolean;
  animationType?: DrawerAnimationType;
  useHaptics?: boolean;
  animationConfig?: {
    duration?: number;
    spring?: { damping: number; stiffness: number };
  };
  
  // New prop to disable Modal wrapper
  disableModal?: boolean;
}

const DRAWER_SIZES = {
  sm: 280,
  md: 360,
  lg: 480,
  full: '100%' as const,
};

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export const Drawer = React.forwardRef<View, DrawerProps>(
  (
    {
      visible,
      onClose,
      position = 'left',
      size = 'md',
      children,
      animationDuration = 300,
      swipeEnabled = true,
      closeOnBackdrop = true,
      closeOnEscape = true,
      showHandle = true,
      style,
      overlayStyle,
      testID,
      animated = true,
      animationType = 'slide',
      useHaptics = true,
      animationConfig,
      disableModal = false,
    },
    ref
  ) => {
    const { spacing } = useSpacing();
    const { shouldAnimate } = useAnimationStore();
    const insets = useSafeAreaInsets();
    
    const getDrawerSize = () => {
      if (size === 'full') return position === 'left' || position === 'right' ? SCREEN_WIDTH : SCREEN_HEIGHT;
      return DRAWER_SIZES[size];
    };
    
    const drawerSize = getDrawerSize();
    
    const getInitialTranslateValue = () => {
      const baseSize = typeof drawerSize === 'number' ? drawerSize : SCREEN_WIDTH;
      switch (position) {
        case 'left':
          return -baseSize;
        case 'right':
          return baseSize;
        case 'top':
          return -baseSize;
        case 'bottom':
          return baseSize;
        default:
          return -baseSize;
      }
    };
    
    console.log('[Drawer] Drawer size:', drawerSize, 'position:', position, 'initial translate:', getInitialTranslateValue());
    
    // Use React Native Animated API
    const translateX = useRef(new Animated.Value(getInitialTranslateValue())).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const [backdropEnabled, setBackdropEnabled] = React.useState(false);
    
    // Add listener for debugging
    useEffect(() => {
      const listener = translateX.addListener(({ value }) => {
        console.log('[Drawer] translateX value:', value);
      });
      return () => translateX.removeListener(listener);
    }, [translateX]);
    
    // For now, disable pan responder to simplify debugging
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
      })
    ).current;
    
    const handleClose = useCallback(() => {
      console.log('[Drawer] handleClose called');
      // Haptic feedback for drawer close
      if (useHaptics && Platform.OS !== 'web') {
        haptic('light');
      }
      
      setBackdropEnabled(false);
      
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: getInitialTranslateValue(),
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
    }, [animationDuration, onClose, overlayOpacity, translateX, useHaptics]);
    
    useEffect(() => {
      const initialValue = getInitialTranslateValue();
      console.log('[Drawer] visible changed:', visible, 'initial value:', initialValue);
      
      if (visible) {
        // Reset position first (important for Android)
        translateX.setValue(initialValue);
        overlayOpacity.setValue(0);
        
        // Disable backdrop initially
        setBackdropEnabled(false);
        
        console.log('[Drawer] Starting open animation from', initialValue, 'to 0');
        
        // Open drawer
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: animationDuration,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: true,
          }),
        ]).start((finished) => {
          console.log('[Drawer] Open animation complete, finished:', finished);
          if (finished) {
            setBackdropEnabled(true);
            console.log('[Drawer] Backdrop enabled');
          }
        });
      } else {
        // Reset states when closing
        setBackdropEnabled(false);
        translateX.setValue(initialValue);
        overlayOpacity.setValue(0);
      }
    }, [visible, animationDuration, overlayOpacity, translateX]);
    
    useEffect(() => {
      if (Platform.OS === 'web' && closeOnEscape) {
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && visible) {
            handleClose();
          }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [visible, closeOnEscape, handleClose]);
    
    const getDrawerStyle = (): ViewStyle => {
      const isHorizontal = position === 'left' || position === 'right';
      const baseStyle: ViewStyle = {
        position: 'absolute',
        backgroundColor: '#ffffff',
        zIndex: 10001,
        elevation: 999,
        ...Platform.select({
          ios: {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          },
          android: {
            elevation: 999,
          },
          default: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
        }),
      };
      
      switch (position) {
        case 'left':
          return {
            ...baseStyle,
            left: 0,
            top: 0,
            bottom: 0,
            width: drawerSize,
            paddingLeft: insets.left,
          };
        case 'right':
          return {
            ...baseStyle,
            right: 0,
            top: 0,
            bottom: 0,
            width: drawerSize,
            paddingRight: insets.right,
          };
        case 'top':
          return {
            ...baseStyle,
            top: 0,
            left: 0,
            right: 0,
            height: drawerSize,
            paddingTop: insets.top,
          };
        case 'bottom':
          return {
            ...baseStyle,
            bottom: 0,
            left: 0,
            right: 0,
            height: drawerSize,
            paddingBottom: insets.bottom,
          };
      }
    };
    
    // Get transform style for drawer
    const getTransformStyle = () => {
      // Return empty object - we'll apply transform directly
      return {};
    };
    
    const renderHandle = () => {
      if (!showHandle) return null;
      
      const isHorizontal = position === 'left' || position === 'right';
      
      const handleStyle: ViewStyle = {
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: isHorizontal ? 0 : spacing[2],
        marginHorizontal: isHorizontal ? spacing[2] : 0,
        backgroundColor: '#999',
        opacity: 0.3,
        ...(isHorizontal
          ? { width: 4, height: 40 }
          : { width: 40, height: 4 }),
      };
      
      return <View style={handleStyle} />;
    };
    
    if (!visible) {
      console.log('[Drawer] Not rendering - not visible');
      return null;
    }
    
    console.log('[Drawer] Rendering drawer with style:', getDrawerStyle());
    
    const drawerContent = (
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 998 }]}>
        <TouchableWithoutFeedback
          onPress={closeOnBackdrop && backdropEnabled ? handleClose : undefined}
          disabled={!closeOnBackdrop || !backdropEnabled}
        >
          <AnimatedView
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: overlayOpacity,
                zIndex: 9998,
              },
              overlayStyle,
            ]}
          />
        </TouchableWithoutFeedback>
        
        <AnimatedView
          ref={ref}
          style={[
            getDrawerStyle(),
            { 
              backgroundColor: '#ffffff',
              zIndex: 10002,
              elevation: 1000,
            },
            {
              transform: position === 'left' || position === 'right'
                ? [{ translateX: translateX }]
                : [{ translateY: translateX }],
            },
            style
          ]}
          {...panResponder.panHandlers}
        >
          {(position === 'right' || position === 'bottom') && renderHandle()}
          
          <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
            {children}
          </View>
          
          {(position === 'left' || position === 'top') && renderHandle()}
        </AnimatedView>
      </View>
    );
    
    if (disableModal) {
      return drawerContent;
    }
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        statusBarTranslucent={true}
        animationType="none"
        presentationStyle="overFullScreen"
        onShow={() => {
          console.log('[Drawer] Modal onShow called');
        }}
        testID={testID}
      >
        {drawerContent}
      </Modal>
    );
  }
);

Drawer.displayName = 'Drawer';

// Helper component for drawer header
export interface DrawerHeaderProps {
  title?: string;
  onClose?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  animated?: boolean;
  useHaptics?: boolean;
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({
  title,
  onClose,
  children,
  style,
  animated = true,
  useHaptics = true,
}) => {
  const { spacing } = useSpacing();
  
  const handleClose = () => {
    if (useHaptics && Platform.OS !== 'web') {
      haptic('selection');
    }
    onClose?.();
  };
  
  return (
    <View
      className="flex-row items-center justify-between border-b border-border"
      style={[
        {
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
        },
        style,
      ]}
    >
      {children || (
        <>
          {title && (
            <UniversalText size="lg" weight="semibold" className="text-foreground">
              {title}
            </UniversalText>
          )}
          {onClose && (
            <TouchableOpacity
              onPress={handleClose}
              style={{
                padding: spacing[2],
                borderRadius: spacing[2],
              }}
            >
              <Symbol name="xmark" size={24} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

// Helper component for drawer content
export interface DrawerContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const DrawerContent: React.FC<DrawerContentProps> = ({ children, style }) => {
  const { spacing } = useSpacing();
  
  return (
    <View style={[{ padding: spacing[4] as any, flex: 1 }, style] as any}>
      {children}
    </View>
  );
};

// Helper component for drawer footer
export interface DrawerFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const DrawerFooter: React.FC<DrawerFooterProps> = ({ children, style }) => {
  const { spacing } = useSpacing();
  
  return (
    <View
      className="border-t border-border"
      style={[
        {
          padding: spacing[4] as any,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};