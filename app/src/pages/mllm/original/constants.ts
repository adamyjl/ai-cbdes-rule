import {
  BrainCircuit,
  Database,
  LayoutDashboard,
  MessageSquareCode,
  Rocket,
  ShieldCheck,
  Workflow
} from 'lucide-react'
import type { EdgeData, KpiMetric, NodeData } from './types'
import { NavSection, NodeType } from './types'

export const NAV_ITEMS = [
  { id: NavSection.PROJECT_CENTER, label: 'Project Center', icon: LayoutDashboard },
  { id: NavSection.WORKFLOW_BUILDER, label: 'Workflow Builder', icon: Workflow },
  { id: NavSection.PROMPT_STUDIO, label: 'Prompt Studio', icon: MessageSquareCode },
  { id: NavSection.MODEL_STUDIO, label: 'Model Studio', icon: BrainCircuit },
  { id: NavSection.DATA_FACTORY, label: 'Data Factory', icon: Database },
  { id: NavSection.EVALUATION_GATE, label: 'Evaluation Gate', icon: ShieldCheck },
  { id: NavSection.DEPLOYMENT_HUB, label: 'Deployment Hub', icon: Rocket }
]

export const INITIAL_NODES: NodeData[] = [
  { id: 'cam_f', type: NodeType.RULE, label: 'Camera Front (4K)', x: 50, y: 100, status: 'success', inputs: [], outputs: ['Raw_Img'] },
  { id: 'lidar_top', type: NodeType.RULE, label: 'LiDAR Top (128)', x: 50, y: 250, status: 'success', inputs: [], outputs: ['Point_Cloud'] },
  { id: 'radar_fr', type: NodeType.RULE, label: 'Radar Front', x: 50, y: 400, status: 'success', inputs: [], outputs: ['Radar_Obj'] },
  { id: 'gnss', type: NodeType.RULE, label: 'GNSS / IMU', x: 50, y: 550, status: 'success', inputs: [], outputs: ['Ego_Pose'] },

  { id: 'perc_cam', type: NodeType.SOTA, label: 'BEVFormer (Vision)', x: 300, y: 100, status: 'success', inputs: ['Raw_Img'], outputs: ['BEV_Feat'] },
  { id: 'perc_lidar', type: NodeType.SOTA, label: 'PointPillars (Lidar)', x: 300, y: 250, status: 'success', inputs: ['Point_Cloud'], outputs: ['3D_Box'] },

  {
    id: 'fusion',
    type: NodeType.RULE,
    label: 'Multi-Sensor Fusion',
    x: 550,
    y: 180,
    status: 'success',
    inputs: ['BEV_Feat', '3D_Box', 'Radar_Obj'],
    outputs: ['Fused_Object_List']
  },
  { id: 'map_eng', type: NodeType.RULE, label: 'HD Map Engine', x: 550, y: 550, status: 'success', inputs: ['Ego_Pose'], outputs: ['Map_Vector'] },

  {
    id: 'vla_core',
    type: NodeType.VLA,
    label: 'Qwen3-0.6B (VLA Core)',
    x: 850,
    y: 280,
    status: 'running',
    inputs: ['Fused_Object_List', 'Map_Vector', 'Traffic_Light'],
    outputs: ['Traj_Plan', 'Decision_Reason']
  },
  { id: 'plan_rule', type: NodeType.RULE, label: 'Rule-Based Planner', x: 850, y: 450, status: 'idle', inputs: ['Fused_Object_List', 'Map_Vector'], outputs: ['Traj_Fallback'] },

  {
    id: 'safety_gate',
    type: NodeType.RULE,
    label: 'Safety Validator',
    x: 1100,
    y: 350,
    status: 'success',
    inputs: ['Traj_Plan', 'Traj_Fallback'],
    outputs: ['Safe_Traj']
  },
  { id: 'ctrl_lat', type: NodeType.SOTA, label: 'LQR Lateral Ctrl', x: 1350, y: 300, status: 'success', inputs: ['Safe_Traj'], outputs: ['Steer_Cmd'] },
  { id: 'ctrl_lon', type: NodeType.SOTA, label: 'PID Long. Ctrl', x: 1350, y: 400, status: 'success', inputs: ['Safe_Traj'], outputs: ['Acc_Cmd', 'Brake_Cmd'] }
]

