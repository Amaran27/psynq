/**
 * IVR Node Domain Model
 * 
 * Defines all node types available in the IVR flow builder
 */

export enum NodeType {
  START = 'start',             // Entry point
  MENU = 'menu',               // DTMF menu with options
  PLAY = 'play',               // Play audio message
  INPUT = 'input',             // Collect user input
  TRANSFER = 'transfer',       // Transfer call
  HANGUP = 'hangup',           // End call
  API_CALL = 'api_call',       // External API integration
  CONDITION = 'condition',     // Branch based on condition
  ROUTER = 'router',           // Route to different flows
  VOICEMAIL = 'voicemail',     // Record voicemail
  VARIABLE_SET = 'variable_set', // Set context variable
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface MenuOption {
  digit: string;           // DTMF digit (0-9, *, #)
  label: string;           // Display label
  targetNodeId?: string;   // Node to jump to
  action?: string;         // Optional action
}

export interface MenuNodeConfig {
  prompt: string;                    // Audio prompt
  promptUrl?: string;                // Pre-recorded audio URL
  timeout: number;                   // Seconds to wait
  retries: number;                   // Max retry attempts
  invalidPrompt?: string;            // Invalid input message
  timeoutPrompt?: string;            // Timeout message
  options: MenuOption[];             // Menu choices
}

export interface PlayNodeConfig {
  message: string;                   // TTS message
  audioUrl?: string;                 // Pre-recorded audio
  repeat?: number;                   // Repeat count
  voice?: string;                    // TTS voice
}

export interface InputNodeConfig {
  prompt: string;                    // Input prompt
  promptUrl?: string;                // Audio URL
  minDigits: number;                 // Minimum digits
  maxDigits: number;                 // Maximum digits
  timeout: number;                   // Input timeout
  finishOnKey?: string;              // Terminator key (#)
  variableName: string;              // Store result in variable
  validationRegex?: string;          // Validation pattern
  invalidPrompt?: string;            // Invalid input message
  retries: number;                   // Max retry attempts
}

export interface TransferNodeConfig {
  destination: string;               // Phone number or extension
  timeout: number;                   // Ring timeout
  mode: 'blind' | 'attended';        // Transfer type
  announcePrompt?: string;           // Announcement before transfer
  failureNodeId?: string;            // Fallback node
}

export interface ApiCallNodeConfig {
  url: string;                       // API endpoint
  method: 'GET' | 'POST' | 'PUT';    // HTTP method
  headers?: Record<string, string>;  // Request headers
  body?: Record<string, any>;        // Request body
  timeoutMs: number;                 // Request timeout
  resultVariable: string;            // Store response in variable
  successNodeId?: string;            // Success path
  failureNodeId?: string;            // Failure path
}

export interface ConditionNodeConfig {
  variable: string;                  // Variable to check
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: string;                     // Comparison value
  trueNodeId?: string;               // True branch
  falseNodeId?: string;              // False branch
}

export interface RouterNodeConfig {
  variable: string;                  // Variable to route on
  routes: Array<{
    value: string;                   // Match value
    targetNodeId?: string;           // Destination node
  }>;
  defaultNodeId?: string;            // Default route
}

export interface VoicemailNodeConfig {
  mailboxId: string;                 // Voicemail box ID
  prompt: string;                    // Recording prompt
  maxDuration: number;               // Max recording seconds
  beep: boolean;                     // Play beep before recording
  finishOnKey?: string;              // Stop recording key
  afterNodeId?: string;              // Next node after recording
}

export interface VariableSetNodeConfig {
  variableName: string;              // Variable to set
  value: string;                     // Value (supports ${var} interpolation)
  valueType: 'string' | 'number' | 'boolean'; // Type
}

export type NodeConfig =
  | MenuNodeConfig
  | PlayNodeConfig
  | InputNodeConfig
  | TransferNodeConfig
  | ApiCallNodeConfig
  | ConditionNodeConfig
  | RouterNodeConfig
  | VoicemailNodeConfig
  | VariableSetNodeConfig;

export class IVRNode {
  constructor(
    public readonly id: string,
    public type: NodeType,
    public label: string,
    public config: NodeConfig,
    public position: NodePosition,
    public metadata?: Record<string, any>,
  ) {
    this.validateNode();
  }

