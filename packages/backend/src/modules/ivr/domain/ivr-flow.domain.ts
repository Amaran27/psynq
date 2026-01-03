/**
 * IVR Flow Domain Model (Pure TypeScript - No Framework Dependencies)
 * 
 * Business Rules:
 * - Flow must have at least one node (entry point)
 * - Each node must have a valid type and configuration
 * - Menu nodes must have at least one option
 * - Routes must reference existing nodes
 * - No circular dependencies in node routing
 * - Active flows cannot be deleted, only archived
 */

export enum IVRNodeType {
  MENU = 'menu',
  PROMPT = 'prompt',
  COLLECT_INPUT = 'collect_input',
  TRANSFER = 'transfer',
  VOICEMAIL = 'voicemail',
  WEBHOOK = 'webhook',
  CONDITION = 'condition',
  HANGUP = 'hangup',
  QUEUE = 'queue',
}

export enum IVRFlowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface IVRMenuOption {
  digit: string; // '1', '2', ... '9', '0', '*', '#'
  label: string;
  nextNodeId: string;
}

export interface IVRPromptConfig {
  text?: string; // TTS text
  audioFileUrl?: string; // Pre-recorded audio
  language?: string;
  voice?: string;
}

export interface IVRCollectInputConfig {
  prompt: IVRPromptConfig;
  minDigits: number;
  maxDigits: number;
  timeout: number; // seconds
  finishOnKey: string; // '#' or '*'
  retries: number;
  invalidPrompt?: IVRPromptConfig;
  timeoutPrompt?: IVRPromptConfig;
  variableName: string; // Store collected input
}

export interface IVRTransferConfig {
  destination: string; // Phone number or SIP endpoint
  timeout: number;
  failureNodeId?: string;
}

export interface IVRWebhookConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  successNodeId: string;
  failureNodeId?: string;
}

export interface IVRConditionConfig {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith';
  value: string;
  trueNodeId: string;
  falseNodeId: string;
}

export interface IVRQueueConfig {
  queueName: string;
  timeout: number;
  announcePosition: boolean;
  musicOnHold?: string;
  timeoutNodeId?: string;
}

export interface IVRNode {
  id: string;
  type: IVRNodeType;
  name: string;
  description?: string;
  
  // Type-specific configurations
  menuOptions?: IVRMenuOption[];
  promptConfig?: IVRPromptConfig;
  collectInputConfig?: IVRCollectInputConfig;
  transferConfig?: IVRTransferConfig;
  webhookConfig?: IVRWebhookConfig;
  conditionConfig?: IVRConditionConfig;
  queueConfig?: IVRQueueConfig;
  
  // Default next node (for prompt, hangup, etc.)
  nextNodeId?: string;
  
  metadata?: Record<string, any>;
}

