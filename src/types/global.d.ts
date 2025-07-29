// Global type declarations for the project

// Declare the scenarios module
declare module '*/scenarios' {
  import type { Scenario, OnboardingStep } from '../types/engine';
  export const ONBOARDING_SCENARIOS: Record<OnboardingStep, Scenario[]>;
  export const GENERAL_SCENARIOS: Scenario[];
}

// Declare the utils module
declare module '*/utils' {
  import type { Scenario, UserContext } from '../types/engine';
  export function generateScenarioId(): string;
  export function selectScenarioByContext(scenarios: Scenario[], context: UserContext): Scenario;
  export function analyzeEmotionalState(input: string): Partial<UserContext['emotionalState']>;
  export function updatePreferencesFromInteraction(
    currentPreferences: UserContext['preferences'],
    scenario: Scenario,
    userResponse: string,
    responseTime: number
  ): UserContext['preferences'];
  export function calculateScenarioRelevance(scenario: Scenario, context: UserContext): number;
  export function getTimeAppropriateScenarios(scenarios: Scenario[], timeOfDay: string): Scenario[];
}
