/**
 * Execute IVR Flow Use Case
 * 
 * Main orchestrator for IVR flow execution
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRExecutionLogRepositoryPort } from '../ports/ivr-execution-log-repository.port';
import { IVRFlow, IVRNode, IVRNodeType } from '../domain/ivr-flow.domain';
import { IVRExecutionLog, IVRExecutionStatus } from '../domain/ivr-execution-log.domain';
import { TelephonyPort } from '../../../ports/telephony.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface IVRExecutionContext {
  callId: string;
  organizationId: string;
  flowId: string;
  variables: Record<string, any>;
  currentNodeId: string;
}

@Injectable()
export class ExecuteIVRFlowUseCase {
  private readonly logger = new Logger(ExecuteIVRFlowUseCase.name);

  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
    @Inject('IVR_EXECUTION_LOG_REPOSITORY')
    private readonly executionLogRepository: IVRExecutionLogRepositoryPort,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Start IVR flow execution for a call
   */
  async execute(
    callId: string,
    flowId: string,
    organizationId: string,
    initialVariables: Record<string, any> = {},
  ): Promise<void> {
    this.logger.log(`Starting IVR flow ${flowId} for call ${callId}`);

    // Load flow
    const flow = await this.flowRepository.findById(flowId);
    if (!flow) {
      throw new NotFoundException(`IVR flow ${flowId} not found`);
    }

    if (flow.organizationId !== organizationId) {
      throw new NotFoundException(`IVR flow ${flowId} not found`);
    }

    // Validate flow
    const validation = flow.validate();
    if (!validation.valid) {
      throw new Error(`Cannot execute invalid flow: ${validation.errors.join(', ')}`);
    }

    // Create execution log
    const executionLog = new IVRExecutionLog({
      id: '',
      flowId: flow.id,
      flowName: flow.name,
      callId,
      organizationId,
      status: IVRExecutionStatus.IN_PROGRESS,
      startedAt: new Date(),
      steps: [],
      variables: { ...flow.variables, ...initialVariables },
    });

    const savedLog = await this.executionLogRepository.create(executionLog);

    // Start execution at entry node
    const context: IVRExecutionContext = {
      callId,
      organizationId,
      flowId: flow.id,
      variables: savedLog.variables,
      currentNodeId: flow.entryNodeId,
    };

    try {
      await this.executeNode(flow, savedLog, context);
    } catch (error) {
      this.logger.error(`IVR execution failed for call ${callId}:`, error);
      savedLog.fail(error.message);
      await this.executionLogRepository.update(savedLog);
      throw error;
    }
  }

  /**
   * Execute a single node and transition to next
   */
  private async executeNode(
    flow: IVRFlow,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<void> {
    const node = flow.nodes.find(n => n.id === context.currentNodeId);
    if (!node) {
      throw new Error(`Node ${context.currentNodeId} not found in flow`);
    }

    this.logger.log(`Executing node ${node.name} (${node.type}) for call ${context.callId}`);

    // Add step to log
    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: `execute_${node.type}`,
      timestamp: new Date(),
    });
    await this.executionLogRepository.update(executionLog);

    // Process node based on type
    let nextNodeId: string | null = null;

    switch (node.type) {
      case IVRNodeType.MENU:
        nextNodeId = await this.executeMenuNode(node, executionLog, context);
        break;

      case IVRNodeType.PROMPT:
        nextNodeId = await this.executePromptNode(node, executionLog, context);
        break;

      case IVRNodeType.COLLECT_INPUT:
        nextNodeId = await this.executeCollectInputNode(node, executionLog, context);
        break;

      case IVRNodeType.TRANSFER:
        nextNodeId = await this.executeTransferNode(node, executionLog, context);
        break;

      case IVRNodeType.WEBHOOK:
        nextNodeId = await this.executeWebhookNode(node, executionLog, context);
        break;

      case IVRNodeType.CONDITION:
        nextNodeId = await this.executeConditionNode(node, executionLog, context);
        break;

      case IVRNodeType.QUEUE:
        nextNodeId = await this.executeQueueNode(node, executionLog, context);
        break;

      case IVRNodeType.VOICEMAIL:
        nextNodeId = await this.executeVoicemailNode(node, executionLog, context);
        break;

      case IVRNodeType.HANGUP:
        await this.executeHangupNode(node, executionLog, context);
        executionLog.complete('hangup');
        await this.executionLogRepository.update(executionLog);
        return; // End execution

      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }

    // Continue to next node if specified
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      await this.executeNode(flow, executionLog, context);
    } else {
      // No next node - complete execution
      executionLog.complete('flow_end');
      await this.executionLogRepository.update(executionLog);
    }
  }

  /**
   * Execute MENU node - play menu and collect digit
   */
  private async executeMenuNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (!node.menuOptions || node.menuOptions.length === 0) {
      throw new Error(`Menu node ${node.id} has no options`);
    }

    // Play menu prompt
    if (node.promptConfig) {
      await this.playPrompt(context.callId, node.promptConfig);
    }

    // Collect single digit
    await this.telephonyProvider.gatherDigits(null, context.callId, {
      maxDigits: 1,
      timeout: 5,
      finishOnKey: '',
    });
    
    // TODO: Get digit from event handler
    const digit = '1'; // Placeholder - needs DTMF event handler

    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: 'digit_collected',
      timestamp: new Date(),
      input: digit,
    });
    await this.executionLogRepository.update(executionLog);

    // Find matching option
    const option = node.menuOptions.find(opt => opt.digit === digit);
    if (option) {
      return option.nextNodeId;
    }

    // No match - replay menu or go to invalid handler
    this.logger.warn(`Invalid digit '${digit}' for menu ${node.id}`);
    return node.nextNodeId || null; // Fallback to default next node
  }

  /**
   * Execute PROMPT node - play audio/TTS
   */
  private async executePromptNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (node.promptConfig) {
      await this.playPrompt(context.callId, node.promptConfig);
      
      executionLog.addStep({
        nodeId: node.id,
        nodeType: node.type,
        action: 'prompt_played',
        timestamp: new Date(),
      });
      await this.executionLogRepository.update(executionLog);
    }

    return node.nextNodeId || null;
  }

  /**
   * Execute COLLECT_INPUT node - collect multiple digits
   */
  private async executeCollectInputNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (!node.collectInputConfig) {
      throw new Error(`CollectInput node ${node.id} missing configuration`);
    }

    const config = node.collectInputConfig;

    // Play prompt
    await this.playPrompt(context.callId, config.prompt);

    // Collect digits
    await this.telephonyProvider.gatherDigits(null, context.callId, {
      maxDigits: config.maxDigits,
      timeout: config.timeout,
      finishOnKey: config.finishOnKey,
    });
    
    // TODO: Get input from event handler
    const input = ''; // Placeholder - needs DTMF event handler

    // Store in variables
    context.variables[config.variableName] = input;
    executionLog.variables = context.variables;

    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: 'input_collected',
      timestamp: new Date(),
      input,
      output: `Stored in variable: ${config.variableName}`,
    });
    await this.executionLogRepository.update(executionLog);

    return node.nextNodeId || null;
  }

  /**
   * Execute TRANSFER node - transfer call
   */
  private async executeTransferNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (!node.transferConfig) {
      throw new Error(`Transfer node ${node.id} missing configuration`);
    }

    const config = node.transferConfig;

    try {
      // TODO: Implement transfer via redirect or bridge
      this.logger.warn(`Transfer not yet implemented - would transfer ${context.callId} to ${config.destination}`);

      executionLog.addStep({
        nodeId: node.id,
        nodeType: node.type,
        action: 'transfer_initiated',
        timestamp: new Date(),
        output: `Transferred to ${config.destination}`,
      });
      await this.executionLogRepository.update(executionLog);

      // Transfer completes execution
      executionLog.complete('transferred');
      await this.executionLogRepository.update(executionLog);
      return null;
    } catch (error) {
      this.logger.error(`Transfer failed for call ${context.callId}:`, error);
      return config.failureNodeId || null;
    }
  }

  /**
   * Execute WEBHOOK node - call external API
   */
  private async executeWebhookNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (!node.webhookConfig) {
      throw new Error(`Webhook node ${node.id} missing configuration`);
    }

    const config = node.webhookConfig;

    try {
      // Make HTTP request with context variables
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          callId: context.callId,
          flowId: context.flowId,
          variables: context.variables,
        }),
      });

      const data = await response.json();

      // Store response in variables if configured
      if (config.responseVariable) {
        context.variables[config.responseVariable] = data;
        executionLog.variables = context.variables;
      }

      executionLog.addStep({
        nodeId: node.id,
        nodeType: node.type,
        action: 'webhook_executed',
        timestamp: new Date(),
        output: `Response: ${response.status}`,
      });
      await this.executionLogRepository.update(executionLog);

      return response.ok ? (config.successNodeId || null) : (config.failureNodeId || null);
    } catch (error) {
      this.logger.error(`Webhook failed for call ${context.callId}:`, error);
      return config.failureNodeId || null;
    }
  }

  /**
   * Execute CONDITION node - evaluate expression
   */
  private async executeConditionNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (!node.conditionConfig) {
      throw new Error(`Condition node ${node.id} missing configuration`);
    }

    const config = node.conditionConfig;

    // Simple variable comparison
    const variableValue = context.variables[config.variable];
    let result = false;

    switch (config.operator) {
      case '==':
        result = variableValue == config.value;
        break;
      case '!=':
        result = variableValue != config.value;
        break;
      case 'contains':
        result = String(variableValue).includes(String(config.value));
        break;
      case '>':
        result = Number(variableValue) > Number(config.value);
        break;
      case '<':
        result = Number(variableValue) < Number(config.value);
        break;
      case '>=':
        result = Number(variableValue) >= Number(config.value);
        break;
      case '<=':
        result = Number(variableValue) <= Number(config.value);
        break;
      case 'startsWith':
        result = String(variableValue).startsWith(String(config.value));
        break;
      default:
        result = false;
    }

    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: 'condition_evaluated',
      timestamp: new Date(),
      output: `${config.variable} ${config.operator} ${config.value} = ${result}`,
    });
    await this.executionLogRepository.update(executionLog);

    return result ? config.trueNodeId : config.falseNodeId;
  }

  /**
   * Execute QUEUE node - route to agent queue
   */
  private async executeQueueNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (!node.queueConfig) {
      throw new Error(`Queue node ${node.id} missing configuration`);
    }

    const config = node.queueConfig;

    // Emit queue event for queue service to handle
    await this.eventBus.publish({
      type: 'call.queued',
      organizationId: context.organizationId,
      payload: {
        callId: context.callId,
        queueName: config.queueName,
        priority: config.priority || 0,
        timeout: config.timeout,
      },
      timestamp: new Date(),
    });

    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: 'queued',
      timestamp: new Date(),
      output: `Queued to ${config.queueName}`,
    });
    await this.executionLogRepository.update(executionLog);

    // Queue completes IVR execution
    executionLog.complete('queued');
    await this.executionLogRepository.update(executionLog);
    return null;
  }

  /**
   * Execute VOICEMAIL node - record message
   */
  private async executeVoicemailNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<string | null> {
    if (node.promptConfig) {
      await this.playPrompt(context.callId, node.promptConfig);
    }

    // Start recording
    // TODO: Implement voicemail recording
    this.logger.log(`Recording voicemail for call ${context.callId}`);

    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: 'voicemail_recorded',
      timestamp: new Date(),
    });
    await this.executionLogRepository.update(executionLog);

    return node.nextNodeId || null;
  }

  /**
   * Execute HANGUP node - end call
   */
  private async executeHangupNode(
    node: IVRNode,
    executionLog: IVRExecutionLog,
    context: IVRExecutionContext,
  ): Promise<void> {
    // Find call entity to end it
    // TODO: Implement proper call lookup and end
    this.logger.log(`Ending call ${context.callId}`);

    executionLog.addStep({
      nodeId: node.id,
      nodeType: node.type,
      action: 'hangup',
      timestamp: new Date(),
    });
  }

  /**
   * Helper: Play audio prompt or TTS
   */
  private async playPrompt(callId: string, promptConfig: any): Promise<void> {
    if (promptConfig.audioFileUrl) {
      // Play audio file
      await this.telephonyProvider.playAudio(null, callId, promptConfig.audioFileUrl);
    } else if (promptConfig.text) {
      // Play TTS
      await this.telephonyProvider.sayText(null, callId, promptConfig.text);
    }
  }
}
