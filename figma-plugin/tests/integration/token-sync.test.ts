import { extractDesignTokens } from '@handlers/tokens/token-extractor';
import { syncWithMCPServer } from '@handlers/sync/mcp-sync';
import { validateTokens } from '@/validators/token-validator';

// Mock fetch for MCP server communication
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Token Sync Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should extract, validate, and sync tokens end-to-end', async () => {
    // Setup: Create mock Figma nodes
    const mockNodes = [
      {
        type: 'RECTANGLE',
        name: 'Primary Color',
        fills: [{
          type: 'SOLID',
          color: { r: 0.2, g: 0.4, b: 1 },
          opacity: 1
        }]
      },
      {
        type: 'TEXT',
        name: 'Heading 1',
        characters: 'Sample Heading',
        fontSize: 32,
        fontName: { family: 'Inter', style: 'Bold' },
        lineHeight: { unit: 'PIXELS', value: 40 },
        letterSpacing: { unit: 'PIXELS', value: 0 }
      }
    ];

    figma.currentPage.selection = mockNodes as any;
    (figma.loadFontAsync as jest.Mock).mockResolvedValue(undefined);

    // Step 1: Extract tokens
    const tokens = await extractDesignTokens();
    
    expect(tokens).toMatchObject({
      colors: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          value: '#3366ff'
        })
      ]),
      typography: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          fontSize: 32
        })
      ])
    });

    // Step 2: Validate tokens
    const validation = validateTokens(tokens);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Step 3: Mock successful sync response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Tokens synced successfully',
        syncedCount: {
          colors: tokens.colors.length,
          typography: tokens.typography.length
        }
      })
    } as Response);

    // Step 4: Sync to MCP server
    const syncResult = await syncWithMCPServer(tokens, {
      direction: 'figma-to-code',
      autoSync: false,
      conflictResolution: 'prefer-figma',
      mcpServerUrl: 'http://localhost:3456'
    });

    // Verify sync request
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3456/api/tokens/sync',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('"colors"')
      })
    );

    // Verify sync result
    expect(syncResult).toMatchObject({
      success: true,
      message: 'Tokens synced successfully'
    });
  });

  it('should handle sync conflicts appropriately', async () => {
    // Setup: Mock conflict response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Conflict detected',
        conflicts: [
          {
            token: 'primary-color',
            local: '#3366ff',
            remote: '#0066ff'
          }
        ]
      })
    } as Response);

    const tokens = {
      colors: [{ name: 'primary-color', value: '#3366ff', rgb: { r: 0.2, g: 0.4, b: 1 } }],
      typography: [],
      spacing: [],
      effects: []
    };

    // Attempt sync with manual conflict resolution
    const syncResult = await syncWithMCPServer(tokens, {
      direction: 'figma-to-code',
      autoSync: false,
      conflictResolution: 'manual',
      mcpServerUrl: 'http://localhost:3456'
    });

    expect(syncResult).toMatchObject({
      success: false,
      error: expect.stringContaining('Conflict')
    });
  });

  it('should handle network errors gracefully', async () => {
    // Setup: Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const tokens = {
      colors: [],
      typography: [],
      spacing: [],
      effects: []
    };

    // Attempt sync
    const syncResult = await syncWithMCPServer(tokens, {
      direction: 'figma-to-code',
      autoSync: false,
      conflictResolution: 'prefer-figma',
      mcpServerUrl: 'http://localhost:3456'
    });

    expect(syncResult).toMatchObject({
      success: false,
      error: expect.stringContaining('Network error')
    });
  });
});