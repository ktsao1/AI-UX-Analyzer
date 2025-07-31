
// A simplified set of types for the Figma File API response.
// This is not exhaustive but covers what's needed for prototype extraction.

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FigmaFile {
    document: FigmaNode;
    components: { [key: string]: FigmaNode };
    styles: { [key: string]: any };
    name: string;
    lastModified: string;
    thumbnailUrl: string;
    version: string;
}

export interface Vector {
    x: number;
    y: number;
}

// The modern way to define a flow's starting point.
export interface FlowStartingPoint {
    nodeId: string;
    name: string;
}

// This represents a single user interaction definition.
// Renamed from Reaction to match modern Figma API terminology.
export interface Interaction {
    action: Action | null;
    trigger: Trigger;
}

export interface Trigger {
    type: 'ON_CLICK' | 'ON_DRAG' | 'ON_HOVER' | 'ON_PRESS' | 'AFTER_DELAY' | 'MOUSE_ENTER' | 'MOUSE_LEAVE' | 'MOUSE_UP' | 'MOUSE_DOWN';
    delay?: number;
}

export interface Action {
    type: 'BACK' | 'CLOSE' | 'NODE' | 'URL';
    destinationId: string | null;
    navigation: 'NAVIGATE' | 'SWAP' | 'OVERLAY' | 'SCROLL_TO';
    transition: any | null; // Complex object, simplified for now
    url?: string;
}

export interface PrototypeStartingPoint {
    name: string;
    description: string;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'VECTOR' | 'BOOLEAN_OPERATION' | 'STAR' | 'LINE' | 'ELLIPSE' | 'REGULAR_POLYGON' | 'RECTANGLE' | 'TEXT' | 'SLICE' | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE';
    children?: FigmaNode[];
    characters?: string; // Content of a TEXT node
    absoluteBoundingBox?: Rect;
    // Properties for prototyping
    reactions?: Interaction[]; // Deprecated, but good for backward compatibility
    prototypeInteractions?: Interaction[]; // The modern field for interactions
    transitionNodeID?: string | null; // For simple, single transitions
    prototypeStartingPoint?: PrototypeStartingPoint | null; // Deprecated starting point
    flowStartingPoints?: FlowStartingPoint[]; // The modern field for flow starts, present on CANVAS nodes
    // Other properties (simplified)
    backgroundColor?: any;
    fills?: any[];
    strokes?: any[];
    strokeWeight?: number;
    opacity?: number;
    visible?: boolean;
    locked?: boolean;
    // And many more...
}