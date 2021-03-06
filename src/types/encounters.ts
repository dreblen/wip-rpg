import * as Attributes from './attributes'

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
