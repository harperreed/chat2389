import { BACKENDS, ENVIRONMENTS, loadConfig, updateConfig } from './config.js';
import ApiProvider from './ApiProvider.js';

/**
 * Backend selector component for development/testing.
 * 
 * This creates a UI widget that allows changing the backend configuration
 * at runtime, including:
 * - Switching between backend implementations
 * - Configuring timeouts, retries, and debug mode
 * - Simulating failures and delays (for mock backend)
 */
export default class BackendSelector {
  /**
   * Create a backend selector UI widget
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.visible=auto] - Whether the widget is initially visible
   * @param {string} [options.position='bottom-right'] - Widget position (top-left, top-right, bottom-left, bottom-right)
   * @param {boolean} [options.showAdvanced=false] - Whether to show advanced options by default
   * @param {boolean} [options.closeButton=true] - Whether to show a close button
   * @param {Function} [options.onBackendChange] - Callback when backend changes
   * @param {boolean} [options.reloadOnChange=true] - Whether to reload the page on backend change
   */
  constructor(options = {}) {
    this.container = null;
    this.isVisible = options.visible;
    this.position = options.position || 'bottom-right';
    this.showAdvanced = options.showAdvanced || false;
    this.closeButton = options.closeButton !== false;
    this.onBackendChange = options.onBackendChange;
    this.reloadOnChange = options.reloadOnChange !== false;
    
    // Config state
    this.config = loadConfig();
    
    // Auto-detect visibility if not specified
    if (this.isVisible === undefined) {
      this.isVisible = this.config.environment === ENVIRONMENTS.DEVELOPMENT || 
                      this.config.environment === ENVIRONMENTS.TEST;
    }
    
    // Create and show the UI if visible
    if (this.isVisible) {
      this._initialize();
    }
    
    // Create global access point for console debugging
    if (typeof window !== 'undefined') {
      window._backendSelector = this;
    }
  }

