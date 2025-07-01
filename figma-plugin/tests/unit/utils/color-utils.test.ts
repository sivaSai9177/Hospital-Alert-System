import { rgbToHex, hexToRgb, generateColorName } from '@utils/color-utils';

describe('Color Utilities', () => {
  describe('rgbToHex', () => {
    it('should convert RGB to hex correctly', () => {
      expect(rgbToHex({ r: 1, g: 0, b: 0 })).toBe('#ff0000');
      expect(rgbToHex({ r: 0, g: 1, b: 0 })).toBe('#00ff00');
      expect(rgbToHex({ r: 0, g: 0, b: 1 })).toBe('#0000ff');
      expect(rgbToHex({ r: 0.5, g: 0.5, b: 0.5 })).toBe('#808080');
    });

    it('should handle edge cases', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
      expect(rgbToHex({ r: 1, g: 1, b: 1 })).toBe('#ffffff');
    });
  });

  describe('hexToRgb', () => {
    it('should convert hex to RGB correctly', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
    });

    it('should handle 3-character hex codes', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 1, g: 0, b: 0 });
      expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 1, b: 0 });
      expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 1 });
    });

    it('should handle hex codes without #', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 1, g: 0, b: 0 });
      expect(hexToRgb('f00')).toEqual({ r: 1, g: 0, b: 0 });
    });
  });

  describe('generateColorName', () => {
    it('should generate semantic color names', () => {
      expect(generateColorName('Primary Button', 0)).toBe('primary-button-bg');
      expect(generateColorName('Success Alert', 0)).toBe('success-alert-bg');
      expect(generateColorName('Text/Heading 1', 0)).toBe('text-heading-1');
    });

    it('should handle special characters', () => {
      expect(generateColorName('Primary / Blue', 0)).toBe('primary-blue-bg');
      expect(generateColorName('Color #1', 0)).toBe('color-1-bg');
      expect(generateColorName('Background (Dark)', 0)).toBe('background-dark-bg');
    });

    it('should add index for multiple colors', () => {
      expect(generateColorName('Button', 0)).toBe('button-bg');
      expect(generateColorName('Button', 1)).toBe('button-border');
      expect(generateColorName('Button', 2)).toBe('button-2');
    });
  });
});