  private validateNode(): void {
    if (!this.label || this.label.trim().length === 0) {
      throw new Error('Node label is required');
    }

    // Type-specific validation
    switch (this.type) {
      case NodeType.MENU:
        this.validateMenuNode();
        break;
      case NodeType.INPUT:
        this.validateInputNode();
        break;
      case NodeType.TRANSFER:
        this.validateTransferNode();
        break;
      case NodeType.API_CALL:
        this.validateApiCallNode();
        break;
      case NodeType.CONDITION:
        this.validateConditionNode();
        break;
    }
  }

  private validateMenuNode(): void {
    const config = this.config as MenuNodeConfig;
    if (!config.prompt) {
      throw new Error('Menu node requires a prompt');
    }
    if (config.timeout < 1 || config.timeout > 60) {
      throw new Error('Menu timeout must be between 1 and 60 seconds');
    }
    if (config.options.length === 0) {
      throw new Error('Menu must have at least one option');
    }

    // Check for duplicate digits
    const digits = config.options.map(o => o.digit);
    if (new Set(digits).size !== digits.length) {
      throw new Error('Menu options must have unique digits');
    }
  }

  private validateInputNode(): void {
    const config = this.config as InputNodeConfig;
    if (!config.prompt) {
      throw new Error('Input node requires a prompt');
    }
    if (config.minDigits < 1 || config.maxDigits > 20) {
      throw new Error('Digit range must be 1-20');
    }
    if (config.minDigits > config.maxDigits) {
      throw new Error('minDigits cannot exceed maxDigits');
    }
    if (!config.variableName) {
      throw new Error('Input node requires a variable name');
    }
  }

  private validateTransferNode(): void {
    const config = this.config as TransferNodeConfig;
    if (!config.destination) {
      throw new Error('Transfer node requires a destination');
    }
    if (config.timeout < 5 || config.timeout > 120) {
      throw new Error('Transfer timeout must be between 5 and 120 seconds');
    }
  }

  private validateApiCallNode(): void {
    const config = this.config as ApiCallNodeConfig;
    if (!config.url) {
      throw new Error('API call node requires a URL');
    }
    if (!config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      throw new Error('API URL must start with http:// or https://');
    }
    if (!config.resultVariable) {
      throw new Error('API call node requires a result variable name');
    }
  }

  private validateConditionNode(): void {
    const config = this.config as ConditionNodeConfig;
    if (!config.variable) {
      throw new Error('Condition node requires a variable name');
    }
    if (config.value === undefined || config.value === null) {
      throw new Error('Condition node requires a comparison value');
    }
  }

  /**
   * Update node configuration
   */
  updateConfig(config: Partial<NodeConfig>): void {
    this.config = { ...this.config, ...config } as NodeConfig;
    this.validateNode();
  }

  /**
   * Update node position
   */
  updatePosition(position: NodePosition): void {
    this.position = position;
  }

  /**
   * Check if node is a branching node (has multiple exits)
   */
  isBranchingNode(): boolean {
    return [
      NodeType.MENU,
      NodeType.CONDITION,
      NodeType.ROUTER,
    ].includes(this.type);
  }

  /**
   * Check if node is terminal (ends execution)
   */
  isTerminalNode(): boolean {
    return [NodeType.HANGUP, NodeType.TRANSFER].includes(this.type);
  }

  /**
   * Get all possible exit node IDs
   */
  getExitNodeIds(): string[] {
    const exits: string[] = [];

    switch (this.type) {
      case NodeType.MENU: {
        const config = this.config as MenuNodeConfig;
        config.options.forEach(opt => {
          if (opt.targetNodeId) exits.push(opt.targetNodeId);
        });
        break;
      }
      case NodeType.CONDITION: {
        const config = this.config as ConditionNodeConfig;
        if (config.trueNodeId) exits.push(config.trueNodeId);
        if (config.falseNodeId) exits.push(config.falseNodeId);
        break;
      }
      case NodeType.ROUTER: {
        const config = this.config as RouterNodeConfig;
        config.routes.forEach(route => {
          if (route.targetNodeId) exits.push(route.targetNodeId);
        });
        if (config.defaultNodeId) exits.push(config.defaultNodeId);
        break;
      }
      case NodeType.API_CALL: {
        const config = this.config as ApiCallNodeConfig;
        if (config.successNodeId) exits.push(config.successNodeId);
        if (config.failureNodeId) exits.push(config.failureNodeId);
        break;
      }
      case NodeType.TRANSFER: {
        const config = this.config as TransferNodeConfig;
        if (config.failureNodeId) exits.push(config.failureNodeId);
        break;
      }
    }

    return exits;
  }
}
