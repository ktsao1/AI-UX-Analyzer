
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export enum AnalysisType {
  UX_REVIEW = 'UX_REVIEW',
  ACCESSIBILITY = 'ACCESSIBILITY',
  COLOR_PALETTE = 'COLOR_PALETTE',
  COMPONENT_ID = 'COMPONENT_ID',
  PERSONA_CHALLENGE = 'PERSONA_CHALLENGE',
}

export interface PrototypeNode {
    id: string;
    name: string;
    type: string;
    trigger?: string;
    triggerKeywords?: string[];
    boundingBox?: Rect;
    children: PrototypeNode[];
}

export interface PrototypeFlow {
    name: string;
    root: PrototypeNode;
}

export interface FlowAnalysisStep {
  step: number;
  nodeName: string;
  imageUrl: string;
  analysisText: string;
  actionLocation?: Rect;
}