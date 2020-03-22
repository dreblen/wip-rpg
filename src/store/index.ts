import Vue from 'vue'
import Vuex from 'vuex'

// Import minimal type information
import {
  Combatant,
  EnemyCombatant,
  PartyCombatant,
  CombatantTeam
} from '@/types'

Vue.use(Vuex)

// Define what our state object (and its children) should look like
interface EncounterState {
  isActive: boolean;
  party: Array<PartyCombatant>;
  enemies: Array<EnemyCombatant>;
}

interface State {
  party: Array<PartyCombatant>;
  encounter: EncounterState;
}

// Define our actual data store
export default new Vuex.Store({
  state: {
    party: [],
    encounter: {
      isActive: false,
      party: [],
      enemies: []
    }
  },
  getters: {
    // Evaluates whether either team has won the encounter yet
    winningTeam: function (state: State): CombatantTeam {
      let winner = CombatantTeam.None

      // Store our reduce method since we're going to use it twice
      const r = (collector: boolean, combatant: Combatant) => {
        // If we've found a living combatant, we don't need to check more
        if (collector === false) {
          return false
        }

        // If our combatant is alive, indicate it
        if (combatant.hp > 0) {
          return false
        }

        // Keep checking
        return true
      }

      // Check if all party members are dead, or then if all enemies are dead
      if (state.encounter.party.reduce(r, true) === true) {
        winner = CombatantTeam.Enemy
      } else if (state.encounter.enemies.reduce(r, true) === true) {
        winner = CombatantTeam.Party
      }

      return winner
    }
  },
  mutations: {
    addPartyMember: function (state: State, p: PartyCombatant) {
      state.party.push(p)
    },
    setEncounterActive: function (state: State, isActive: boolean) {
      state.encounter.isActive = isActive
    },
    setEncounterParty: function (state: State, p: Array<PartyCombatant>) {
      state.encounter.party = p
    },
    setEncounterEnemies: function (state: State, e: Array<EnemyCombatant>) {
      state.encounter.enemies = e
    }
  },
  actions: {
    startEncounter: function ({ commit }, payload: EncounterState) {
      commit('setEncounterParty', payload.party)
      commit('setEncounterEnemies', payload.enemies)
      commit('setEncounterActive', true)
    },
    finishEncounter: function ({ commit }) {
      commit('setEncounterParty', [])
      commit('setEncounterEnemies', [])
      commit('setEncounterActive', false)
    }
  }
})
