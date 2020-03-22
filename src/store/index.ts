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
  index: number;
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
      index: 0,
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
    removePartyMember: function (state: State, p: PartyCombatant) {
      const i = state.party.findIndex(o => o.id === p.id)
      state.party.splice(i, 1)
    },
    increaseEncounterIndex: function (state: State) {
      state.encounter.index++
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
      commit('increaseEncounterIndex')
      commit('setEncounterParty', payload.party)
      commit('setEncounterEnemies', payload.enemies)
      commit('setEncounterActive', true)
    },
    finishEncounter: function ({ state, commit }) {
      // Eliminate any killed party members globally
      state.encounter.party.forEach((p) => {
        if (p.hp <= 0) {
          commit('removePartyMember', p)
        }
      })

      // See if we have any living party members left
      const living = state.encounter.party.filter(p => p.hp > 0)
      if (living.length > 0) {
        // Determine experience points based on the enemies' attributes
        const xp = 10 * state.encounter.enemies.reduce((c, e) => {
          return c + Object.keys(e.attributes).reduce((c, a) => {
            return c + e.attributes[a].value
          }, 0)
        }, 0)

        // Divide the experience between the living party members, giving a
        // bonus based on the LDR attribute
        living.forEach((p) => {
          p.xp += (xp / living.length) * (1 + (0.05 * p.attributes.ldr.value))
        })

        // Mark these party members as unavailable for the next encounter
        living.forEach((p) => {
          p.encountersUntilAvailable = 1
        })
      }

      // For any party members who were *not* in this most recent encounter,
      // decrease their usage cooldown period
      state.party.filter((p) => {
        return living.findIndex(l => l.id === p.id) === -1
      }).forEach((p) => {
        if (p.encountersUntilAvailable > 0) {
          p.encountersUntilAvailable--
        }
      })

      // Reset our encounter data
      commit('setEncounterParty', [])
      commit('setEncounterEnemies', [])
      commit('setEncounterActive', false)
    }
  }
})
