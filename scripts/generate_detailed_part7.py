#!/usr/bin/env python3
"""
Part 7: Admin & Configuration UI - Visual builders and no-code tools
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_admin_ui():
    """Generate Admin & Configuration UI detailed work items"""
    print("\nGenerating Admin & Configuration UI...")
    items = []
    phase = 'Phase: Admin & Configuration UI'
    
    # Epic: Visual IVR Builder
    epic1 = 'Epic: Visual IVR Builder'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''Drag-and-drop IVR flow designer.

Features:
- Canvas with node-based flow editing
- Node types: Menu, Announcement, Queue, Time-based, Transfer
- Connection lines with labels
- Save/Load flows as JSON
- Publish to Asterisk dialplan
- Preview/Test mode
- Template library

NO CODE CHANGES NEEDED - Admin configures IVR via UI.''', 90, 28, labels='Admin,IVR,Builder'))

    # Task: IVR Canvas Component
    items.append(create_item(
        'Task: Implement IVR Canvas with React Flow',
        'Task', epic1, 'High',
        '''File: packages/web/src/components/admin/ivr-builder/IvrCanvas.tsx

```typescript
'use client';

import { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { MenuNode } from './nodes/MenuNode';
import { AnnouncementNode } from './nodes/AnnouncementNode';
import { QueueNode } from './nodes/QueueNode';
import { TimeCheckNode } from './nodes/TimeCheckNode';
import { TransferNode } from './nodes/TransferNode';
import { HangupNode } from './nodes/HangupNode';
import { StartNode } from './nodes/StartNode';
import { CustomEdge } from './edges/CustomEdge';
import { NodePalette } from './NodePalette';
import { IvrToolbar } from './IvrToolbar';
import { IvrPropertiesPanel } from './IvrPropertiesPanel';
import { useIvrStore } from '@/store/ivr.store';

const nodeTypes: NodeTypes = {
  start: StartNode,
  menu: MenuNode,
  announcement: AnnouncementNode,
  queue: QueueNode,
  timeCheck: TimeCheckNode,
  transfer: TransferNode,
  hangup: HangupNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

interface IvrCanvasProps {
  ivrId?: string;
  readOnly?: boolean;
  onSave?: (flow: IvrFlow) => Promise<void>;
}

export interface IvrFlow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  settings: Record<string, any>;
}

export function IvrCanvas({ ivrId, readOnly, onSave }: IvrCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { saveFlow, publishFlow, testFlow } = useIvrStore();

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'custom',
            markerEnd: { type: MarkerType.ArrowClosed },
            data: { label: '' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
    },
    [setNodes]
  );

  const handleSave = async () => {
    const flow: IvrFlow = {
      id: ivrId || '',
      name: 'Untitled IVR',
      nodes,
      edges,
      settings: {},
    };
    await saveFlow(flow);
    onSave?.(flow);
  };

  const handlePublish = async () => {
    await publishFlow(ivrId!);
  };

  const handleTest = async () => {
    await testFlow(ivrId!, '+15551234567');
  };

  return (
    <div className="flex h-full">
      {/* Left Palette */}
      <NodePalette disabled={readOnly} />

      {/* Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
        >
          <Background gap={15} />
          <Controls />
          <MiniMap />
          
          <Panel position="top-right">
            <IvrToolbar
              onSave={handleSave}
              onPublish={handlePublish}
              onTest={handleTest}
              readOnly={readOnly}
            />
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Properties Panel */}
      {selectedNode && (
        <IvrPropertiesPanel
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

function getDefaultNodeData(type: string): any {
  const defaults: Record<string, any> = {
    start: { label: 'Start', extension: '' },
    menu: { 
      label: 'Menu', 
      prompt: '', 
      options: [
        { digit: '1', label: 'Option 1', next: '' },
        { digit: '2', label: 'Option 2', next: '' },
      ],
      timeout: 5,
      maxRetries: 3,
    },
    announcement: { 
      label: 'Announcement', 
      audioFile: '', 
      text: '',
      useTTS: false,
    },
    queue: { 
      label: 'Queue', 
      queueId: '', 
      announcePosition: true,
      announceHoldTime: true,
    },
    timeCheck: { 
      label: 'Time Check',
      schedule: {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
      },
      holidays: [],
    },
    transfer: { 
      label: 'Transfer', 
      destination: '', 
      type: 'extension',
    },
    hangup: { label: 'Hangup', playGoodbye: true },
  };

  return defaults[type] || { label: type };
}
```

Dependencies:
```json
{
  "dependencies": {
    "reactflow": "^11.10.0"
  }
}
```

Node Types:
- StartNode: Entry point with extension number
- MenuNode: DTMF menu with options
- AnnouncementNode: Play audio or TTS
- QueueNode: Send to queue
- TimeCheckNode: Business hours routing
- TransferNode: Transfer to extension/number
- HangupNode: End call

Flow JSON Format:
```json
{
  "id": "ivr-001",
  "name": "Main IVR",
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Start", "extension": "100" }
    },
    {
      "id": "menu-1",
      "type": "menu",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Main Menu",
        "prompt": "sounds/main-menu.wav",
        "options": [
          { "digit": "1", "label": "Sales", "next": "queue-sales" },
          { "digit": "2", "label": "Support", "next": "queue-support" }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "e-start-menu",
      "source": "start-1",
      "target": "menu-1"
    }
  ]
}
```

Acceptance Criteria:
- Drag-and-drop nodes from palette
- Connect nodes with edges
- Configure node properties in panel
- Save flow to database
- Publish generates Asterisk dialplan
- Test calls work with REAL Asterisk
- No code changes needed for IVR updates''',
        92, 5, 12, 'Admin,IVR,React'))

    # Epic: Campaign Builder
    epic2 = 'Epic: Campaign Builder UI'
    items.append(create_item(epic2, 'Epic', phase, 'High',
        '''Campaign creation wizard and management UI.

Steps:
1. Campaign Details (name, type, caller ID)
2. Lead Upload (CSV import, field mapping)
3. Dialer Settings (pacing, retry, schedule)
4. Dispositions (select/customize outcomes)
5. Agent Assignment
6. Review & Launch

Features:
- CSV upload with preview
- Field auto-detection
- DNC checking
- Schedule calendar
- Real-time stats dashboard''', 95, 21, labels='Admin,Campaign'))

    # Task: Lead Upload Component
    items.append(create_item(
        'Task: Implement Lead Upload with CSV parsing',
        'Task', epic2, 'High',
        '''File: packages/web/src/components/admin/campaign/LeadUpload.tsx

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

interface LeadUploadProps {
  campaignId: string;
  onComplete: (stats: UploadStats) => void;
  onCancel: () => void;
}

interface UploadStats {
  total: number;
  imported: number;
  duplicates: number;
  invalid: number;
  dnc: number;
}

interface FieldMapping {
  csvColumn: string;
  systemField: string;
}

const SYSTEM_FIELDS = [
  { value: 'phone_number', label: 'Phone Number', required: true },
  { value: 'first_name', label: 'First Name', required: false },
  { value: 'last_name', label: 'Last Name', required: false },
  { value: 'email', label: 'Email', required: false },
  { value: 'company', label: 'Company', required: false },
  { value: 'custom_1', label: 'Custom Field 1', required: false },
  { value: 'custom_2', label: 'Custom Field 2', required: false },
  { value: 'custom_3', label: 'Custom Field 3', required: false },
  { value: 'skip', label: '-- Skip --', required: false },
];

export function LeadUpload({ campaignId, onComplete, onCancel }: LeadUploadProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 100, // Preview first 100 rows
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrors(results.errors.map(e => e.message));
          return;
        }

        const headers = results.meta.fields || [];
        setHeaders(headers);
        setCsvData(results.data);

        // Auto-detect field mappings
        const autoMappings = headers.map(header => {
          const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          let systemField = 'skip';

          if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('cell')) {
            systemField = 'phone_number';
          } else if (normalized.includes('firstname') || normalized === 'first') {
            systemField = 'first_name';
          } else if (normalized.includes('lastname') || normalized === 'last') {
            systemField = 'last_name';
          } else if (normalized.includes('email')) {
            systemField = 'email';
          } else if (normalized.includes('company') || normalized.includes('organization')) {
            systemField = 'company';
          }

          return { csvColumn: header, systemField };
        });

        setMappings(autoMappings);
        setStep('mapping');
      },
      error: (error) => {
        setErrors([error.message]);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const updateMapping = (csvColumn: string, systemField: string) => {
    setMappings(prev =>
      prev.map(m =>
        m.csvColumn === csvColumn ? { ...m, systemField } : m
      )
    );
  };

  const validateMappings = (): boolean => {
    const phoneMapping = mappings.find(m => m.systemField === 'phone_number');
    if (!phoneMapping) {
      setErrors(['Phone Number field is required']);
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateMappings()) return;
    setStep('preview');
  };

  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setProgress(0);

    try {
      // Parse full file
      const fullParse = await new Promise<any[]>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
        });
      });

      // Transform data based on mappings
      const leads = fullParse.map(row => {
        const lead: Record<string, any> = {};
        mappings.forEach(mapping => {
          if (mapping.systemField !== 'skip') {
            lead[mapping.systemField] = row[mapping.csvColumn];
          }
        });
        return lead;
      });

      // Upload in batches
      const batchSize = 100;
      const batches = Math.ceil(leads.length / batchSize);
      let imported = 0;
      let duplicates = 0;
      let invalid = 0;
      let dnc = 0;

      for (let i = 0; i < batches; i++) {
        const batch = leads.slice(i * batchSize, (i + 1) * batchSize);
        
        const response = await apiClient.post<{
          imported: number;
          duplicates: number;
          invalid: number;
          dnc: number;
        }>(`/campaigns/${campaignId}/leads/import`, {
          leads: batch,
          checkDnc: true,
        });

        imported += response.data.imported;
        duplicates += response.data.duplicates;
        invalid += response.data.invalid;
        dnc += response.data.dnc;

        setProgress(Math.round(((i + 1) / batches) * 100));
      }

      const finalStats: UploadStats = {
        total: leads.length,
        imported,
        duplicates,
        invalid,
        dnc,
      };

      setStats(finalStats);
      setStep('complete');
      onComplete(finalStats);

    } catch (error: any) {
      setErrors([error.message || 'Import failed']);
      setStep('preview');
    }
  };

  const getMappedValue = (row: any, field: string): string => {
    const mapping = mappings.find(m => m.systemField === field);
    return mapping ? row[mapping.csvColumn] || '' : '';
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {['Upload', 'Map Fields', 'Preview', 'Import'].map((label, idx) => (
          <div key={label} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${idx <= ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'}
            `}>
              {idx + 1}
            </div>
            <span className="ml-2 text-sm">{label}</span>
            {idx < 3 && <div className="w-12 h-0.5 bg-muted mx-2" />}
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <ul className="list-disc list-inside">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">
            {isDragActive ? 'Drop your CSV file here' : 'Drag & drop a CSV file here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse (max 10MB)
          </p>
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            {file?.name} - {csvData.length} rows detected
          </div>

          <Table>
            <thead>
              <tr>
                <th>CSV Column</th>
                <th>Sample Data</th>
                <th>Map To</th>
              </tr>
            </thead>
            <tbody>
              {headers.map(header => (
                <tr key={header}>
                  <td className="font-medium">{header}</td>
                  <td className="text-muted-foreground">
                    {csvData[0]?.[header] || '-'}
                  </td>
                  <td>
                    <Select
                      value={mappings.find(m => m.csvColumn === header)?.systemField}
                      onValueChange={(value) => updateMapping(header, value)}
                    >
                      {SYSTEM_FIELDS.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                          {field.required && ' *'}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handlePreview}>Preview Import</Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Preview of first 10 leads to be imported:
          </p>

          <Table>
            <thead>
              <tr>
                <th>Phone</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {csvData.slice(0, 10).map((row, idx) => (
                <tr key={idx}>
                  <td>{getMappedValue(row, 'phone_number')}</td>
                  <td>{getMappedValue(row, 'first_name')}</td>
                  <td>{getMappedValue(row, 'last_name')}</td>
                  <td>{getMappedValue(row, 'email')}</td>
                  <td>{getMappedValue(row, 'company')}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
            <Button onClick={handleImport}>Import {csvData.length} Leads</Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="text-center py-12">
          <div className="w-32 h-32 mx-auto mb-4 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${progress * 3.52} 352`}
                className="text-primary"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
              {progress}%
            </span>
          </div>
          <p className="text-lg font-medium">Importing leads...</p>
          <p className="text-sm text-muted-foreground">Please do not close this window</p>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && stats && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold mb-4">Import Complete</h3>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="bg-green-500/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.imported}</div>
              <div className="text-sm text-muted-foreground">Imported</div>
            </div>
            <div className="bg-yellow-500/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.duplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
            <div className="bg-red-500/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.invalid + stats.dnc}</div>
              <div className="text-sm text-muted-foreground">Invalid/DNC</div>
            </div>
          </div>

          <Button className="mt-8" onClick={onCancel}>Done</Button>
        </div>
      )}
    </div>
  );
}
```

Dependencies:
```json
{
  "dependencies": {
    "react-dropzone": "^14.2.3",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

Features:
- Drag-and-drop file upload
- CSV parsing with Papa Parse
- Auto-detection of field mappings
- Manual mapping adjustment
- Preview before import
- Batch import with progress
- DNC checking during import
- Duplicate detection
- Error handling

API Endpoints Used:
- POST /campaigns/:id/leads/import

Acceptance Criteria:
- CSV files up to 10MB supported
- Field auto-mapping works for common headers
- Required field (phone) validated
- Batch import shows progress
- DNC numbers rejected
- Duplicates detected and skipped
- Final stats displayed
- Works with REAL campaign API''',
        97, 4, 10, 'Admin,Campaign,Upload'))

    return items

if __name__ == '__main__':
    generate_admin_ui()
