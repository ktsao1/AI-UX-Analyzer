
import type { FigmaFile, FigmaNode, Interaction } from '../figmaTypes';
import type { PrototypeNode, PrototypeFlow } from '../types';

export const getFigmaFileContent = async (fileKey: string, token: string): Promise<FigmaFile> => {
    const figmaApiUrl = `https://api.figma.com/v1/files/${fileKey}?geometry=paths`;

    try {
        const response = await fetch(figmaApiUrl, {
            headers: { 'X-Figma-Token': token },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.err || `Figma API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching Figma file content:', error);
        throw error;
    }
};

export const getFigmaNodeImage = async (fileKey: string, nodeId: string, token: string): Promise<string> => {
    // The node ID must be URL-encoded as it can contain characters like ':'
    const figmaApiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`;

    try {
        const response = await fetch(figmaApiUrl, {
            headers: {
                'X-Figma-Token': token,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.err || `Figma API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.err) {
            throw new Error(data.err);
        }

        const imageUrl = data.images[nodeId];
        if (!imageUrl) {
            throw new Error('Node ID not found or no image generated. Ensure the URL points to a renderable frame and the node ID is correct.');
        }

        return imageUrl;
    } catch (error) {
        console.error('Error fetching from Figma API:', error);
        throw error;
    }
};

export const imageURLToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${url}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({ base64: base64String, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- Prototype Flow Extraction Logic ---

const buildNodeMap = (node: FigmaNode, map: Map<string, FigmaNode>) => {
    map.set(node.id, node);
    if ('children' in node && Array.isArray(node.children)) {
        for (const child of node.children) {
            buildNodeMap(child, map);
        }
    }
};

const buildFlowTreeRecursive = (nodeId: string, nodeMap: Map<string, FigmaNode>, visited: Set<string>): PrototypeNode | null => {
    if (visited.has(nodeId)) {
        const cycleNode = nodeMap.get(nodeId);
        return {
            id: nodeId,
            name: cycleNode?.name || 'Unknown',
            type: cycleNode?.type || 'Unknown',
            trigger: 'CYCLIC_REFERENCE',
            children: [],
        };
    }

    const node = nodeMap.get(nodeId);
    if (!node) return null;

    visited.add(nodeId);

    const children: PrototypeNode[] = [];
    const interactionsToProcess: { sourceNode: FigmaNode, interaction: Interaction }[] = [];
    
    const gatherInteractions = (currentNode: FigmaNode) => {
        if (!currentNode) return;
        const currentInteractions = [...(currentNode.prototypeInteractions || []), ...(currentNode.reactions || [])];
        
        for (const interaction of currentInteractions) {
            interactionsToProcess.push({ sourceNode: currentNode, interaction });
        }
        
        if (currentNode.transitionNodeID && !currentInteractions.some(i => i.action?.destinationId === currentNode.transitionNodeID)) {
            interactionsToProcess.push({
                sourceNode: currentNode,
                interaction: {
                    trigger: { type: 'ON_CLICK' },
                    action: { type: 'NODE', destinationId: currentNode.transitionNodeID, navigation: 'NAVIGATE', transition: null }
                }
            });
        }
        
        if (currentNode.children) {
            for (const child of currentNode.children) {
                gatherInteractions(child);
            }
        }
    }

    gatherInteractions(node);

    for (const { sourceNode, interaction } of interactionsToProcess) {
        const action = interaction.action;
        if (action?.type === 'NODE' && action.destinationId) {
            const childNode = buildFlowTreeRecursive(action.destinationId, nodeMap, new Set(visited));
            if (childNode) {
                const triggerSource = sourceNode.id === node.id ? 'the frame itself' : `"${sourceNode.name}"`;
                childNode.trigger = `${interaction.trigger.type} on ${triggerSource}`;
                
                const keywords = new Set<string>();
                keywords.add(sourceNode.name.toLowerCase());

                const findTextRecursively = (n: FigmaNode) => {
                    if (n.type === 'TEXT' && n.characters) {
                        keywords.add(n.characters.toLowerCase());
                    }
                    if (n.children) {
                        n.children.forEach(findTextRecursively);
                    }
                };
                findTextRecursively(sourceNode);
                
                childNode.triggerKeywords = Array.from(keywords).filter(k => k.trim() !== '');
                childNode.boundingBox = sourceNode.absoluteBoundingBox;

                children.push(childNode);
            }
        }
    }
    
    return {
        id: node.id,
        name: node.name,
        type: node.type,
        children: children,
    };
};

export const buildPrototypeTree = (document: FigmaNode): { flows: PrototypeFlow[]; nodeMap: Map<string, FigmaNode> } => {
    const nodeMap = new Map<string, FigmaNode>();
    buildNodeMap(document, nodeMap);

    const flows: PrototypeFlow[] = [];
    const processedStartingNodeIds = new Set<string>();

    if (document.type === 'DOCUMENT' && document.children) {
        const canvases = document.children.filter(child => child.type === 'CANVAS');
        for (const canvas of canvases) {
            if (canvas.flowStartingPoints) {
                for (const startPoint of canvas.flowStartingPoints) {
                    if (processedStartingNodeIds.has(startPoint.nodeId)) {
                        continue;
                    }

                    const rootNode = buildFlowTreeRecursive(startPoint.nodeId, nodeMap, new Set());
                    if (rootNode) {
                        flows.push({
                            name: startPoint.name,
                            root: rootNode,
                        });
                        processedStartingNodeIds.add(startPoint.nodeId);
                    }
                }
            }
        }
    }

    for (const node of nodeMap.values()) {
        if (node.prototypeStartingPoint && !processedStartingNodeIds.has(node.id)) {
            const rootNode = buildFlowTreeRecursive(node.id, nodeMap, new Set());
            if (rootNode) {
                flows.push({
                    name: node.prototypeStartingPoint.name || 'Unnamed Flow',
                    root: rootNode,
                });
                processedStartingNodeIds.add(node.id);
            }
        }
    }

    return { flows, nodeMap };
};
