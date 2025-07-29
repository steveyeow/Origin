import type { Scenario, OnboardingStep } from '../../../types/engine'

declare module './scenarios' {
  export const ONBOARDING_SCENARIOS: Record<OnboardingStep, Scenario[]>
  export const GENERAL_SCENARIOS: Scenario[]
}
