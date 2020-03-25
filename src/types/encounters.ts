import * as Attributes from './attributes'
import * as Combatants from './combatants'

// A group of enemies that go together, possibly with a unique name
export interface EnemyCombatantSet {
  type: string;
  name?: string;
  min: number;
  max: number;
}

// The range of encounter indices that an encounter is valid for
export interface AppearanceRange {
  min: number | null;
  max: number | null;
}

// Types of rewards that an encounter may yield
export enum RewardType {
  PartyMember
}

// PartyMember value for an EncounterReward
export interface RewardValueForPartyMember {
  name: string;
  attributes: Attributes.ValueList;
}

// Details on an encounter's yielded reward
export interface Reward {
  chance: number;
  type: RewardType;
  value: RewardValueForPartyMember;
}

// Definition of what enemies may appear, when the set is valid, and what
// rewards might be given upon successful completion
export interface Set {
  ranges: Array<AppearanceRange>;
  rewards?: Array<Reward>;
  enemies: Array<EnemyCombatantSet>;
}

// Types of results that an action may yield
export enum ActionResult {
  Success,
  Miss,
  Dodge,
}

// Describes an action that a Combatant can take during an encounter
export interface Action {
  name: string;
  type: ActionType;
  description: string;
  executionCount: { min: number; max: number };
  affinities: Array<Attributes.Name>;
  cost: { pool: 'hp' | 'mp'; value: number } | null;
}

export type ActionType = 'ActionAttack' | 'ActionBuff';

export interface ActionAttack extends Action {
  damage: number;
  rates: {
    hit: number;
    dodge: number;
  };
}

export interface ActionBuff extends Action {
  attributes: Attributes.ValueList;
}

// Combination of an action and one or more action targets
export type ActionSelection = [Action, Array<Combatants.Combatant>]
