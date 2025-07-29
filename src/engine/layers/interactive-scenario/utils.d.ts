import type { Scenario, UserContext } from '../../../types/engine'

declare module './utils' {
  export function generateScenarioId(): string
  export function selectScenarioByContext(scenarios: Scenario[], context: UserContext): Scenario
  export function analyzeEmotionalState(input: string): Partial<UserContext['emotionalState']>
  export function updatePreferencesFromInteraction(
    currentPreferences: UserContext['preferences'],
    scenario: Scenario,
    userResponse: string,
    responseTime: number
  ): UserContext['preferences']
  export function calculateScenarioRelevance(scenario: Scenario, context: UserContext): number
  export function getTimeAppropriateScenarios(scenarios: Scenario[], timeOfDay: string): Scenario[]
}
