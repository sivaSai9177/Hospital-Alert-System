import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string | number;
  variant?: 'default' | 'minimal';
  showScrollbar?: boolean;
  fade?: boolean;
}

export const ScrollContainer: React.FC<ScrollContainerProps> = ({
  children,
  className,
  maxHeight = '100%',
  variant = 'default',
  showScrollbar = true,
  fade = true
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);
  const [isAtTop, setIsAtTop] = React.useState(true);
  const [isAtBottom, setIsAtBottom] = React.useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const scrollable = scrollHeight > clientHeight;
    
    setIsScrollable(scrollable);
    setIsAtTop(scrollTop <= 0);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      // Create a ResizeObserver to detect content changes
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(scrollElement);
      
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, []);

  const scrollbarClasses = {
    default: 'scrollbar-thin scrollbar-thumb-figma-border scrollbar-track-transparent',
    minimal: 'scrollbar-none hover:scrollbar-thin'
  };

  return (
    <div className={cn('relative', className)}>
      {/* Top fade gradient */}
      {fade && isScrollable && !isAtTop && (
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-figma-bg to-transparent pointer-events-none z-10" />
      )}
      
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={cn(
          'overflow-y-auto overflow-x-hidden',
          showScrollbar && scrollbarClasses[variant],
          'scroll-smooth'
        )}
        style={{
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
        }}
      >
        {children}
      </div>
      
      {/* Bottom fade gradient */}
      {fade && isScrollable && !isAtBottom && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-figma-bg to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
};

// Utility hook for programmatic scrolling
export const useScrollTo = (ref: React.RefObject<HTMLDivElement>) => {
  const scrollToTop = () => {
    if (ref.current) {
      ref.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (ref.current) {
      ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToElement = (element: HTMLElement) => {
    if (ref.current && element) {
      const offsetTop = element.offsetTop - ref.current.offsetTop;
      ref.current.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };

  return { scrollToTop, scrollToBottom, scrollToElement };
};