  /**
   * Initialize the backend selector UI
   * @private
   */
  _initialize() {
    // Create container with basic styling
    this.container = document.createElement('div');
    this.container.className = 'backend-selector';
    
    // Apply styles
    Object.assign(this.container.style, {
      position: 'fixed',
      zIndex: '9999',
      backgroundColor: 'rgba(20, 20, 20, 0.85)',
      color: 'white',
      padding: '10px',
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '300px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    });
    
    // Set position
    switch (this.position) {
      case 'top-left':
        this.container.style.top = '10px';
        this.container.style.left = '10px';
        break;
      case 'top-right':
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        break;
      case 'bottom-left':
        this.container.style.bottom = '10px';
        this.container.style.left = '10px';
        break;
      case 'bottom-right':
      default:
        this.container.style.bottom = '10px';
        this.container.style.right = '10px';
        break;
    }
    
    // Create header with title and close button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';
    
    const title = document.createElement('div');
    title.textContent = 'API Backend';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '14px';
    header.appendChild(title);
    
    // Add environment indicator
    const envIndicator = document.createElement('div');
    const envColors = {
      [ENVIRONMENTS.DEVELOPMENT]: '#65B741',
      [ENVIRONMENTS.TEST]: '#FFBF00',
      [ENVIRONMENTS.STAGING]: '#3081D0',
      [ENVIRONMENTS.PRODUCTION]: '#FE0000'
    };
    envIndicator.textContent = this.config.environment;
    envIndicator.style.fontSize = '11px';
    envIndicator.style.padding = '2px 6px';
    envIndicator.style.borderRadius = '3px';
    envIndicator.style.backgroundColor = envColors[this.config.environment] || '#999';
    envIndicator.style.marginLeft = '8px';
    title.appendChild(envIndicator);
    
    // Add close button if enabled
    if (this.closeButton) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.color = 'white';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.padding = '0 5px';
      closeBtn.style.marginLeft = '10px';
      closeBtn.title = 'Close';
      
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
      
      header.appendChild(closeBtn);
    }
    
    this.container.appendChild(header);
    
    // Create form for backend settings
    const form = document.createElement('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
    });
    
    // Create backend type selection section
    const backendSection = document.createElement('div');
    backendSection.style.marginBottom = '10px';
    
    const backendLabel = document.createElement('div');
    backendLabel.textContent = 'Backend Type';
    backendLabel.style.marginBottom = '5px';
    backendLabel.style.fontSize = '13px';
    backendSection.appendChild(backendLabel);
    
    // Create radio buttons for each backend
    const backends = Object.entries(BACKENDS);
    const currentBackend = ApiProvider.getClientType();
    
    const radioGroup = document.createElement('div');
    radioGroup.style.display = 'flex';
    radioGroup.style.gap = '10px';
    
    backends.forEach(([key, value]) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.cursor = 'pointer';
      label.style.padding = '3px';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'backend';
      radio.value = value;
      radio.checked = value === currentBackend;
      radio.style.marginRight = '5px';
      
      // When a radio button is selected, change the backend
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this._changeBackend(value);
        }
      });
      
      label.appendChild(radio);
      label.appendChild(document.createTextNode(key.toLowerCase()));
      radioGroup.appendChild(label);
    });
    
    backendSection.appendChild(radioGroup);
    form.appendChild(backendSection);
    
    // Create toggle for advanced options
    const advancedToggle = document.createElement('button');
    advancedToggle.textContent = this.showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options';
    advancedToggle.style.background = 'none';
    advancedToggle.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    advancedToggle.style.borderRadius = '3px';
    advancedToggle.style.color = 'white';
    advancedToggle.style.padding = '5px 10px';
    advancedToggle.style.fontSize = '12px';
    advancedToggle.style.cursor = 'pointer';
    advancedToggle.style.width = '100%';
    advancedToggle.style.marginTop = '5px';
    advancedToggle.style.marginBottom = '10px';
    
    // Advanced options container
    const advancedOptions = document.createElement('div');
    advancedOptions.style.display = this.showAdvanced ? 'block' : 'none';
    advancedOptions.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
    advancedOptions.style.paddingTop = '10px';
    advancedOptions.style.marginTop = '5px';
    
    // Toggle advanced options visibility
    advancedToggle.addEventListener('click', () => {
      this.showAdvanced = !this.showAdvanced;
      advancedOptions.style.display = this.showAdvanced ? 'block' : 'none';
      advancedToggle.textContent = this.showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options';
    });
    
    form.appendChild(advancedToggle);
    
    // Create configuration options
    this._createAdvancedOptions(advancedOptions);
    form.appendChild(advancedOptions);
    
    this.container.appendChild(form);
    
    // Add apply button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply Changes';
    applyButton.style.backgroundColor = '#4285f4';
    applyButton.style.color = 'white';
    applyButton.style.border = 'none';
    applyButton.style.borderRadius = '3px';
    applyButton.style.padding = '8px 12px';
    applyButton.style.marginTop = '10px';
    applyButton.style.cursor = 'pointer';
    applyButton.style.width = '100%';
    applyButton.style.fontWeight = 'bold';
    
    applyButton.addEventListener('click', () => {
      this._applyChanges();
    });
    
    form.appendChild(applyButton);
    
    // Add to document when DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.container);
      });
    } else {
      document.body.appendChild(this.container);
    }
  }
  
  /**
   * Create advanced configuration options
   * @param {HTMLElement} container - Container to add options to
   * @private
   */
  _createAdvancedOptions(container) {
    // Helper to create labeled inputs
    const createOption = (name, label, type, value, min, max, step) => {
      const div = document.createElement('div');
      div.style.marginBottom = '8px';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.display = 'block';
      labelEl.style.marginBottom = '3px';
      labelEl.style.fontSize = '12px';
      div.appendChild(labelEl);
      
      const input = document.createElement('input');
      input.type = type;
      input.name = name;
      input.id = `backend-${name}`;
      
      if (type === 'checkbox') {
        input.checked = value;
      } else {
        input.value = value;
      }
      
      if (type === 'number') {
        input.min = min;
        input.max = max;
        input.step = step;
      }
      
      // Style the input
      Object.assign(input.style, {
        width: type === 'checkbox' ? 'auto' : '100%',
        padding: '5px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '3px',
        fontSize: '12px',
        boxSizing: 'border-box'
      });
      
      div.appendChild(input);
      
      if (type === 'range') {
        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = value;
        valueDisplay.style.marginLeft = '5px';
        valueDisplay.style.fontSize = '12px';
        div.appendChild(valueDisplay);
        
        input.addEventListener('input', () => {
          valueDisplay.textContent = input.value;
        });
      }
      
      return div;
    };
    
    // Common options for all backends
    container.appendChild(createOption(
      'debug',
      'Debug Mode',
      'checkbox',
      this.config.debug
    ));
    
    container.appendChild(createOption(
      'defaultTimeout',
      'Request Timeout (ms)',
      'number',
      this.config.defaultTimeout,
      500,
      60000,
      500
    ));
    
    container.appendChild(createOption(
      'maxRetries',
      'Max Retries',
      'number',
      this.config.maxRetries,
      0,
      10,
      1
    ));
    
    // Create backend-specific options section
    const specificSection = document.createElement('div');
    specificSection.style.marginTop = '15px';
    specificSection.style.paddingTop = '10px';
    specificSection.style.borderTop = '1px dashed rgba(255, 255, 255, 0.2)';
    
    const specificLabel = document.createElement('div');
    specificLabel.textContent = 'Backend-Specific Options';
    specificLabel.style.marginBottom = '10px';
    specificLabel.style.fontWeight = 'bold';
    specificLabel.style.fontSize = '13px';
    specificSection.appendChild(specificLabel);
    
    // Mock backend specific options
    const mockOptions = document.createElement('div');
    mockOptions.className = 'backend-specific-options mock';
    mockOptions.style.display = this.config.type === BACKENDS.MOCK ? 'block' : 'none';
    
    mockOptions.appendChild(createOption(
      'mockDelay',
      'Simulated Delay (ms)',
      'number',
      this.config.mockDelay,
      0,
      5000,
      50
    ));
    
    mockOptions.appendChild(createOption(
      'mockFailRate',
      'Random Failure Rate',
      'range',
      this.config.mockFailRate,
      0,
      1,
      0.05
    ));
    
    specificSection.appendChild(mockOptions);
    
    // Flask backend specific options
    const flaskOptions = document.createElement('div');
    flaskOptions.className = 'backend-specific-options flask';
    flaskOptions.style.display = this.config.type === BACKENDS.FLASK ? 'block' : 'none';
    
    flaskOptions.appendChild(createOption(
      'enableHealthCheck',
      'Enable Health Checks',
      'checkbox',
      this.config.enableHealthCheck
    ));
    
    flaskOptions.appendChild(createOption(
      'baseUrl',
      'API Base URL',
      'text',
      this.config.baseUrl
    ));
    
    specificSection.appendChild(flaskOptions);
    
    container.appendChild(specificSection);
    
    // Add listener for backend type changes to show/hide specific options
    const backendRadios = document.querySelectorAll('input[name="backend"]');
    backendRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          document.querySelectorAll('.backend-specific-options').forEach(el => {
            el.style.display = 'none';
          });
          
          const typeSpecificOptions = document.querySelector(`.backend-specific-options.${radio.value}`);
          if (typeSpecificOptions) {
            typeSpecificOptions.style.display = 'block';
          }
        }
      });
    });
    
    // Add persistence option
    container.appendChild(createOption(
      'persistConfig',
      'Remember settings',
      'checkbox',
      this.config.persistConfig
    ));
  }
  
  /**
   * Apply configuration changes
   * @private
   */
  _applyChanges() {
    // Get all form values
    const getInputValue = (name) => {
      const input = document.getElementById(`backend-${name}`);
      if (!input) return null;
      
      if (input.type === 'checkbox') {
        return input.checked;
      } else if (input.type === 'number' || input.type === 'range') {
        return Number.parseFloat(input.value);
      } else {
        return input.value;
      }
    };
    
    // Build updated config
    const updates = {
      debug: getInputValue('debug'),
      defaultTimeout: getInputValue('defaultTimeout'),
      maxRetries: getInputValue('maxRetries'),
      mockDelay: getInputValue('mockDelay'),
      mockFailRate: getInputValue('mockFailRate'),
      enableHealthCheck: getInputValue('enableHealthCheck'),
      baseUrl: getInputValue('baseUrl'),
      persistConfig: getInputValue('persistConfig')
    };
    
    // Remove null values
    Object.keys(updates).forEach(key => {
      if (updates[key] === null) {
        delete updates[key];
      }
    });
    
    // Get selected backend
    const backendRadios = document.querySelectorAll('input[name="backend"]');
    backendRadios.forEach(radio => {
      if (radio.checked) {
        updates.type = radio.value;
      }
    });
    
    // Update configuration
    const newConfig = updateConfig(updates);
    this.config = newConfig;
    
    // Notify of changes
    if (this.onBackendChange) {
      this.onBackendChange(newConfig);
    }
    
    // Reload page if backend type changed
    if (this.reloadOnChange) {
      window.location.reload();
    }
  }
  
  /**
   * Change the backend
   * @param {string} backend - Backend type to use
   * @private
   */
  _changeBackend(backend) {
    // Update relevant UI elements
    const backendRadios = document.querySelectorAll('input[name="backend"]');
    backendRadios.forEach(radio => {
      if (radio.value === backend) {
        radio.checked = true;
      }
    });
    
    // Show/hide backend specific options
    document.querySelectorAll('.backend-specific-options').forEach(el => {
      el.style.display = 'none';
    });
    
    const typeSpecificOptions = document.querySelector(`.backend-specific-options.${backend}`);
    if (typeSpecificOptions) {
      typeSpecificOptions.style.display = 'block';
    }
  }
  
  /**
   * Show the backend selector
   * @returns {BackendSelector} this instance for chaining
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    } else {
      this.isVisible = true;
      this._initialize();
    }
    return this;
  }
  
  /**
   * Hide the backend selector
   * @returns {BackendSelector} this instance for chaining
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.isVisible = false;
    return this;
  }
  
  /**
   * Toggle the backend selector visibility
   * @returns {BackendSelector} this instance for chaining
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
    return this;
  }
  
  /**
   * Applies configuration changes without reloading
   * @param {Object} updates - Configuration updates to apply
   * @returns {Object} Updated configuration
   */
  applyConfigWithoutReload(updates) {
    const oldReloadSetting = this.reloadOnChange;
    this.reloadOnChange = false;
    
    // Update UI if needed
    if (updates.type) {
      this._changeBackend(updates.type);
    }
    
    // Update form fields
    Object.entries(updates).forEach(([key, value]) => {
      const input = document.getElementById(`backend-${key}`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = value;
        } else {
          input.value = value;
        }
      }
    });
    
    // Apply changes
    const newConfig = updateConfig(updates);
    this.config = newConfig;
    
    // Restore reload setting
    this.reloadOnChange = oldReloadSetting;
    
    return newConfig;
  }
}