export class IVRFlow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: IVRFlowStatus;
  entryNodeId: string; // Which node to start execution from
  nodes: IVRNode[];
  variables: Record<string, string>; // Global flow variables
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;

  constructor(data: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    status: IVRFlowStatus;
    entryNodeId: string;
    nodes: IVRNode[];
    variables?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
  }) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
    this.entryNodeId = data.entryNodeId;
    this.nodes = data.nodes;
    this.variables = data.variables || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
  }

  /**
   * Business Logic: Validate flow structure
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Must have at least one node
    if (this.nodes.length === 0) {
      errors.push('Flow must have at least one node');
    }

    // Entry node must exist
    const entryNode = this.nodes.find(n => n.id === this.entryNodeId);
    if (!entryNode) {
      errors.push(`Entry node '${this.entryNodeId}' not found in flow`);
    }

    // Validate each node
    for (const node of this.nodes) {
      const nodeErrors = this.validateNode(node);
      errors.push(...nodeErrors);
    }

    // Check for orphaned nodes (unreachable from entry)
    const reachableNodes = this.getReachableNodes();
    const orphanedNodes = this.nodes.filter(n => !reachableNodes.has(n.id));
    if (orphanedNodes.length > 0) {
      errors.push(`Found ${orphanedNodes.length} orphaned nodes: ${orphanedNodes.map(n => n.name).join(', ')}`);
    }

    // Check for circular dependencies
    if (this.hasCircularDependency()) {
      errors.push('Flow contains circular dependencies');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateNode(node: IVRNode): string[] {
    const errors: string[] = [];

    // Type-specific validation
    switch (node.type) {
      case IVRNodeType.MENU:
        if (!node.menuOptions || node.menuOptions.length === 0) {
          errors.push(`Menu node '${node.name}' must have at least one option`);
        }
        if (node.menuOptions) {
          for (const option of node.menuOptions) {
            if (!this.nodes.find(n => n.id === option.nextNodeId)) {
              errors.push(`Menu option '${option.label}' references non-existent node '${option.nextNodeId}'`);
            }
          }
        }
        break;

      case IVRNodeType.COLLECT_INPUT:
        if (!node.collectInputConfig) {
          errors.push(`CollectInput node '${node.name}' missing configuration`);
        } else {
          if (node.collectInputConfig.minDigits > node.collectInputConfig.maxDigits) {
            errors.push(`CollectInput node '${node.name}': minDigits cannot exceed maxDigits`);
          }
          if (!node.nextNodeId) {
            errors.push(`CollectInput node '${node.name}' missing nextNodeId`);
          }
        }
        break;

      case IVRNodeType.TRANSFER:
        if (!node.transferConfig) {
          errors.push(`Transfer node '${node.name}' missing configuration`);
        } else if (!node.transferConfig.destination) {
          errors.push(`Transfer node '${node.name}' missing destination`);
        }
        break;

      case IVRNodeType.WEBHOOK:
        if (!node.webhookConfig) {
          errors.push(`Webhook node '${node.name}' missing configuration`);
        } else {
          if (!node.webhookConfig.url) {
            errors.push(`Webhook node '${node.name}' missing URL`);
          }
          if (!this.nodes.find(n => n.id === node.webhookConfig!.successNodeId)) {
            errors.push(`Webhook node '${node.name}' references non-existent success node`);
          }
        }
        break;

      case IVRNodeType.CONDITION:
        if (!node.conditionConfig) {
          errors.push(`Condition node '${node.name}' missing configuration`);
        } else {
          if (!this.nodes.find(n => n.id === node.conditionConfig!.trueNodeId)) {
            errors.push(`Condition node '${node.name}' references non-existent true node`);
          }
          if (!this.nodes.find(n => n.id === node.conditionConfig!.falseNodeId)) {
            errors.push(`Condition node '${node.name}' references non-existent false node`);
          }
        }
        break;

      case IVRNodeType.QUEUE:
        if (!node.queueConfig) {
          errors.push(`Queue node '${node.name}' missing configuration`);
        } else if (!node.queueConfig.queueName) {
          errors.push(`Queue node '${node.name}' missing queue name`);
        }
        break;

      case IVRNodeType.PROMPT:
        if (!node.promptConfig) {
          errors.push(`Prompt node '${node.name}' missing configuration`);
        } else if (!node.promptConfig.text && !node.promptConfig.audioFileUrl) {
          errors.push(`Prompt node '${node.name}' must have either text or audioFileUrl`);
        }
        if (!node.nextNodeId) {
          errors.push(`Prompt node '${node.name}' missing nextNodeId`);
        }
        break;
    }

    return errors;
  }

  private getReachableNodes(): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [this.entryNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      
      reachable.add(nodeId);
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Add all possible next nodes
      if (node.nextNodeId) queue.push(node.nextNodeId);
      if (node.menuOptions) {
        node.menuOptions.forEach(opt => queue.push(opt.nextNodeId));
      }
      if (node.transferConfig?.failureNodeId) queue.push(node.transferConfig.failureNodeId);
      if (node.webhookConfig?.successNodeId) queue.push(node.webhookConfig.successNodeId);
      if (node.webhookConfig?.failureNodeId) queue.push(node.webhookConfig.failureNodeId);
      if (node.conditionConfig?.trueNodeId) queue.push(node.conditionConfig.trueNodeId);
      if (node.conditionConfig?.falseNodeId) queue.push(node.conditionConfig.falseNodeId);
      if (node.queueConfig?.timeoutNodeId) queue.push(node.queueConfig.timeoutNodeId);
    }

    return reachable;
  }

  private hasCircularDependency(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return false;

        const nextNodes = this.getNextNodeIds(node);
        for (const nextId of nextNodes) {
          if (!visited.has(nextId) && hasCycle(nextId)) {
            return true;
          } else if (recursionStack.has(nextId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return hasCycle(this.entryNodeId);
  }

  private getNextNodeIds(node: IVRNode): string[] {
    const nextIds: string[] = [];
    if (node.nextNodeId) nextIds.push(node.nextNodeId);
    if (node.menuOptions) {
      nextIds.push(...node.menuOptions.map(opt => opt.nextNodeId));
    }
    if (node.transferConfig?.failureNodeId) nextIds.push(node.transferConfig.failureNodeId);
    if (node.webhookConfig?.successNodeId) nextIds.push(node.webhookConfig.successNodeId);
    if (node.webhookConfig?.failureNodeId) nextIds.push(node.webhookConfig.failureNodeId);
    if (node.conditionConfig?.trueNodeId) nextIds.push(node.conditionConfig.trueNodeId);
    if (node.conditionConfig?.falseNodeId) nextIds.push(node.conditionConfig.falseNodeId);
    if (node.queueConfig?.timeoutNodeId) nextIds.push(node.queueConfig.timeoutNodeId);
    return nextIds;
  }

  /**
   * Business Logic: Activate flow (only if valid)
   */
  activate(): void {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Cannot activate invalid flow: ${validation.errors.join(', ')}`);
    }
    this.status = IVRFlowStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Business Logic: Archive flow
   */
  archive(): void {
    this.status = IVRFlowStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  /**
   * Business Logic: Add a new node
   */
  addNode(node: IVRNode): void {
    if (this.nodes.find(n => n.id === node.id)) {
      throw new Error(`Node with ID '${node.id}' already exists`);
    }
    this.nodes.push(node);
    this.updatedAt = new Date();
  }

  /**
   * Business Logic: Remove a node
   */
  removeNode(nodeId: string): void {
    if (nodeId === this.entryNodeId) {
      throw new Error('Cannot remove entry node');
    }
    
    // Check if any other nodes reference this node
    const referencedBy = this.nodes.filter(n => 
      this.getNextNodeIds(n).includes(nodeId)
    );
    
    if (referencedBy.length > 0) {
      throw new Error(`Cannot remove node '${nodeId}': referenced by ${referencedBy.map(n => n.name).join(', ')}`);
    }

    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.updatedAt = new Date();
  }

  /**
   * Business Logic: Get node by ID
   */
  getNode(nodeId: string): IVRNode | undefined {
    return this.nodes.find(n => n.id === nodeId);
  }

  /**
   * Business Logic: Clone flow (for versioning)
   */
  clone(newId: string, newName: string): IVRFlow {
    return new IVRFlow({
      id: newId,
      organizationId: this.organizationId,
      name: newName,
      description: this.description,
      status: IVRFlowStatus.DRAFT,
      entryNodeId: this.entryNodeId,
      nodes: JSON.parse(JSON.stringify(this.nodes)), // Deep clone
      variables: { ...this.variables },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.createdBy,
    });
  }
}
