/**
 * Boss module exports - Phase 7.3
 */

// Base classes
export { Boss, type BossConfig, type BossPhase } from './Boss';
export { BossStateMachine, BossState, type StateConfig } from './BossStateMachine';
export { BossHealthBar, type BossHealthBarConfig } from './BossHealthBar';

// Boss implementations
export { Abomination } from './Abomination';
export { PatientZero } from './PatientZero';
export { ColossusArmored } from './ColossusArmored';

// Factory
export { BossFactory } from './BossFactory';
