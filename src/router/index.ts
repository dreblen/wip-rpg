import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

// Define what a route definition looks like
interface RouteDefinition {
  path: string;
  name: string;
  component?: object;
}

// Define routes
const routeDefinitions: Array<RouteDefinition> = [
  {
    path: '/',
    name: 'Home'
  },
  {
    path: '/encounter',
    name: 'Encounter'
  }
]

// Associate our route definitions with components
const routes = []
for (const route of routeDefinitions) {
  route.component = () => import('../views/' + route.name + '.vue')
  routes.push(route)
}

// Finalize our router
const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
