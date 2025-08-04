
import React, { useState, useCallback, useRef } from 'react';
import { AnalysisType, PrototypeFlow, PrototypeNode, FlowAnalysisStep, Rect } from './types';
import { ANALYSIS_OPTIONS } from './constants';
import { analyzeImage, generateFlowSusAnalysis } from './services/geminiService';
import { getFigmaNodeImage, imageURLToBase64, getFigmaFileContent, buildPrototypeTree } from './services/figmaService';
import type { FigmaNode } from './figmaTypes';
import Header from './components/Header';
import FigmaInput from './components/FigmaInput';
import AnalysisSelector from './components/AnalysisSelector';
import Loader from './components/Loader';
import FlowSelector from './components/FlowSelector';
import FlowAnalysisReport from './components/FlowAnalysisReport';
import SusReportDisplay from './components/SusReportDisplay';
import MultipleRunsDisplay from './components/MultipleRunsDisplay';

const MAX_STEPS = 10; // Safety break for the analysis loop

const extractActionComponent = (text: string): string | null => {
    const match = text.match(/ACTION_COMPONENT:\s*"([^"]+)"/);
    return match ? match[1] : null;
};

const extractActionLocation = (text: string): string | null => {
    const match = text.match(/ACTION_LOCATION:\s*"([^"]+)"/);
    return match ? match[1].toLowerCase().replace(/\s+/g, '-').trim() : null;
};

const extractCompletionStatus = (text: string): boolean => {
    const match = text.match(/TASK_COMPLETE:\s*(YES|NO)/);
    return match ? match[1].toUpperCase() === 'YES' : false;
}

const findNodeInTree = (nodeId: string, node: PrototypeNode): PrototypeNode | null => {
    if (node.id === nodeId) {
        return node;
    }
    for (const child of node.children) {
        const found = findNodeInTree(nodeId, child);
        if (found) {
            return found;
        }
    }
    return null;
}

const getLocationKey = (childBox: Rect, parentBox: Rect): string => {
    const relativeX = childBox.x - parentBox.x;
    const relativeY = childBox.y - parentBox.y;

    const childCenterX = relativeX + childBox.width / 2;
    const childCenterY = relativeY + childBox.height / 2;
    
    let location = '';

    if (childCenterY < parentBox.height / 3) {
        location += 'top';
    } else if (childCenterY < (parentBox.height * 2) / 3) {
        location += 'center';
    } else {
        location += 'bottom';
    }

    location += '-';

    if (childCenterX < parentBox.width / 3) {
        location += 'left';
    } else if (childCenterX < (parentBox.width * 2) / 3) {
        location += 'center';
    } else {
        location += 'right';
    }
    
    return location === 'center-center' ? 'center' : location;
};

