/**
 * IVR Flow Domain Model
 * 
 * Represents a complete IVR flow with nodes and connections
 */

import { IVRNode, NodeType } from './ivr-node.domain';

export enum FlowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface FlowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;          // Connection label (e.g., "Option 1", "True")
  condition?: string;      // Optional condition
}

export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: any;
  description?: string;
}

export class IVRFlow {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public name: string,
    public description: string,
    public status: FlowStatus,
    public nodes: IVRNode[],
    public connections: FlowConnection[],
    public variables: FlowVariable[],
    public startNodeId: string,
    public version: number,
    public metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
    public publishedAt?: Date,
  ) {
    this.validateFlow();
  }

  private validateFlow(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Flow name is required');
    }

    if (this.nodes.length === 0) {
      throw new Error('Flow must have at least one node');
    }

    // Validate start node exists
    const startNode = this.nodes.find(n => n.id === this.startNodeId);
    if (!startNode) {
      throw new Error('Start node not found in flow');
    }

    if (startNode.type !== NodeType.START) {
      throw new Error('Start node must be of type START');
    }

    // Validate all connection references
    for (const conn of this.connections) {
      const sourceExists = this.nodes.some(n => n.id === conn.sourceNodeId);
      const targetExists = this.nodes.some(n => n.id === conn.targetNodeId);

      if (!sourceExists) {
        throw new Error(`Connection references non-existent source node: ${conn.sourceNodeId}`);
      }
      if (!targetExists) {
        throw new Error(`Connection references non-existent target node: ${conn.targetNodeId}`);
      }
    }

    // Check for cycles (prevent infinite loops)
    this.detectCycles();
  }

  /**
   * Detect cycles in the flow graph
   */
  private detectCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = this.connections.filter(c => c.sourceNodeId === nodeId);
      for (const conn of outgoingConnections) {
        if (hasCycle(conn.targetNodeId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    if (hasCycle(this.startNodeId)) {
      throw new Error('Flow contains cycles - infinite loops are not allowed');
    }
  }

  /**
   * Check if flow can be modified
   */
  canBeModified(): boolean {
    return this.status === FlowStatus.DRAFT;
  }

  /**
   * Publish flow
   */
  publish(): void {
    if (this.status === FlowStatus.PUBLISHED) {
      throw new Error('Flow is already published');
    }

    this.validateFlow();
    this.validateFlowCompletion();

    this.status = FlowStatus.PUBLISHED;
    this.publishedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Validate flow is complete before publishing
   */
  private validateFlowCompletion(): void {
    // Check all nodes have at least one connection (except terminal nodes)
    for (const node of this.nodes) {
      if (node.isTerminalNode() || node.type === NodeType.START) {
        continue;
      }

      const hasOutgoing = this.connections.some(c => c.sourceNodeId === node.id);
      if (!hasOutgoing) {
        throw new Error(`Node "${node.label}" has no outgoing connections`);
      }
    }

    // Check all branching nodes have all required connections
    for (const node of this.nodes) {
      if (!node.isBranchingNode()) continue;

      const exitNodeIds = node.getExitNodeIds();
      const actualExits = this.connections
        .filter(c => c.sourceNodeId === node.id)
        .map(c => c.targetNodeId);

      const missingExits = exitNodeIds.filter(id => !actualExits.includes(id));
      if (missingExits.length > 0) {
        throw new Error(`Node "${node.label}" is missing required connections`);
      }
    }
  }

  /**
   * Archive flow
   */
  archive(): void {
    this.status = FlowStatus.ARCHIVED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.archivedAt = new Date().toISOString();
    }
  }

  /**
   * Update flow metadata
   */
  update(updates: {
    name?: string;
    description?: string;
  }): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify published flow. Create a new version instead.');
    }

    if (updates.name !== undefined) {
      this.name = updates.name;
    }
    if (updates.description !== undefined) {
      this.description = updates.description;
    }

    this.updatedAt = new Date();
  }

  /**
   * Add node to flow
   */
  addNode(node: IVRNode): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify published flow');
    }

    // Check for duplicate ID
    if (this.nodes.some(n => n.id === node.id)) {
      throw new Error(`Node with ID ${node.id} already exists`);
    }

    // Only one START node allowed
    if (node.type === NodeType.START && this.nodes.some(n => n.type === NodeType.START)) {
      throw new Error('Flow can only have one START node');
    }

    this.nodes.push(node);
    this.updatedAt = new Date();
  }

  /**
   * Update node in flow
   */
  updateNode(nodeId: string, updates: Partial<IVRNode>): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify published flow');
    }

    const nodeIndex = this.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const node = this.nodes[nodeIndex];
    if (updates.config) {
      node.updateConfig(updates.config);
    }
    if (updates.position) {
      node.updatePosition(updates.position);
    }
    if (updates.label !== undefined) {
      node.label = updates.label;
    }

    this.updatedAt = new Date();
  }

  /**
   * Remove node from flow
   */
  removeNode(nodeId: string): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify published flow');
    }

    if (nodeId === this.startNodeId) {
      throw new Error('Cannot remove start node');
    }

    // Remove node
    this.nodes = this.nodes.filter(n => n.id !== nodeId);

    // Remove associated connections
    this.connections = this.connections.filter(
      c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId,
    );

    this.updatedAt = new Date();
  }

  /**
   * Add connection between nodes
   */
  addConnection(connection: FlowConnection): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify published flow');
    }

    // Check if connection already exists
    const exists = this.connections.some(
      c => c.sourceNodeId === connection.sourceNodeId && c.targetNodeId === connection.targetNodeId,
    );
    if (exists) {
      throw new Error('Connection already exists between these nodes');
    }

    this.connections.push(connection);
    this.updatedAt = new Date();
    this.validateFlow();
  }

  /**
   * Remove connection
   */
  removeConnection(connectionId: string): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify published flow');
    }

    this.connections = this.connections.filter(c => c.id !== connectionId);
    this.updatedAt = new Date();
  }

  /**
   * Add variable definition
   */
  addVariable(variable: FlowVariable): void {
    if (this.variables.some(v => v.name === variable.name)) {
      throw new Error(`Variable ${variable.name} already exists`);
    }

    this.variables.push(variable);
    this.updatedAt = new Date();
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): IVRNode | undefined {
    return this.nodes.find(n => n.id === nodeId);
  }

  /**
   * Get connections from a node
   */
  getOutgoingConnections(nodeId: string): FlowConnection[] {
    return this.connections.filter(c => c.sourceNodeId === nodeId);
  }

  /**
   * Clone flow for versioning
   */
  clone(newId: string): IVRFlow {
    return new IVRFlow(
      newId,
      this.organizationId,
      `${this.name} (Copy)`,
      this.description,
      FlowStatus.DRAFT,
      [...this.nodes],
      [...this.connections],
      [...this.variables],
      this.startNodeId,
      this.version + 1,
      { ...this.metadata, clonedFrom: this.id },
    );
  }
}
