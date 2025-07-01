import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BentoCard } from '@/ui/components/Bento/BentoCard';

describe('BentoCard Component', () => {
  it('should render with title and content', () => {
    render(
      <BentoCard title="Test Card">
        <p>Card content</p>
      </BentoCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <BentoCard title="Test" className="custom-class">
        Content
      </BentoCard>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render action button when provided', () => {
    const handleClick = jest.fn();

    render(
      <BentoCard 
        title="Test Card"
        action={
          <button onClick={handleClick}>Action</button>
        }
      >
        Content
      </BentoCard>
    );

    const actionButton = screen.getByText('Action');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render with different variants', () => {
    const { rerender } = render(
      <BentoCard title="Test" variant="default">
        Content
      </BentoCard>
    );

    // Test each variant
    const variants = ['default', 'primary', 'secondary', 'danger', 'subtle'] as const;
    
    variants.forEach(variant => {
      rerender(
        <BentoCard title="Test" variant={variant}>
          Content
        </BentoCard>
      );
      
      // Card should be rendered without errors
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    render(
      <BentoCard title="Loading Card" isLoading>
        <p>This content should not be visible</p>
      </BentoCard>
    );

    expect(screen.getByText('Loading Card')).toBeInTheDocument();
    expect(screen.queryByText('This content should not be visible')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle expandable state', () => {
    render(
      <BentoCard title="Expandable Card" isExpandable defaultExpanded={false}>
        <p>Expandable content</p>
      </BentoCard>
    );

    // Content should be hidden initially
    expect(screen.queryByText('Expandable content')).not.toBeInTheDocument();

    // Click to expand
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Content should now be visible
    expect(screen.getByText('Expandable content')).toBeInTheDocument();
  });
});