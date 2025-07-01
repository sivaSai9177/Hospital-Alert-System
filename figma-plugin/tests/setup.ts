// Test Setup File
import '@testing-library/jest-dom';

// Mock Figma API
global.figma = {
  // Document
  root: {
    type: 'DOCUMENT',
    children: []
  },
  currentPage: {
    type: 'PAGE',
    name: 'Page 1',
    selection: [],
    children: []
  },
  
  // Node creation
  createRectangle: jest.fn(() => ({
    type: 'RECTANGLE',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: []
  })),
  createText: jest.fn(() => ({
    type: 'TEXT',
    characters: '',
    fontSize: 16,
    fontName: { family: 'Inter', style: 'Regular' }
  })),
  createFrame: jest.fn(() => ({
    type: 'FRAME',
    children: [],
    appendChild: jest.fn()
  })),
  
  // Styles
  createPaintStyle: jest.fn(() => ({
    name: '',
    paints: []
  })),
  createTextStyle: jest.fn(() => ({
    name: '',
    fontSize: 16,
    fontName: { family: 'Inter', style: 'Regular' }
  })),
  
  // UI
  ui: {
    postMessage: jest.fn(),
    onmessage: null,
    show: jest.fn(),
    hide: jest.fn(),
    resize: jest.fn()
  },
  
  // Storage
  clientStorage: {
    getAsync: jest.fn(),
    setAsync: jest.fn()
  },
  
  // Utilities
  loadFontAsync: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  
  // User
  currentUser: {
    id: 'test-user',
    name: 'Test User'
  }
} as any;

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
})) as any;

// Mock performance
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now())
};