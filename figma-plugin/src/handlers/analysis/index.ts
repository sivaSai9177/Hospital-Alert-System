// Analysis Handler Exports

// Frame Operations
export {
  inspectFrame,
  inspectSelectedFrame,
  getAllFrames,
  getFrameIssues,
  getCurrentSelectionInfo,
  getAllPages,
  getElementDetails,
  getSelectionGroups
} from './frame-inspector';

export {
  editFrame,
  editSelectedFrame,
  createPresetFrame,
  fixFrameIssues
} from './frame-editor';

// Component Analysis
export { analyzeSelectedComponents } from './component-analyzer';

// Color Extraction
export {
  extractColors,
  syncExtractedColors,
  applyExtractedTheme
} from './color-extractor-simple';

// Re-export types
export type {
  FrameInspectionResult,
  FrameIssue,
  ElementDetails,
  SelectionInfo
} from '../../types/messages';