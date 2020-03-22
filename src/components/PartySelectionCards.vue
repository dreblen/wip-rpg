<template>
  <v-container>
    <v-item-group multiple v-model="selectedItemIndices">
      <v-row>
        <v-item
          v-for="(p, i) in party"
          :key="i"
          v-slot:default="{ active, toggle }"
        >
          <v-col
            cols="12"
            sm="6"
            md="4"
            lg="3"
            xl="2"
          >
            <v-card
              :color="active ? 'yellow lighten-4' : ''"
            >
              <v-card-title @click="toggle">
                {{ p.name }} (Lv {{ p.level }})
                <v-spacer />
                <v-btn icon @click.stop="toggle">
                  <v-icon>
                    {{ active ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
                  </v-icon>
                </v-btn>
              </v-card-title>
              <v-expansion-panels flat tile>
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <template v-slot:default="{ open }">
                      <v-row v-if="open">
                        <v-col v-for="(a, i) in p.attributes" :key="i">
                          <b>{{ i }}:</b>{{ a.value }}
                        </v-col>
                      </v-row>
                      <v-row v-else>
                        <v-col v-for="(set, i) in attributeSets" :key="i">
                          <v-progress-linear
                            :value="p[set[0]] / p[set[1]] * 100"
                            :color="set[2]"
                          />
                        </v-col>
                      </v-row>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row v-for="(set, i) in attributeSets" :key="i">
                      <v-col class="flex-grow-0 flex-shrink-1">
                        {{ set[0].toUpperCase() }}
                      </v-col>
                      <v-col class="flex-grow-1">
                        <v-progress-linear
                          :value="p[set[0]] / p[set[1]] * 100"
                          :color="set[2]"
                        />
                      </v-col>
                      <v-col class="flex-grow-0 flex-shrink-1">
                        {{ p[set[0]] }}/{{ p[set[1]] }}
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card>
          </v-col>
        </v-item>
      </v-row>
    </v-item-group>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'

export default Vue.extend({
  name: 'PartySelectionCards',
  data: () => ({
    attributeSets: [
      ['xp', 'maxXP', 'green'],
      ['hp', 'maxHP', 'red'],
      ['mp', 'maxMP', 'blue']
    ],
    selectedItemIndices: []
  }),
  computed: {
    ...mapState([
      'party'
    ])
  },
  watch: {
    selectedItemIndices () {
      this.$emit('change', this.selectedItemIndices.map(i => this.party[i]))
    }
  },
  props: {
    selection: {
      type: Array
    }
  },
  model: {
    prop: 'selection',
    event: 'change'
  }
})
</script>
