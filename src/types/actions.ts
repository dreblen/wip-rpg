import * as Attributes from './attributes'
import * as Combatants from './combatants'

// Types of results that an action may yield
export enum Result {
  Success,
  Miss,
  Dodge,
}

// Describes an action that a Combatant can take during an encounter
export interface Action {
  name: string;
  type: Type;
  targetType: TargetType;
  description: string;
  executionCount: { min: number; max: number };
  affinities: Array<Attributes.Name>;
  cost: { pool: 'hp' | 'mp'; value: number } | null;
}

export type Type = 'Attack' | 'Buff' | 'Debuff';
export type TargetType = 'Self' | 'Single' | 'All';

export interface Attack extends Action {
  damage: number;
  rates: {
    hit: number;
    dodge: number;
  };
}

export interface Buff extends Action {
  attributes: Attributes.ValueList;
}

// Combination of an action and one or more action targets
export type Selection = [Action, Array<Combatants.Combatant>]
