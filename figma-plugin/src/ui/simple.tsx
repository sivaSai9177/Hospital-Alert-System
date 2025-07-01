console.log('🎯 Simple UI starting...');

// Function to safely attach event handlers
function attachEventHandlers() {
  console.log('🔧 Attaching event handlers...');
  
  // Extract button handler
  const extractBtn = document.getElementById('extract-btn');
  if (extractBtn) {
    console.log('✅ Extract button found');
    extractBtn.onclick = () => {
      console.log('🔍 Extract button clicked');
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = '<p style="color: #666;">Extracting tokens...</p>';
      }
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'EXTRACT_TOKENS' 
        } 
      }, '*');
    };
  }
  
  // Sync to code button handler
  const syncToCodeBtn = document.getElementById('sync-to-code-btn');
  if (syncToCodeBtn) {
    console.log('✅ Sync to code button found');
    syncToCodeBtn.onclick = () => {
      console.log('📤 Sync to code button clicked');
      
      if (!currentTokens) {
        alert('No tokens to sync. Please extract tokens first.');
        return;
      }
      
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = '<p style="color: #666;">Syncing tokens to code...</p>';
      }
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'SYNC_TO_CODE',
          data: {
            tokens: currentTokens,
            config: {
              direction: 'figma-to-code',
              autoSync: false,
              conflictResolution: 'manual'
            }
          }
        } 
      }, '*');
    };
  }
  
  // Sync from code button handler
  const syncFromCodeBtn = document.getElementById('sync-from-code-btn');
  if (syncFromCodeBtn) {
    console.log('✅ Sync from code button found');
    syncFromCodeBtn.onclick = () => {
      console.log('📥 Sync from code button clicked');
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = '<p style="color: #666;">Syncing tokens from code...</p>';
      }
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'SYNC_FROM_CODE' 
        } 
      }, '*');
    };
  }
  
  // Export button handler
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    console.log('✅ Export button found');
    exportBtn.onclick = () => {
      if (!currentTokens) {
        alert('No tokens to export. Please extract tokens first.');
        return;
      }
      
      const exportData = {
        tokens: currentTokens,
        metadata: {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          source: 'figma-plugin'
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `design-tokens-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = `
          <div style="padding: 16px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; color: #155724;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px;">✅ Tokens Exported Successfully!</h4>
            <p style="margin: 0; font-size: 12px;">
              Saved ${Object.keys(currentTokens).reduce((acc, key) => acc + ((currentTokens[key] && currentTokens[key].length) || 0), 0)} tokens to JSON file.
            </p>
          </div>
        `;
      }
    };
  }
  
  // Generate pages button handler
  const generatePagesBtn = document.getElementById('generate-pages-btn');
  if (generatePagesBtn) {
    console.log('✅ Generate pages button found');
    generatePagesBtn.onclick = () => {
      console.log('🎨 Generate pages button clicked');
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = '<p style="color: #666;">Generating Design System pages...</p>';
      }
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'GENERATE_DESIGN_SYSTEM_PAGES' 
        } 
      }, '*');
    };
  }
  
  // Inspect button handler
  const inspectBtn = document.getElementById('inspect-btn');
  if (inspectBtn) {
    console.log('✅ Inspect button found');
    inspectBtn.onclick = () => {
      console.log('🔍 Inspect button clicked');
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = '<p style="color: #666;">Inspecting selected frame...</p>';
      }
      parent.postMessage({
        pluginMessage: {
          type: 'GET_CURRENT_SELECTION'
        }
      }, '*');
    };
  }
  
  // Update pages button handler - THIS IS THE KEY ONE TO FIX
  const updatePagesBtn = document.getElementById('update-pages-btn');
  if (updatePagesBtn) {
    console.log('🔄 ✅ Update button found in DOM');
    updatePagesBtn.onclick = () => {
      console.log('🔄 Update pages button clicked');
      const results = document.getElementById('results');
      if (results) {
        results.innerHTML = '<p style="color: #666;">Updating Design System pages with latest improvements...</p>';
      }
      
      try {
        parent.postMessage({ 
          pluginMessage: {
            type: 'UPDATE_DESIGN_SYSTEM_PAGES'
          }
        }, '*');
        console.log('🔄 Update message sent to plugin');
      } catch (error) {
        console.error('Failed to send update message:', error);
      }
    };
  } else {
    console.error('❌ Update button not found in DOM');
  }
  
  // Import button handler
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    console.log('✅ Import button found');
    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files && (e.target as HTMLInputElement).files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          
          if (!data.tokens || typeof data.tokens !== 'object') {
            throw new Error('Invalid token file format');
          }
          
          const results = document.getElementById('results');
          if (results) {
            results.innerHTML = `
              <div style="padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #856404;">
                  📤 Import Token Preview
                </h4>
                <div style="font-size: 12px; color: #856404; margin-bottom: 12px;">
                  <div>🎨 Colors: ${(data.tokens.colors && data.tokens.colors.length) || 0}</div>
                  <div>📝 Typography: ${(data.tokens.typography && data.tokens.typography.length) || 0}</div>
                  <div>📏 Spacing: ${(data.tokens.spacing && data.tokens.spacing.length) || 0}</div>
                  <div>🌑 Shadows: ${(data.tokens.shadows && data.tokens.shadows.length) || 0}</div>
                  <div>⭕ Border Radius: ${(data.tokens.borderRadius && data.tokens.borderRadius.length) || 0}</div>
                </div>
                <button id="confirm-import" style="
                  background: #28a745;
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                  margin-right: 8px;
                ">Apply Tokens</button>
                <button id="cancel-import" style="
                  background: #6c757d;
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                ">Cancel</button>
              </div>
            `;
            
            const confirmBtn = document.getElementById('confirm-import');
            if (confirmBtn) {
              confirmBtn.onclick = () => {
                parent.postMessage({
                  pluginMessage: {
                    type: 'IMPORT_TOKENS',
                    data: data.tokens
                  }
                }, '*');
              };
            }
            
            const cancelBtn = document.getElementById('cancel-import');
            if (cancelBtn) {
              cancelBtn.onclick = () => {
                results.innerHTML = '<p style="color: #999;">Import cancelled.</p>';
              };
            }
          }
          
        } catch (error) {
          alert('Failed to import file: ' + error.message);
        }
      };
      
      input.click();
    };
  }
  
  console.log('✅ All event handlers attached');
}

// Track sync progress and current tokens
let syncProgress: Record<string, any> = {};
let currentTokens: any = null;

// Simple UI without React to test
const root = document.getElementById('root');
if (root) {
  root.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1 style="color: #333; font-size: 18px; margin-bottom: 16px;">Universal Design System Sync</h1>
      
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; margin-bottom: 8px;">Status</h2>
        <p style="color: #666;">Plugin loaded successfully! ✅</p>
        <!-- Real-time sync not available in Figma environment -->
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <button id="extract-btn" style="
            background: #0066ff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            flex: 1;
          ">Extract Tokens</button>
          
          <button id="sync-from-code-btn" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            flex: 1;
          ">← Sync from Code</button>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="export-btn" style="
            background: #17a2b8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            flex: 1;
            display: none;
          ">📥 Export JSON</button>
          
          <button id="import-btn" style="
            background: #ffc107;
            color: #333;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            flex: 1;
          ">📤 Import JSON</button>
          
          <button id="sync-to-code-btn" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            flex: 1;
            display: none;
          ">Sync to Code →</button>
        </div>
        
        <div style="margin-top: 8px;">
          <button id="generate-pages-btn" style="
            background: #8b5cf6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
          ">🎨 Generate Design System Pages</button>
        </div>
        
        <div style="margin-top: 8px;">
          <button id="inspect-btn" style="
            background: #17a2b8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
          ">🔍 Inspect Selected Frame</button>
        </div>
        
        <div style="margin-top: 8px;">
          <button id="update-pages-btn" style="
            background: #e91e63;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
          ">🔄 Update Design System Pages</button>
        </div>
      </div>
      
      <div id="results" style="
        background: #f5f5f5;
        padding: 16px;
        border-radius: 4px;
        min-height: 100px;
        max-height: 400px;
        overflow-y: auto;
      ">
        <p style="color: #999;">Click "Extract Design Tokens" to begin</p>
      </div>
    </div>
  `;
  
  // Wait for DOM to be ready, then attach handlers
  console.log('⏳ Waiting for DOM to be ready...');
  
  // Try multiple times to ensure DOM is ready
  let attempts = 0;
  const maxAttempts = 10;
  
  function tryAttachHandlers() {
    attempts++;
    console.log(`🔄 Attempt ${attempts} to attach handlers...`);
    
    // Check if critical elements exist
    const updateBtn = document.getElementById('update-pages-btn');
    const extractBtn = document.getElementById('extract-btn');
    
    if (updateBtn && extractBtn) {
      console.log('✅ DOM elements found, attaching handlers...');
      attachEventHandlers();
    } else {
      console.log(`⚠️ DOM not ready yet (attempt ${attempts}/${maxAttempts})`);
      if (attempts < maxAttempts) {
        setTimeout(tryAttachHandlers, 100);
      } else {
        console.error('❌ Failed to attach handlers after maximum attempts');
      }
    }
  }
  
  // Start trying to attach handlers
  setTimeout(tryAttachHandlers, 50);
  
  // Listen for messages
  window.onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;
    
    console.log('📨 Received message:', msg.type);
    
    const results = document.getElementById('results');
    if (!results) return;
    
    switch (msg.type) {
      case 'TOKENS_EXTRACTED':
        const tokens = msg.data;
        currentTokens = tokens; // Store for export
        
        // Show export button
        const exportButton = document.getElementById('export-btn');
        if (exportButton) {
          exportButton.style.display = 'block';
        }
        
        const syncToCodeButton = document.getElementById('sync-to-code-btn');
        if (syncToCodeButton) {
          syncToCodeButton.style.display = 'block';
        }
        
        // Request validation
        parent.postMessage({
          pluginMessage: {
            type: 'VALIDATE_TOKENS',
            data: tokens
          }
        }, '*');
        
        // Create detailed token display
        const colorList = tokens.colors.slice(0, 5).map((color: any) => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
            <div style="width: 16px; height: 16px; background: ${color.value}; border: 1px solid #e5e5e5; border-radius: 2px;"></div>
            <span style="font-size: 11px; color: #666;">${color.name}</span>
          </div>
        `).join('');
        
        const moreColors = tokens.colors.length > 5 ? `<p style="font-size: 11px; color: #999; margin-top: 4px;">+${tokens.colors.length - 5} more colors</p>` : '';
        
        results.innerHTML = `
          <h3 style="margin-bottom: 12px;">📊 Extracted Tokens from Figma</h3>
          
          <div style="display: grid; gap: 16px;">
            <!-- Colors -->
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e5e5;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                🎨 Colors (${tokens.colors.length})
              </h4>
              ${colorList}
              ${moreColors}
            </div>
            
            <!-- Typography -->
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e5e5;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                📝 Typography (${tokens.typography.length})
              </h4>
              <div style="font-size: 11px; color: #666;">
                ${tokens.typography.slice(0, 3).map((t: any) => t.name).join(', ')}
                ${tokens.typography.length > 3 ? ` +${tokens.typography.length - 3} more` : ''}
              </div>
            </div>
            
            <!-- Spacing -->
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e5e5;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                📏 Spacing (${tokens.spacing.length})
              </h4>
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${tokens.spacing.slice(0, 8).map((s: any) => `
                  <div style="font-size: 10px; padding: 2px 6px; background: #f5f5f5; border-radius: 3px;">
                    ${s.value}px
                  </div>
                `).join('')}
                ${tokens.spacing.length > 8 ? `<div style="font-size: 10px; color: #999;">+${tokens.spacing.length - 8}</div>` : ''}
              </div>
            </div>
            
            <!-- Effects -->
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e5e5;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px;">
                ✨ Effects
              </h4>
              <div style="font-size: 11px; color: #666;">
                🌑 Shadows: ${tokens.shadows.length}<br>
                ⭕ Border Radius: ${tokens.borderRadius.length}<br>
                🌈 Gradients: ${(tokens.gradients && tokens.gradients.length) || 0}
              </div>
            </div>
          </div>
          
          <div style="margin-top: 16px; padding: 12px; background: #f0f7ff; border-radius: 6px;">
            <p style="font-size: 12px; color: #0066ff; margin: 0;">
              💡 Tip: You can now sync these tokens to your codebase or export them as JSON.
            </p>
          </div>
        `;
        break;
        
      case 'ERROR':
        // Enhanced error display with fix suggestions
        const errorMessage = msg.data.message || 'An error occurred';
        const errorDetails = msg.data.details;
        
        let errorHTML = `<div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 16px;">
          <h3 style="margin: 0 0 8px 0; color: #721c24; font-size: 14px;">❌ Error</h3>
          <div style="color: #721c24; font-size: 13px; white-space: pre-wrap;">${errorMessage}</div>`;
        
        // Add error code if available
        if (errorDetails && errorDetails.code) {
          errorHTML += `<p style="font-size: 11px; color: #666; margin-top: 8px;">Error code: ${errorDetails.code}</p>`;
        }
        
        errorHTML += `</div>`;
        results.innerHTML = errorHTML;
        break;
        
      case 'LOADING':
        results.innerHTML = `<p style="color: #666;">${msg.data.message}</p>`;
        break;
        
      case 'SYNC_PROGRESS':
        // Update sync progress
        syncProgress = msg.data;
        updateSyncProgressUI();
        break;
        
      case 'SYNC_ITEM_UPDATE':
        // Update individual item status
        if (!syncProgress[msg.data.category]) {
          syncProgress[msg.data.category] = { total: 0, completed: 0, failed: 0, items: [] };
        }
        
        const category = syncProgress[msg.data.category];
        const existingItem = category.items.find((item: any) => item.name === msg.data.name);
        
        if (existingItem) {
          existingItem.status = msg.data.status;
          existingItem.error = msg.data.error;
        } else {
          category.items.push({
            name: msg.data.name,
            status: msg.data.status,
            error: msg.data.error
          });
        }
        
        // Update counts
        category.total = category.items.length;
        category.completed = category.items.filter((item: any) => item.status === 'completed').length;
        category.failed = category.items.filter((item: any) => item.status === 'failed').length;
        
        updateSyncProgressUI();
        break;
        
      case 'SYNC_COMPLETE':
        // Show final summary
        const summary = Object.entries(syncProgress).map(([category, data]: [string, any]) => {
          const icon = getCategoryIcon(category);
          const successRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
          return `
            <div style="margin-bottom: 12px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px;">${icon} ${category}</h4>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden;">
                  <div style="
                    width: ${successRate}%;
                    height: 100%;
                    background: ${successRate === 100 ? '#28a745' : '#ffc107'};
                    transition: width 0.3s ease;
                  "></div>
                </div>
                <span style="font-size: 12px; color: #666;">
                  ${data.completed}/${data.total} (${successRate}%)
                </span>
              </div>
              ${data.failed > 0 ? `<p style="color: #c00; font-size: 12px; margin: 4px 0;">⚠️ ${data.failed} failed</p>` : ''}
            </div>
          `;
        }).join('');
        
        results.innerHTML = `
          <h3 style="margin-bottom: 8px; color: #28a745;">✅ Sync Complete!</h3>
          ${summary}
          <p style="color: #666; font-size: 12px; margin-top: 12px;">
            Total time: ${msg.data.duration || 'N/A'}
          </p>
          ${addRetryButtons()}
        `;
        
        // Add event listeners for retry buttons
        const retryAllBtn = document.getElementById('retry-all-btn');
        if (retryAllBtn) {
          retryAllBtn.onclick = retryAllFailed;
        }
        
        const retryCategoryBtn = document.getElementById('retry-category-btn');
        if (retryCategoryBtn) {
          retryCategoryBtn.onclick = showRetryByCategory;
        }
        break;
        
      // Real-time sync messages not available in Figma environment
        
      case 'CODE_GENERATED':
        console.log('📄 Code generated:', msg.data);
        
        const files = msg.data.files;
        const filesHTML = files.map((file: any) => `
          <div style="margin-bottom: 24px; border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden;">
            <div style="background: #f5f5f5; padding: 12px; border-bottom: 1px solid #e5e5e5;">
              <h4 style="margin: 0; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
                📄 ${file.path}
                <button class="copy-code" data-content="${encodeURIComponent(file.content)}" style="
                  background: #0066ff;
                  color: white;
                  border: none;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  cursor: pointer;
                ">Copy</button>
              </h4>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${file.description}</p>
            </div>
            <div style="padding: 12px; background: #fafafa; max-height: 200px; overflow-y: auto;">
              <pre style="margin: 0; font-size: 11px; font-family: 'SF Mono', Monaco, monospace; white-space: pre-wrap;">${file.content.slice(0, 500)}${file.content.length > 500 ? '\n...' : ''}</pre>
            </div>
          </div>
        `).join('');
        
        results.innerHTML = `
          <h3 style="margin-bottom: 12px; color: #28a745;">✅ ${msg.data.message}</h3>
          ${filesHTML}
          <div style="margin-top: 16px; padding: 12px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px;">
            <p style="font-size: 12px; color: #0c5460; margin: 0;">
              💡 Copy these files to your project to update your design system with the latest tokens from Figma.
            </p>
          </div>
        `;
        
        // Add copy functionality
        const copyBtns = document.querySelectorAll('.copy-code');
        copyBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const content = decodeURIComponent((e.target as HTMLElement).getAttribute('data-content') || '');
            
            // Create a textarea element to copy from
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
              document.execCommand('copy');
              (e.target as HTMLElement).textContent = 'Copied!';
              setTimeout(() => {
                (e.target as HTMLElement).textContent = 'Copy';
              }, 2000);
            } catch (err) {
              console.error('Failed to copy:', err);
            }
            
            document.body.removeChild(textarea);
          });
        });
        break;
        
      case 'VALIDATION_RESULTS':
        console.log('🔍 Validation results:', msg.data);
        
        const validation = msg.data;
        if (!validation.valid || validation.warnings.length > 0) {
          // Add validation section to current results
          const currentContent = results.innerHTML;
          const validationHTML = `
            <div style="margin-top: 16px; padding: 12px; background: ${validation.valid ? '#fff3cd' : '#f8d7da'}; border: 1px solid ${validation.valid ? '#ffeaa7' : '#f5c6cb'}; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; color: ${validation.valid ? '#856404' : '#721c24'};">
                ${validation.valid ? '⚠️ Token Validation Warnings' : '❌ Token Validation Errors'}
              </h4>
              ${validation.errors.length > 0 ? `
                <div style="margin-bottom: 8px;">
                  <h5 style="margin: 0 0 4px 0; font-size: 12px; color: #721c24;">Errors (${validation.errors.length})</h5>
                  ${validation.errors.slice(0, 3).map((error: any) => `
                    <div style="font-size: 11px; margin-bottom: 4px;">
                      <strong>${error.category}/${error.token}</strong>: ${error.message}
                      ${error.fix ? `<br><span style="color: #666;">💡 ${error.fix}</span>` : ''}
                    </div>
                  `).join('')}
                  ${validation.errors.length > 3 ? `<p style="font-size: 11px; color: #666; margin: 4px 0;">+${validation.errors.length - 3} more errors</p>` : ''}
                </div>
              ` : ''}
              ${validation.warnings.length > 0 ? `
                <div style="margin-bottom: 8px;">
                  <h5 style="margin: 0 0 4px 0; font-size: 12px; color: #856404;">Warnings (${validation.warnings.length})</h5>
                  ${validation.warnings.slice(0, 2).map((warning: any) => `
                    <div style="font-size: 11px; margin-bottom: 4px;">
                      <strong>${warning.category}/${warning.token}</strong>: ${warning.message}
                    </div>
                  `).join('')}
                  ${validation.warnings.length > 2 ? `<p style="font-size: 11px; color: #666; margin: 4px 0;">+${validation.warnings.length - 2} more warnings</p>` : ''}
                </div>
              ` : ''}
              <button id="view-validation-details" style="
                background: ${validation.valid ? '#ffc107' : '#dc3545'};
                color: ${validation.valid ? '#333' : 'white'};
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
              ">View All Details</button>
            </div>
          `;
          
          results.innerHTML = currentContent + validationHTML;
          
          // Add click handler for details button
          const detailsBtn = document.getElementById('view-validation-details');
          if (detailsBtn) {
            detailsBtn.onclick = () => {
              parent.postMessage({
                pluginMessage: {
                  type: 'SHOW_VALIDATION_DETAILS',
                  data: validation
                }
              }, '*');
            };
          }
        }
        break;
        
      case 'SHOW_VALIDATION_DETAILS_RESULT':
        console.log('📋 Showing validation details');
        
        const details = msg.data;
        results.innerHTML = `
          <div style="padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="margin: 0; font-size: 16px;">🔍 Token Validation Report</h3>
              <button id="back-to-tokens" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
              ">← Back</button>
            </div>
            
            ${details.errors.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #721c24;">❌ Errors (${details.errors.length})</h4>
                ${details.errors.map((error: any) => `
                  <div style="padding: 8px; margin-bottom: 8px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                    <div style="font-size: 12px; font-weight: 500; color: #721c24;">
                      ${error.category} → ${error.token}
                    </div>
                    <div style="font-size: 11px; color: #721c24; margin-top: 4px;">
                      ${error.message}
                    </div>
                    ${error.fix ? `
                      <div style="font-size: 11px; color: #666; margin-top: 4px;">
                        💡 Fix: ${error.fix}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${details.warnings.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #856404;">⚠️ Warnings (${details.warnings.length})</h4>
                ${details.warnings.map((warning: any) => `
                  <div style="padding: 8px; margin-bottom: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                    <div style="font-size: 12px; font-weight: 500; color: #856404;">
                      ${warning.category} → ${warning.token}
                    </div>
                    <div style="font-size: 11px; color: #856404; margin-top: 4px;">
                      ${warning.message}
                    </div>
                    ${warning.suggestion ? `
                      <div style="font-size: 11px; color: #666; margin-top: 4px;">
                        💡 ${warning.suggestion}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${details.suggestions.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0c5460;">💡 Suggestions</h4>
                ${details.suggestions.map((suggestion: string) => `
                  <div style="padding: 8px; margin-bottom: 8px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px;">
                    <div style="font-size: 11px; color: #0c5460;">
                      ${suggestion}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${details.valid && details.errors.length === 0 && details.warnings.length === 0 ? `
              <div style="padding: 16px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; text-align: center;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #155724;">✅ All Tokens Valid!</h4>
                <p style="margin: 0; font-size: 12px; color: #155724;">
                  Your design tokens follow best practices and are ready for use.
                </p>
              </div>
            ` : ''}
          </div>
        `;
        
        // Add back button handler
        const backBtn = document.getElementById('back-to-tokens');
        if (backBtn && currentTokens) {
          backBtn.onclick = () => {
            // Re-display tokens
            parent.postMessage({
              pluginMessage: {
                type: 'EXTRACT_TOKENS'
              }
            }, '*');
          };
        }
        break;
        
      case 'INIT':
        console.log('📝 Settings received:', msg.data);
        // Reset progress on init
        syncProgress = {};
        break;
        
      case 'SELECTION_INFO':
        console.log('🔍 Selection info:', msg.data);
        const selectionInfo = msg.data;
        
        if (!selectionInfo || selectionInfo.frames.length === 0) {
          results.innerHTML = `
            <div style="padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #856404;">
                ⚠️ No Frame Selected
              </h4>
              <p style="font-size: 12px; color: #856404; margin: 0;">
                Please select a frame in Figma to inspect its properties.
              </p>
            </div>
          `;
        } else {
          const frame = selectionInfo.frames[0];
          results.innerHTML = `
            <div style="padding: 16px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px;">🔍 Frame Inspector</h3>
              
              <div style="background: white; padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Selected Frame</h4>
                <div style="font-size: 12px; color: #666;">
                  <p style="margin: 4px 0;"><strong>Name:</strong> ${frame.name}</p>
                  <p style="margin: 4px 0;"><strong>Type:</strong> ${frame.type}</p>
                  <p style="margin: 4px 0;"><strong>ID:</strong> <code style="font-family: monospace; font-size: 11px; background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${frame.id}</code></p>
                  ${frame.page ? `<p style="margin: 4px 0;"><strong>Page:</strong> ${frame.page.name}</p>` : ''}
                </div>
              </div>
              
              ${frame.properties ? `
                <div style="background: white; padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 16px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Properties</h4>
                  <div style="font-size: 12px; color: #666;">
                    <p style="margin: 4px 0;"><strong>Width:</strong> ${frame.properties.width}px</p>
                    <p style="margin: 4px 0;"><strong>Height:</strong> ${frame.properties.height}px</p>
                    <p style="margin: 4px 0;"><strong>X:</strong> ${frame.properties.x}</p>
                    <p style="margin: 4px 0;"><strong>Y:</strong> ${frame.properties.y}</p>
                    ${frame.properties.layoutMode ? `<p style="margin: 4px 0;"><strong>Layout:</strong> ${frame.properties.layoutMode}</p>` : ''}
                    ${frame.properties.layoutPositioning ? `<p style="margin: 4px 0;"><strong>Positioning:</strong> ${frame.properties.layoutPositioning}</p>` : ''}
                  </div>
                </div>
              ` : ''}
              
              ${frame.path && frame.path.length > 0 ? `
                <div style="background: white; padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Path</h4>
                  <div style="font-size: 11px; font-family: monospace; color: #666;">
                    ${frame.path.join(' → ')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }
        break;
        
      case 'BATCH_OPERATION_START':
        results.innerHTML = `
          <div style="padding: 16px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0c5460;">
              🔄 ${msg.data.message}
            </h4>
            <div style="font-size: 12px; color: #0c5460;">
              Processing ${msg.data.totalCategories} categories in batches to prevent freezing...
            </div>
            <div style="margin-top: 8px; height: 4px; background: #e5e5e5; border-radius: 2px; overflow: hidden;">
              <div style="width: 0%; height: 100%; background: #0066ff; transition: width 0.3s ease;"></div>
            </div>
          </div>
        `;
        break;
        
      case 'PAGES_GENERATED':
        console.log('📄 Pages generated:', msg.data);
        
        if (msg.data.success) {
          results.innerHTML = `
            <div style="padding: 16px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #155724;">
                ✅ ${msg.data.message}
              </h4>
              <div style="font-size: 12px; color: #155724; margin-top: 8px;">
                <p style="margin: 4px 0;">📄 <strong>${msg.data.pages.designSystem}</strong> - Contains all design tokens organized by category</p>
                <p style="margin: 4px 0;">📄 <strong>${msg.data.pages.components}</strong> - Contains universal component library</p>
              </div>
              <div style="margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                <p style="font-size: 11px; color: #155724; margin: 0;">
                  💡 Tip: Navigate to these pages to see your design system and components with proper auto-layout.
                </p>
              </div>
            </div>
          `;
        } else {
          results.innerHTML = `
            <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #721c24;">
                ❌ Failed to generate pages
              </h4>
              <div style="font-size: 12px; color: #721c24;">
                ${msg.data.message}
              </div>
            </div>
          `;
        }
        break;
        
      case 'PAGES_UPDATED':
        console.log('🔄 Pages updated:', msg.data);
        
        if (msg.data.success) {
          results.innerHTML = `
            <div style="padding: 16px; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #1565c0;">
                ✨ ${msg.data.message.split('\\n')[0]}
              </h4>
              <div style="font-size: 12px; color: #1565c0; margin-top: 8px; white-space: pre-line;">
                ${msg.data.message.split('\\n').slice(1).join('\\n')}
              </div>
              <div style="font-size: 12px; color: #1565c0; margin-top: 12px;">
                <p style="margin: 4px 0;">📄 <strong>${msg.data.pages.designSystem}</strong> - Updated with improved layout</p>
                <p style="margin: 4px 0;">📄 <strong>${msg.data.pages.components}</strong> - Updated with enhanced components</p>
              </div>
              <div style="margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                <p style="font-size: 11px; color: #1565c0; margin: 0;">
                  💡 Tip: The pages have been refreshed with responsive layouts, better spacing, and improved visual hierarchy.
                </p>
              </div>
            </div>
          `;
        } else {
          results.innerHTML = `
            <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #721c24;">
                ❌ Failed to update pages
              </h4>
              <div style="font-size: 12px; color: #721c24;">
                ${msg.data.message}
              </div>
            </div>
          `;
        }
        break;
    }
  };
  
  function updateSyncProgressUI() {
    const results = document.getElementById('results');
    if (!results) return;
    
    const progressHTML = Object.entries(syncProgress).map(([category, data]: [string, any]) => {
      const icon = getCategoryIcon(category);
      const inProgress = data.items.filter((item: any) => item.status === 'in_progress').length;
      
      return `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
            ${icon} ${category}
            ${inProgress > 0 ? '<span style="display: inline-block; width: 8px; height: 8px; background: #0066ff; border-radius: 50%; animation: pulse 1.5s infinite;"></span>' : ''}
          </h4>
          <div style="font-size: 12px; color: #666;">
            Progress: ${data.completed}/${data.total} completed
            ${data.failed > 0 ? ` (${data.failed} failed)` : ''}
          </div>
          <div style="max-height: 100px; overflow-y: auto; margin-top: 8px;">
            ${data.items.slice(-5).map((item: any) => `
              <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 11px;">
                ${getStatusIcon(item.status)}
                <span style="color: ${item.status === 'failed' ? '#c00' : '#666'};">
                  ${item.name}
                  ${item.error ? ` - ${item.error}` : ''}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    
    results.innerHTML = `
      <h3 style="margin-bottom: 12px;">Syncing Tokens...</h3>
      ${progressHTML}
      ${addRetryButtons()}
      <style>
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      </style>
    `;
    
    // Add event listeners for retry buttons
    const retryAllBtn = document.getElementById('retry-all-btn');
    if (retryAllBtn) {
      retryAllBtn.onclick = retryAllFailed;
    }
    
    const retryCategoryBtn = document.getElementById('retry-category-btn');
    if (retryCategoryBtn) {
      retryCategoryBtn.onclick = showRetryByCategory;
    }
  }
  
  function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Colors': '🎨',
      'Spacing': '📏',
      'Typography': '📝',
      'Shadows': '🌑',
      'Border Radius': '⭕',
      'Gradients': '🌈',
      'Effects': '✨'
    };
    return icons[category] || '📦';
  }
  
  function getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'in_progress': return '⏳';
      default: return '⭕';
    }
  }
  
  // Add error recovery functionality
  function addRetryButtons() {
    const failedItems: { category: string; items: any[] }[] = [];
    
    // Collect all failed items
    Object.entries(syncProgress).forEach(([category, data]: [string, any]) => {
      const failed = data.items.filter((item: any) => item.status === 'failed');
      if (failed.length > 0) {
        failedItems.push({ category, items: failed });
      }
    });
    
    if (failedItems.length === 0) return '';
    
    return `
      <div style="margin-top: 16px; padding: 12px; background: #fee; border-radius: 6px; border: 1px solid #fcc;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #c00;">
          ⚠️ ${failedItems.reduce((sum, cat) => sum + cat.items.length, 0)} tokens failed to sync
        </h4>
        <div style="font-size: 12px; color: #800; margin-bottom: 12px;">
          ${failedItems.map(({ category, items }) => `
            <div style="margin-bottom: 4px;">
              ${getCategoryIcon(category)} ${category}: ${items.length} failed
            </div>
          `).join('')}
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="retry-all-btn" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          ">🔄 Retry All Failed</button>
          <button id="retry-category-btn" style="
            background: #ffc107;
            color: #333;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          ">🔄 Retry by Category</button>
        </div>
      </div>
    `;
  }
  
  function showRetryByCategory() {
    const failedByCategory: Record<string, any[]> = {};
    
    Object.entries(syncProgress).forEach(([category, data]: [string, any]) => {
      const failed = data.items.filter((item: any) => item.status === 'failed');
      if (failed.length > 0) {
        failedByCategory[category] = failed;
      }
    });
    
    if (Object.keys(failedByCategory).length === 0) return;
    
    const results = document.getElementById('results');
    if (!results) return;
    
    results.innerHTML = `
      <h3 style="margin-bottom: 12px;">🔄 Retry Failed Tokens by Category</h3>
      ${Object.entries(failedByCategory).map(([category, items]) => `
        <div style="margin-bottom: 16px; padding: 12px; background: white; border: 1px solid #e5e5e5; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
            <span>${getCategoryIcon(category)} ${category} (${items.length} failed)</span>
            <button class="retry-category" data-category="${category}" style="
              background: #0066ff;
              color: white;
              border: none;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
            ">Retry</button>
          </h4>
          <div style="max-height: 150px; overflow-y: auto;">
            ${items.map((item: any, index: number) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 11px;">
                <span style="color: #666;">
                  ${item.name}
                  ${item.error ? ` - ${item.error}` : ''}
                </span>
                <button class="retry-single" data-category="${category}" data-name="${item.name}" style="
                  background: #6c757d;
                  color: white;
                  border: none;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-size: 10px;
                  cursor: pointer;
                ">Retry</button>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <button id="back-to-results" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 12px;
      ">← Back</button>
    `;
    
    // Add event listeners for retry buttons
    const retryCategoryBtns = document.querySelectorAll('.retry-category');
    retryCategoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = (e.target as HTMLElement).getAttribute('data-category');
        if (category) {
          retryFailedInCategory(category);
        }
      });
    });
    
    const retrySingleBtns = document.querySelectorAll('.retry-single');
    retrySingleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = (e.target as HTMLElement).getAttribute('data-category');
        const name = (e.target as HTMLElement).getAttribute('data-name');
        if (category && name) {
          retrySingleToken(category, name);
        }
      });
    });
    
    const backBtn = document.getElementById('back-to-results');
    if (backBtn) {
      backBtn.onclick = () => {
        updateSyncProgressUI();
      };
    }
  }
  
  function retryAllFailed() {
    const failedTokens: any[] = [];
    
    Object.entries(syncProgress).forEach(([category, data]: [string, any]) => {
      const failed = data.items.filter((item: any) => item.status === 'failed');
      failed.forEach((item: any) => {
        failedTokens.push({ category, name: item.name });
      });
    });
    
    if (failedTokens.length === 0) return;
    
    // Reset failed items to pending
    failedTokens.forEach(({ category, name }) => {
      const categoryData = syncProgress[category];
      const item = categoryData.items.find((i: any) => i.name === name);
      if (item) {
        item.status = 'pending';
        item.error = undefined;
      }
    });
    
    // Update UI
    updateSyncProgressUI();
    
    // Send retry message to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'RETRY_FAILED_TOKENS',
        data: { tokens: failedTokens }
      }
    }, '*');
  }
  
  function retryFailedInCategory(category: string) {
    const categoryData = syncProgress[category];
    if (!categoryData) return;
    
    const failedTokens = categoryData.items
      .filter((item: any) => item.status === 'failed')
      .map((item: any) => ({ category, name: item.name }));
    
    if (failedTokens.length === 0) return;
    
    // Reset failed items to pending
    failedTokens.forEach(({ name }) => {
      const item = categoryData.items.find((i: any) => i.name === name);
      if (item) {
        item.status = 'pending';
        item.error = undefined;
      }
    });
    
    // Update UI
    updateSyncProgressUI();
    
    // Send retry message to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'RETRY_FAILED_TOKENS',
        data: { tokens: failedTokens }
      }
    }, '*');
  }
  
  function retrySingleToken(category: string, name: string) {
    const categoryData = syncProgress[category];
    if (!categoryData) return;
    
    const item = categoryData.items.find((i: any) => i.name === name);
    if (item) {
      item.status = 'pending';
      item.error = undefined;
    }
    
    // Update UI
    showRetryByCategory();
    
    // Send retry message to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'RETRY_FAILED_TOKENS',
        data: { tokens: [{ category, name }] }
      }
    }, '*');
  }
  
  console.log('✅ Simple UI initialized');
}

export {};