export const INITIAL_EDGES: EdgeData[] = [
  { id: 'e1', source: 'cam_f', target: 'perc_cam', type: 'data', label: 'Raw RGB' },
  { id: 'e2', source: 'lidar_top', target: 'perc_lidar', type: 'data', label: 'PCD' },
  { id: 'e3', source: 'radar_fr', target: 'fusion', type: 'data', label: 'Obj List' },

  { id: 'e4', source: 'perc_cam', target: 'fusion', type: 'data', label: 'Features' },
  { id: 'e5', source: 'perc_lidar', target: 'fusion', type: 'data', label: '3D BBox' },

  { id: 'e6', source: 'gnss', target: 'map_eng', type: 'data', label: 'Pose' },

  { id: 'e7', source: 'fusion', target: 'vla_core', type: 'data', label: 'Objects' },
  { id: 'e8', source: 'map_eng', target: 'vla_core', type: 'data', label: 'Map Info' },

  { id: 'e9', source: 'fusion', target: 'plan_rule', type: 'data', label: 'Objects' },

  { id: 'e10', source: 'vla_core', target: 'safety_gate', type: 'data', label: 'NN Traj' },
  { id: 'e11', source: 'plan_rule', target: 'safety_gate', type: 'control', label: 'Fallback' },

  { id: 'e12', source: 'safety_gate', target: 'ctrl_lat', type: 'data', label: 'Ref Path' },
  { id: 'e13', source: 'safety_gate', target: 'ctrl_lon', type: 'data', label: 'Ref Speed' }
]

export const KPI_DATA: KpiMetric[] = [
  { subject: 'Safety', A: 120, B: 110, fullMark: 150 },
  { subject: 'Comfort', A: 98, B: 130, fullMark: 150 },
  { subject: 'Efficiency', A: 86, B: 130, fullMark: 150 },
  { subject: 'Compliance', A: 99, B: 100, fullMark: 150 },
  { subject: 'Latency', A: 85, B: 90, fullMark: 150 },
  { subject: 'Generalization', A: 65, B: 85, fullMark: 150 }
]

export const MODULE_CATEGORIES = [
  { name: 'Perception', count: 12 },
  { name: 'Prediction', count: 8 },
  { name: 'Planning', count: 5 },
  { name: 'Control', count: 6 },
  { name: 'End-to-End', count: 3 }
]

export const TARGET_PLATFORMS = [
  { id: 'orin', name: 'NVIDIA Orin-X', type: 'Edge', tops: 254 },
  { id: 'j6p', name: 'Horizon Journey 6P', type: 'Edge', tops: 560 },
  { id: 'mdc', name: 'Huawei MDC 610', type: 'Edge', tops: 400 },
  { id: 'vllm', name: 'Cloud vLLM Cluster', type: 'Cloud', tops: 'Elastic' }
]

export const BASE_MODELS = [
  { id: 'internvl2-40b', name: 'InternVL2-40B', type: 'Multimodal', family: 'InternVL', param: '40B' },
  { id: 'internvl2-26b', name: 'InternVL2-26B', type: 'Multimodal', family: 'InternVL', param: '26B' },
  { id: 'internvl2-8b', name: 'InternVL2-8B', type: 'Multimodal', family: 'InternVL', param: '8B' },
  { id: 'internvl2-2b', name: 'InternVL2-2B', type: 'Multimodal', family: 'InternVL', param: '2B' },

  { id: 'qwen2-72b', name: 'Qwen2-72B-Instruct', type: 'Language', family: 'Qwen', param: '72B' },
  { id: 'qwen-vl-max', name: 'Qwen-VL-Max', type: 'Multimodal', family: 'Qwen', param: 'N/A' },
  { id: 'qwen2-7b', name: 'Qwen2-7B-Instruct', type: 'Language', family: 'Qwen', param: '7B' },
  { id: 'qwen1.5-110b', name: 'Qwen1.5-110B-Chat', type: 'Language', family: 'Qwen', param: '110B' },

  { id: 'llama3-70b', name: 'Llama 3 70B', type: 'Language', family: 'Llama', param: '70B' },
  { id: 'llama3-8b', name: 'Llama 3 8B', type: 'Language', family: 'Llama', param: '8B' },
  { id: 'llama2-13b', name: 'Llama 2 13B', type: 'Language', family: 'Llama', param: '13B' },
  { id: 'llama3-400b', name: 'Llama 3 400B+', type: 'Language', family: 'Llama', param: '400B' },

  { id: 'deepseek-v2', name: 'DeepSeek-V2', type: 'MoE', family: 'DeepSeek', param: '236B' },
  { id: 'deepseek-coder', name: 'DeepSeek-Coder-33B', type: 'Code', family: 'DeepSeek', param: '33B' },
  { id: 'mistral-large', name: 'Mistral Large', type: 'Language', family: 'Mistral', param: '123B' },
  { id: 'gemma-27b', name: 'Gemma 2 27B', type: 'Language', family: 'Gemma', param: '27B' }
]

