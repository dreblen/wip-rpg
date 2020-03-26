<template>
  <v-container>
    <v-card
      v-for="(c, i) in combatants"
      :key="i"
      @click="onClick(c)"
      :disabled="c.hp <= 0"
    >
      <v-card-title>{{ c.name }}</v-card-title>
      <v-card-subtitle
        v-if="encounter.currentCombatant !== null && encounter.currentCombatant.id === c.id"
      >
        Taking Turn
      </v-card-subtitle>
      <v-card-text>
        <v-row>
          <v-col class="flex-grow-0 flex-shrink-1">
            HP
          </v-col>
          <v-col class="flex-grow-1">
            <v-progress-linear
              :value="c.hp / c.maxHP * 100"
              color="red"
            />
          </v-col>
          <v-col class="flex-grow-0 flex-shrink-1">
            {{ c.hp }}/{{ c.maxHP }}
          </v-col>
        </v-row>
        <v-row>
          <v-col class="flex-grow-0 flex-shrink-1">
            MP
          </v-col>
          <v-col class="flex-grow-1">
            <v-progress-linear
              :value="c.mp / c.maxMP * 100"
              color="blue"
            />
          </v-col>
          <v-col class="flex-grow-0 flex-shrink-1">
            {{ c.mp }}/{{ c.maxMP }}
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import { Combatant } from '@/types/combatants'

export default Vue.extend({
  name: 'CombatantCards',
  data: () => ({
  }),
  computed: {
    ...mapState([
      'encounter'
    ])
  },
  props: {
    combatants: {
      type: Array
    }
  },
  model: {
    prop: 'combatants',
    event: 'change'
  },
  methods: {
    onClick (c: Combatant): void {
      this.$emit('click', c)
    }
  }
})
</script>