const App: React.FC = () => {
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [figmaToken] = useState<string>('figd_8KKMSpgYHMWwtaizQLKqM9KZErlgPNugtsk7A5Mh'); // Replace with your Figma API token
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [nodeMap, setNodeMap] = useState<Map<string, FigmaNode> | null>(null);

  const [initialImageBase64, setInitialImageBase64] = useState<string | null>(null);
  const [initialImageMimeType, setInitialImageMimeType] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [prototypeFlows, setPrototypeFlows] = useState<PrototypeFlow[] | null>(null);
  const [selectedFlowForPersona, setSelectedFlowForPersona] = useState<PrototypeFlow | null>(null);

  const [analysisType, setAnalysisType] = useState<AnalysisType>(AnalysisType.PERSONA_CHALLENGE);
  const [persona] = useState<string>('A boomer using an app for the first time');
  const [challenge, setChallenge] = useState<string>('Find and edit your user profile.');
  const [flowAnalysisSteps, setFlowAnalysisSteps] = useState<FlowAnalysisStep[] | null>(null);
  const [finalSusAnalysis, setFinalSusAnalysis] = useState<string | null>(null);
  // New state for multiple runs
  const [numRuns, setNumRuns] = useState<number>(1);
  type MultiRunResult = {
    steps: FlowAnalysisStep[];
    sus: string | null;
    executionTime?: string;
    cancelled?: boolean;
  };
  const [multiRunResults, setMultiRunResults] = useState<MultiRunResult[]>([]);
  // Cancel analysis ref
  const cancelAnalysisRef = useRef(false);
  const handleCancelAnalysis = () => {
    cancelAnalysisRef.current = true;
    setLoaderMessage('Cancelling...');
  };
  
  const [isFetchingFigma, setIsFetchingFigma] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingSus, setIsGeneratingSus] = useState<boolean>(false);
  const [loaderMessage, setLoaderMessage] = useState<string>('Analyzing...');
  const [error, setError] = useState<string | null>(null);
  const [liveRunTime, setLiveRunTime] = useState<number>(0);
  const liveRunTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFetchFigmaData = async () => {
    if (!figmaUrl) {
        setError('Please provide a Figma URL.');
        return;
    }

    const match = figmaUrl.match(/(?:file|design)\/([^\/]+)\/.*?node-id=([^&]+)/);
    if (!match || !match[1] || !match[2]) {
        setError('Invalid Figma URL. Please ensure it contains a file key and a node-id for a selected frame.');
        return;
    }
    const currentFileKey = match[1];
    let nodeId = decodeURIComponent(match[2]);
    setFileKey(currentFileKey);
    nodeId = nodeId.replace('-', ':');

    setIsFetchingFigma(true);
    setError(null);
    setFlowAnalysisSteps(null);
    setFinalSusAnalysis(null);
    setImagePreviewUrl(null);
    setPrototypeFlows(null);
    setSelectedFlowForPersona(null);
    setNodeMap(null);

    try {
        const [figmaImageUrl, fileContent] = await Promise.all([
            getFigmaNodeImage(currentFileKey, nodeId, figmaToken),
            getFigmaFileContent(currentFileKey, figmaToken)
        ]);
        
        const { base64, mimeType } = await imageURLToBase64(figmaImageUrl);
        setInitialImageBase64(base64);
        setInitialImageMimeType(mimeType);
        setImagePreviewUrl(figmaImageUrl);

        const { flows, nodeMap: figmaNodeMap } = buildPrototypeTree(fileContent.document);
        setPrototypeFlows(flows);
        setNodeMap(figmaNodeMap);

    } catch (e) {
        console.error("Figma Fetch Error:", e);
        setError(`Failed to fetch from Figma: ${e instanceof Error ? e.message : 'Unknown error'}`);
        setImagePreviewUrl(null);
        setInitialImageBase64(null);
        setInitialImageMimeType(null);
        setFileKey(null);
        setNodeMap(null);
    } finally {
        setIsFetchingFigma(false);
    }
  };
  
  const handleFlowSelectForPersona = async (flow: PrototypeFlow) => {
      if (!fileKey) {
          setError("Figma file context is missing. Please fetch the file data again.");
          return;
      }
      setIsLoading(true);
      setLoaderMessage('Fetching start frame...');
      setError(null);
      setSelectedFlowForPersona(flow);
      
      try {
          const figmaImageUrl = await getFigmaNodeImage(fileKey, flow.root.id, figmaToken);
          const { base64, mimeType } = await imageURLToBase64(figmaImageUrl);
          setInitialImageBase64(base64);
          setInitialImageMimeType(mimeType);
          setImagePreviewUrl(figmaImageUrl);
      } catch (e) {
          console.error("Error fetching flow start frame:", e);
          setError(`Failed to fetch image for selected flow: ${e instanceof Error ? e.message : 'Unknown error'}`);
          setSelectedFlowForPersona(null);
      } finally {
          setIsLoading(false);
      }
  };

  const handleClearImage = () => {
    setInitialImageBase64(null);
    setInitialImageMimeType(null);
    setImagePreviewUrl(null);
    setFlowAnalysisSteps(null);
    setFinalSusAnalysis(null);
    setPrototypeFlows(null);
    setSelectedFlowForPersona(null);
    setFileKey(null);
    setError(null);
    setNodeMap(null);
    setMultiRunResults([]);
    cancelAnalysisRef.current = false;
  };
  
  const handleAnalyzeClick = useCallback(async () => {
    // Live timer setup
    setLiveRunTime(0);
    if (liveRunTimerRef.current) clearInterval(liveRunTimerRef.current);
    liveRunTimerRef.current = setInterval(() => {
      setLiveRunTime(prev => prev + 1);
    }, 1000);
    cancelAnalysisRef.current = false;
    if (!initialImageBase64 || !initialImageMimeType || !selectedFlowForPersona || !fileKey || !nodeMap) {
      setError("Please select a valid Figma flow to start the challenge.");
      return;
    }
    if (!persona.trim() || !challenge.trim()) {
      setError("Please provide both a persona and a challenge prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setFlowAnalysisSteps([]);
    setFinalSusAnalysis(null);
    setMultiRunResults([]);
    setLoaderMessage('Starting analysis...');

    const runs = Math.max(1, numRuns);
    const allResults: MultiRunResult[] = [];

    let cancelled = false;
    for (let runIdx = 0; runIdx < runs; runIdx++) {
      const runStart = Date.now();
      if (cancelAnalysisRef.current) {
        cancelled = true;
        break;
      }
      setLoaderMessage(`Starting analysis run ${runIdx + 1} of ${runs}...`);
      // Persona context and prompt
      const personaContext = `Persona Context:\nName: Linda Thompson\nAge: 67\nOccupation: Retired elementary school teacher\nTech Comfort Level: Beginner-to-Intermediate\nDevices Used: iPhone SE (2020), Windows laptop (used mainly for email and recipes)\n\nBackground:\nLinda is a friendly, thoughtful, and curious retiree who enjoys gardening, reading mystery novels, and keeping in touch with her grandkids via FaceTime. She’s not afraid to try new tech, but she often finds modern apps overwhelming—especially those with lots of icons, unfamiliar terminology, or nested menus. She learned how to use Zoom during the pandemic and is proud of mastering online grocery ordering, though it took several tries. Her patience is high, but her frustration kicks in when she doesn’t understand what went wrong or if things change suddenly (like an app updating its interface).\n\nPersonality Traits:\n- Likes to read everything before clicking\n- Frequently double-checks actions before confirming\n- Will call her daughter if confused before trying again\n- Trusts brands that feel \"safe\" and don’t rush her\n- Notices font size, color contrast, and layout spacing more than younger users\n\nCommon Challenges:\n- Struggles with gesture-based navigation (e.g., swiping, long press)\n- Gets confused by hamburger menus and unlabeled icons\n- Often taps the wrong button due to small touch targets\n- Prefers written instructions over tooltips or animations\n- Might not notice subtle notifications or badges\n\nGoals When Using an App:\n- Complete tasks with clear steps and minimal ambiguity\n- Avoid making mistakes or doing something irreversible\n- Learn to use it well enough to feel independent\n- Feel like the app is “for her” and not just for “young people”\n\nFavorite Phrase:\n“I just want it to tell me what to do—plain and simple.”`;
      const finalPrompt = `${personaContext}\n\n` + ANALYSIS_OPTIONS.find(opt => opt.id === AnalysisType.PERSONA_CHALLENGE)!.prompt
        .replace(/\$\{persona\}/g, persona)
        .replace(/\$\{challenge\}/g, challenge);

      let currentSteps: FlowAnalysisStep[] = [];
      let taskCompleted = false;
      let stepCounter = 1;
      let currentNode: PrototypeNode | null = selectedFlowForPersona.root;
      let currentImageBase64 = initialImageBase64;
      let currentImageMimeType = initialImageMimeType;
      let currentImageUrl = imagePreviewUrl!;

      while (!taskCompleted && stepCounter <= MAX_STEPS && currentNode) {
        if (cancelAnalysisRef.current) {
          cancelled = true;
          break;
        }
        try {
          setLoaderMessage(`Analyzing step ${stepCounter} (run ${runIdx + 1})...`);
          const analysisText = await analyzeImage(currentImageBase64, currentImageMimeType, finalPrompt);
          const currentStepData: FlowAnalysisStep = {
            step: stepCounter,
            nodeName: currentNode.name,
            imageUrl: currentImageUrl,
            analysisText: analysisText,
          };
          taskCompleted = extractCompletionStatus(analysisText);
          const componentName = extractActionComponent(analysisText);
          const locationName = extractActionLocation(analysisText);
          const parentFrameBox = nodeMap.get(currentNode.id)?.absoluteBoundingBox;
          let nextInteraction: PrototypeNode | null = null;
          const textMatches = Array.from(new Set(
              currentNode.children.filter(child =>
                  child.triggerKeywords?.some(keyword =>
                      keyword === componentName?.toLowerCase().trim() ||
                      (keyword.length > 2 && componentName?.toLowerCase().trim().includes(keyword)) ||
                      keyword.includes(componentName?.toLowerCase().trim() ?? '___')
                  )
              )
          ));
          const locationMatches = (locationName && parentFrameBox)
              ? currentNode.children.filter(child => child.boundingBox && getLocationKey(child.boundingBox, parentFrameBox) === locationName)
              : [];
          if (locationMatches.length > 0 && textMatches.length > 0) {
              const combinedMatches = textMatches.filter(textMatch => locationMatches.includes(textMatch));
              if (combinedMatches.length === 1) nextInteraction = combinedMatches[0];
          }
          if (!nextInteraction && textMatches.length === 1) {
              nextInteraction = textMatches[0];
          }
          if (!nextInteraction && textMatches.length === 0 && locationMatches.length === 1) {
              nextInteraction = locationMatches[0];
          }
          if (nextInteraction && nextInteraction.boundingBox && parentFrameBox) {
              const absoluteChildBox = nextInteraction.boundingBox;
              const relativeBox: Rect = {
                  x: ((absoluteChildBox.x - parentFrameBox.x) / parentFrameBox.width) * 100,
                  y: ((absoluteChildBox.y - parentFrameBox.y) / parentFrameBox.height) * 100,
                  width: (absoluteChildBox.width / parentFrameBox.width) * 100,
                  height: (absoluteChildBox.height / parentFrameBox.height) * 100,
              };
              currentStepData.actionLocation = relativeBox;
          }
          currentSteps.push(currentStepData);
          if (runIdx === 0) setFlowAnalysisSteps([...currentSteps]); // Show first run live
          if (taskCompleted) {
            setLoaderMessage('Task completed!');
            break;
          }
          if (!componentName) {
            currentStepData.analysisText += `\n\n**🤖 AI did not specify an action. Halting analysis.**`;
            if (runIdx === 0) setFlowAnalysisSteps([...currentSteps]);
            break;
          }
          if (nextInteraction && nextInteraction.id) {
            setLoaderMessage(`Navigating to step ${stepCounter + 1} (run ${runIdx + 1})...`);
            stepCounter++;
            currentNode = findNodeInTree(nextInteraction.id, selectedFlowForPersona.root);
            if (!currentNode) {
                currentStepData.analysisText += `\n\n**🤖 AI tried to navigate, but the destination node was not found in the flow tree.**`;
                if (runIdx === 0) setFlowAnalysisSteps([...currentSteps]);
                break;
            }
            const figmaImageUrl = await getFigmaNodeImage(fileKey, nextInteraction.id, figmaToken);
            const { base64, mimeType } = await imageURLToBase64(figmaImageUrl);
            currentImageBase64 = base64;
            currentImageMimeType = mimeType;
            currentImageUrl = figmaImageUrl;
          } else {
            let reason = `AI suggested an action on "${componentName}"`;
            if (locationName) reason += ` at location "${locationName}"`;
            reason += ", but no unique matching prototype link was found.";
            currentStepData.analysisText += `\n\n**🤖 ${reason} This might be the end of the flow.**`;
            if (runIdx === 0) setFlowAnalysisSteps([...currentSteps]);
            break;
          }
        } catch (e) {
          console.error(`Error during step ${stepCounter}:`, e);
          setError(`An error occurred during step ${stepCounter}: ${e instanceof Error ? e.message : 'Unknown error'}`);
          break;
        }
      }
      if (stepCounter > MAX_STEPS) {
        setError(`Analysis stopped after reaching the maximum of ${MAX_STEPS} steps.`);
      }
      let susText: string | null = null;
      if (currentSteps.length > 0) {
        try {
          setIsGeneratingSus(true);
          susText = await generateFlowSusAnalysis(persona, challenge, currentSteps);
        } catch (e) {
          console.error("SUS Analysis Error:", e);
          setError(`An error occurred while generating the final SUS analysis: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
          setIsGeneratingSus(false);
        }
      }
      const runEnd = Date.now();
      let executionTime = '';
      if (currentSteps.length > 0) {
        const ms = runEnd - runStart;
        const sec = Math.floor((ms / 1000) % 60);
        const min = Math.floor(ms / 60000);
        executionTime = `${min > 0 ? min + 'm ' : ''}${sec}s`;
      }
      allResults.push({ steps: currentSteps, sus: susText, executionTime });
      if (runIdx === 0) {
        setFinalSusAnalysis(susText);
      }
    }
    setIsLoading(false);
    if (liveRunTimerRef.current) {
      clearInterval(liveRunTimerRef.current);
      liveRunTimerRef.current = null;
    }
    // If cancelled, mark summary in results
    if (cancelled && allResults.length > 0) {
      allResults[allResults.length - 1].cancelled = true;
    }
    setMultiRunResults(allResults);
  }, [initialImageBase64, initialImageMimeType, analysisType, persona, challenge, selectedFlowForPersona, fileKey, imagePreviewUrl, nodeMap, figmaToken, numRuns]);

  const anyLoading = isLoading || isGeneratingSus || isFetchingFigma;
  const showPersonaInputs = analysisType === AnalysisType.PERSONA_CHALLENGE;

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <Header />
        <main className="mt-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 text-center" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {!imagePreviewUrl && !isFetchingFigma && (
            <FigmaInput
              figmaUrl={figmaUrl}
              setFigmaUrl={setFigmaUrl}
              onFetch={handleFetchFigmaData}
              isLoading={isFetchingFigma}
            />
          )}
          {isFetchingFigma && <Loader message="Fetching Figma data..." />}
          {imagePreviewUrl && !isFetchingFigma && (
            <div className="w-full p-4 md:p-8 bg-gray-800/40 rounded-xl shadow-lg border border-gray-700">
              <div className="flex flex-col md:flex-row gap-8">
                 <div className="md:w-1/2 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">
                      {selectedFlowForPersona ? `Start of '${selectedFlowForPersona.name}'` : 'Your Figma Screen'}
                    </h3>
                    <div className="relative group">
                        <img src={imagePreviewUrl} alt="UI Preview" className="rounded-lg w-full h-auto object-contain max-h-[400px]" />
                        <button 
                            onClick={handleClearImage}
                            className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div className="md:w-1/2 flex flex-col">
                    <div className="flex-grow">
                      <AnalysisSelector selectedType={analysisType} onTypeChange={setAnalysisType} disabled={anyLoading} />
                      {analysisType === AnalysisType.PERSONA_CHALLENGE && prototypeFlows && (
                        <FlowSelector 
                           flows={prototypeFlows} 
                           selectedFlow={selectedFlowForPersona}
                           onSelectFlow={handleFlowSelectForPersona} 
                           isLoading={isLoading}
                        />
                      )}
                      {showPersonaInputs && (
                          <div className="my-4 space-y-6 animate-fade-in">
                              <div className="text-center">
                                  <label className="block text-sm font-medium text-gray-400 mb-2">Active Persona</label>
                                  <div className="inline-flex items-center bg-gray-700 border border-gray-600 rounded-full px-4 py-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                      </svg>
                                      <span className="font-semibold text-gray-200">Boomer Persona</span>
                                  </div>
                              </div>
                              <div>
                                  <label htmlFor="challenge" className="block text-sm font-medium text-gray-400 mb-2 text-center">
                                    Challenge Prompt
                                  </label>
                                  <textarea
                                      id="challenge"
                                      value={challenge}
                                      onChange={(e) => setChallenge(e.target.value)}
                                      disabled={anyLoading}
                                      rows={3}
                                      placeholder={"e.g., 'How would I share this photo?'"}
                                      className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 text-center"
                                  />
                              </div>
                              {/* Number of runs input */}
                              <div className="flex flex-col items-center mt-4">
                                <label htmlFor="numRuns" className="block text-sm font-medium text-gray-400 mb-2 text-center">Number of Persona Challenge Runs</label>
                                <input
                                  id="numRuns"
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={numRuns}
                                  onChange={e => setNumRuns(Math.max(1, Math.min(10, Number(e.target.value))))}
                                  disabled={anyLoading}
                                  className="w-24 bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 text-center"
                                />
                              </div>
                          </div>
                      )}
                    </div>
                    <div className="mt-auto pt-4">
                       {(analysisType !== AnalysisType.PERSONA_CHALLENGE || selectedFlowForPersona) && (
                         <div>
                          <h3 className="text-lg font-semibold text-gray-300 mb-2 text-center">3. Start Analysis</h3>
                          <button
                              onClick={handleAnalyzeClick}
                              disabled={anyLoading || (analysisType === AnalysisType.PERSONA_CHALLENGE && !selectedFlowForPersona)}
                              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition-transform duration-200 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                          >
                            {anyLoading ? loaderMessage : `Run Persona Challenge${numRuns > 1 ? ` (${numRuns}x)` : ''}`}
                          </button>
                        </div>
                       )}
                    </div>
                </div>
              </div>
            </div>
          )}
          {isLoading && (!flowAnalysisSteps || flowAnalysisSteps.length === 0) && (
            <div className="flex flex-col items-center gap-4">
              <Loader message={loaderMessage} />
              <div className="text-gray-400 text-sm">Elapsed: {Math.floor(liveRunTime / 60)}m {liveRunTime % 60}s</div>
              <button
                onClick={handleCancelAnalysis}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:opacity-50"
                disabled={loaderMessage === 'Cancelling...'}
              >
                Cancel Analysis
              </button>
            </div>
          )}
          {/* Show MultipleRunsDisplay if more than 1 run and results exist */}
          {!isLoading && multiRunResults.length > 1 && (
            <MultipleRunsDisplay runs={multiRunResults.map(r => ({
              steps: r.steps,
              susAnalysis: (r.sus || '') + (r.cancelled ? ' (Cancelled)' : ''),
              executionTime: r.executionTime,
              cancelled: r.cancelled,
            }))} />
          )}
          {/* Show single run as before if only 1 run */}
          {!isLoading && multiRunResults.length <= 1 && flowAnalysisSteps && flowAnalysisSteps.length > 0 && (
             <FlowAnalysisReport steps={flowAnalysisSteps} />
          )}
          {isGeneratingSus && (
            <div className="flex flex-col items-center justify-center gap-4 my-8">
              <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
              <p className="text-gray-400 text-md">Generating final usability report...</p>
            </div>
          )}
          {!isGeneratingSus && finalSusAnalysis && <SusReportDisplay report={finalSusAnalysis} />}
        </main>
        <footer className="text-center text-gray-600 py-8">
          Built with React, Tailwind CSS, and the Google Gemini API.
        </footer>
      </div>
    </div>
  );
};

export default App;