export const DATASETS = [
  { id: 'nuscenes', name: 'nuScenes-v1.0', size: '350GB' },
  { id: 'waymo', name: 'Waymo Open Dataset', size: '1.2TB' },
  { id: 'custom', name: 'Project-X-CornerCases', size: '50GB' }
]

export const PROMPT_TECHNIQUES = [
  { id: 'cot', label: 'Chain of Thought (CoT)', desc: 'Force step-by-step reasoning before output.' },
  { id: 'tot', label: 'Tree of Thoughts (ToT)', desc: 'Explore multiple reasoning paths.' },
  { id: 'react', label: 'ReAct', desc: 'Interleaved reasoning and action generation.' },
  { id: 'fewshot', label: 'Dynamic Few-Shot', desc: 'Retrieve examples based on semantic similarity.' }
]

export const PROMPT_OPTIMIZERS = [
  { id: 'dspy', label: 'DSPy / Teleprompter', desc: 'Automatic prompt weight optimization via compiling.' },
  { id: 'opro', label: 'OPRO (DeepMind)', desc: 'Optimization by PROmpting - LLM optimizes itself.' },
  { id: 'textgrad', label: 'TextGrad', desc: 'Gradient-based optimization for textual prompts.' }
]

export const TRAINING_LOSS_DATA = [
  { step: 0, train: 2.5, val: 2.6 },
  { step: 100, train: 1.8, val: 2.0 },
  { step: 200, train: 1.2, val: 1.5 },
  { step: 300, train: 0.9, val: 1.1 },
  { step: 400, train: 0.6, val: 0.9 },
  { step: 500, train: 0.5, val: 0.88 }
]

export const CODE_QUALITY_DATA = [
  { subject: 'Test Coverage', A: 85, B: 60, fullMark: 100 },
  { subject: 'Maintainability', A: 92, B: 75, fullMark: 100 },
  { subject: 'Cyclomatic Comp.', A: 88, B: 70, fullMark: 100 },
  { subject: 'Doc Coverage', A: 70, B: 40, fullMark: 100 },
  { subject: 'Lint Score', A: 98, B: 90, fullMark: 100 }
]

export const PUBLIC_DATASETS = [
  {
    id: 'nuscenes',
    name: 'nuScenes',
    size: '350 GB',
    type: 'Multimodal',
    images: '1.4M Frames',
    description: 'Comprehensive autonomous driving dataset with 3D bounding boxes, lidar, and radar data.'
  },
  {
    id: 'nuplan',
    name: 'nuPlan',
    size: '4 TB',
    type: 'Planning',
    images: '1500 Hours',
    description: 'Large-scale planning benchmark featuring 1500h of human driving data.'
  },
  {
    id: 'argoverse',
    name: 'Argoverse 2',
    size: '250 GB',
    type: 'Map + Sensor',
    images: '5M Frames',
    description: 'High-definition maps and sensor data for perception and forecasting.'
  },
  {
    id: 'waymo',
    name: 'Waymo Open',
    size: '1.2 TB',
    type: 'High-Fidelity',
    images: '2000 Segments',
    description: 'High-resolution sensor data collected by Waymo vehicles in diverse urban and suburban environments.'
  },
  {
    id: 'once',
    name: 'ONCE Benchmark',
    size: '500 GB',
    type: 'Semi-Supervised',
    images: '1M Scenes',
    description: 'One Million Scenes dataset designed for 3D object detection and semi-supervised learning research.'
  }
]

export const PROPRIETARY_DATASETS = [
  {
    id: 'tsinghua',
    name: 'Tsinghua Campus (Internal)',
    size: '50 GB',
    type: 'VRU Scenarios',
    images: '200k Frames',
    description: 'High-density pedestrian and cyclist interactions recorded within Tsinghua campus.'
  },
  {
    id: 'cicv',
    name: 'CICV Benchmark',
    size: '120 GB',
    type: 'Highway Pilot',
    images: '500k Frames',
    description: 'National Intelligent Connected Vehicle highway pilot scenarios and standard tests.'
  },
  {
    id: 'custom_corner',
    name: 'Project-X Corner Cases',
    size: '15 GB',
    type: 'Hard Mining',
    images: '5k Frames',
    description: 'Manually curated adversarial scenarios and edge cases from fleet disengagements.'
  },
  {
    id: 'synth_sim',
    name: 'Synthetic Sim-to-Real',
    size: '200 GB',
    type: 'Simulation',
    images: '1M Frames',
    description:
      'Procedurally generated scenarios using Unreal Engine 5 with perfect ground truth labels for domain adaptation.'
  },
  {
    id: 'freight_logistics',
    name: 'Highway Logistics',
    size: '800 GB',
    type: 'Heavy Truck',
    images: '8k Hours',
    description: 'Long-haul freight data collected from Class 8 trucks, focusing on highway merging and cut-ins.'
  }
]
