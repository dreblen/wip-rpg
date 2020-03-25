import {
  AttributeName,
  AttributeValueList,
  Combatant
} from './combatants'

// A group of enemies that go together, possibly with a unique name
export interface EnemyCombatantSet {
  type: string;
  name?: string;
  min: number;
  max: number;
}

// The range of encounter indices that an encounter is valid for
export interface EncounterAppearanceRange {
  min: number | null;
  max: number | null;
}

// Types of rewards that an encounter may yield
export enum EncounterRewardType {
  PartyMember
}

// PartyMember value for an EncounterReward
export interface EncounterRewardValueForPartyMember {
  name: string;
  attributes: AttributeValueList;
}

// Details on an encounter's yielded reward
export interface EncounterReward {
  chance: number;
  type: EncounterRewardType;
  value: EncounterRewardValueForPartyMember;
}

// Definition of what enemies may appear, when the set is valid, and what
// rewards might be given upon successful completion
export interface EncounterSet {
  ranges: Array<EncounterAppearanceRange>;
  rewards?: Array<EncounterReward>;
  enemies: Array<EnemyCombatantSet>;
}

// Types of results that an action may yield
export enum EncounterActionResult {
  Success,
  Miss,
  Dodge,
}

// Describes an action that a Combatant can take during an encounter
export interface EncounterAction {
  name: string;
  affinities: Array<AttributeName>;
  cost: { pool: 'hp' | 'mp'; value: number } | null;
  actor: Combatant;
  action: (targets: Array<Combatant>) => Array<EncounterActionResult>;
}

// Combination of an action and one or more action targets
export type ActionSelection = [EncounterAction, Array<Combatant>]
