import { extractDesignTokens } from '@handlers/tokens/token-extractor';

describe('Token Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDesignTokens', () => {
    it('should extract color tokens from solid fills', async () => {
      // Mock a rectangle with a solid fill
      const mockNode = {
        type: 'RECTANGLE',
        name: 'Primary Button',
        fills: [{
          type: 'SOLID',
          color: { r: 0, g: 0.5, b: 1 },
          opacity: 1
        }]
      };

      figma.currentPage.selection = [mockNode as any];

      const result = await extractDesignTokens();

      expect(result.colors).toHaveLength(1);
      expect(result.colors[0]).toMatchObject({
        name: expect.stringContaining('primary'),
        value: '#0080ff',
        rgb: { r: 0, g: 0.5, b: 1 }
      });
    });

    it('should extract typography tokens from text nodes', async () => {
      // Mock a text node
      const mockTextNode = {
        type: 'TEXT',
        name: 'Heading 1',
        characters: 'Sample Text',
        fontSize: 32,
        fontName: { family: 'Inter', style: 'Bold' },
        lineHeight: { unit: 'PIXELS', value: 40 },
        letterSpacing: { unit: 'PIXELS', value: 0 }
      };

      figma.currentPage.selection = [mockTextNode as any];
      (figma.loadFontAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await extractDesignTokens();

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0]).toMatchObject({
        name: expect.stringContaining('heading'),
        fontSize: 32,
        fontFamily: 'Inter',
        lineHeight: 40
      });
    });

    it('should handle mixed fills correctly', async () => {
      const mockNode = {
        type: 'RECTANGLE',
        name: 'Mixed Fill',
        fills: figma.mixed
      };

      figma.currentPage.selection = [mockNode as any];

      const result = await extractDesignTokens();

      expect(result.colors).toHaveLength(0);
    });

    it('should extract spacing tokens from frames', async () => {
      const mockFrame = {
        type: 'FRAME',
        name: 'Card Component',
        paddingTop: 16,
        paddingRight: 24,
        paddingBottom: 16,
        paddingLeft: 24,
        itemSpacing: 12
      };

      figma.currentPage.selection = [mockFrame as any];

      const result = await extractDesignTokens();

      expect(result.spacing).toBeDefined();
      expect(result.spacing).toContainEqual(
        expect.objectContaining({
          name: expect.stringContaining('padding'),
          value: 16
        })
      );
    });
  });
});