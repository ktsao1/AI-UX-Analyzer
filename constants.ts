
import { AnalysisType } from './types';

export const ANALYSIS_OPTIONS = [
  {
    id: AnalysisType.UX_REVIEW,
    label: 'UI/UX Review',
    prompt: `You are a world-class UI/UX design expert. Analyze the provided app interface screenshot.

First, provide a detailed review covering usability, visual hierarchy, layout, typography, and overall user experience. Offer at least 3 actionable suggestions for improvement. Structure this part with clear headings and bullet points.

Second, add a distinct section titled '### System Usability Scale (SUS) Analysis'. In this section, evaluate the interface against the 10 standard SUS statements as if you were a representative user. For each statement, provide a rating from 1 (Strongly Disagree) to 5 (Strongly Agree) and a brief justification for your rating based on the visual evidence.
The 10 SUS statements are:
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

After rating all 10 statements, calculate an estimated final SUS score. The formula is: sum of [(rating for odd items - 1) + (5 - rating for even items)] and then multiply the total sum by 2.5.

Finally, present the estimated score and provide a brief interpretation of what this score signifies in terms of overall usability (e.g., Excellent, Good, OK, Poor, or Awful).`,
  },
  {
    id: AnalysisType.ACCESSIBILITY,
    label: 'Accessibility Check',
    prompt: "You are an accessibility expert (A11Y). Analyze the provided app interface screenshot. Identify potential accessibility issues related to color contrast, target sizes, font readability, and screen reader compatibility. Provide a list of issues and suggest specific improvements for each. Reference WCAG 2.1 guidelines where applicable. Use headings and bullet points.",
  },
  {
    id: AnalysisType.COLOR_PALETTE,
    label: 'Color Palette Extraction',
    prompt: "You are a design specialist. Analyze the provided app interface screenshot. Extract the primary, secondary, and accent colors. Provide the hex codes for each color in a list format. Describe how the color palette contributes to the app's branding and user experience.",
  },
  {
    id: AnalysisType.COMPONENT_ID,
    label: 'Component Identification',
    prompt: "You are a frontend developer. Analyze the provided app interface screenshot. Identify and list all the major UI components visible (e.g., buttons, input fields, navigation bar, cards, modals). For each component, briefly describe its purpose and visual state. Present the information in a clear, structured list.",
  },
  {
    id: AnalysisType.PERSONA_CHALLENGE,
    label: 'Persona Challenge',
    prompt: `You are embodying a specific user persona to complete a challenge by navigating a UI.

**Persona:** \${persona}
**Challenge:** '\${challenge}'

Analyze the current screen and explain your thought process from the persona's point of view. What would you do next to move towards completing the challenge? Be true to the persona; if the UI is confusing or if it's in character, you might make a mistake or click the wrong thing. Your goal is to simulate a realistic user journey, including potential errors.

---

After your thought process, you must provide three pieces of information on separate lines for the system to parse:
1.  Based on your reasoning, identify the *single UI element* you would interact with to proceed. This could be the correct element, or an incorrect one if the persona is confused. Your answer for this part MUST be in the format: ACTION_COMPONENT: "Exact Name of the UI Element"
2.  Specify the general location of this element on a 3x3 grid (top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right). Your answer for this part MUST be in the format: ACTION_LOCATION: "location"
3.  After this action, determine if you believe the original challenge has now been fully completed. Your answer for this part MUST be in the format: TASK_COMPLETE: YES or TASK_COMPLETE: NO
`,
  },
];

export const FLOW_SUS_ANALYSIS_PROMPT = `
You are a world-class UI/UX design expert who has just observed a user persona complete a task.
Based on the provided transcript of the user's journey, perform a comprehensive System Usability Scale (SUS) analysis for the *entire flow*.

**User Persona:** \${persona}
**User's Challenge:** \${challenge}

**Transcript of User's Thought Process Step-by-Step:**
---
\${journey}
---

Now, provide a new, distinct section titled '### Overall Usability Analysis'.

In this section, evaluate the interface against the 10 standard SUS statements, considering the entire journey from the provided persona's perspective.
For each statement, create a \`####\` markdown sub-header that includes the full question and your rating out of 5. On the next line, provide the justification as plain text. Do not use bullet points or numbered lists.

Example for one item:
#### 1. I think that I would like to use this system frequently. (Rating: 4/5)
The persona completed the core task quickly, suggesting they would not be frustrated by repeated use.

The 10 SUS statements are:
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

After evaluating all 10 statements, calculate the final SUS score. The formula is: sum of [(rating for odd items - 1) + (5 - rating for even items)] and then multiply the total sum by 2.5.

Present the final score FIRST, on its own line, in the format: FINAL_SUS_SCORE: [score].

After presenting the score, provide a detailed interpretation of what this score signifies in terms of overall usability (e.g., Excellent, Good, OK, Poor, or Awful), summarizing the key pain points and successes observed during the user's journey.
`;
