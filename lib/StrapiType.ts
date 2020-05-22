/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import Vue from 'vue'
import { camelCase } from 'camel-case'
import pluralize from 'pluralize'
import { ActionTree, GetterTree, MutationTree } from 'vuex';
import { Strapi } from './Strapi'
import { Logger } from '@vue-storefront/core/lib/logger'

const defaultQueryVars = {
  sort: undefined,
  limit: 0,
  start: 0,
  where: undefined
}

const checkForErrors = (resp) => {
  if (resp.errors && resp.errors.length) {
    throw new Error(resp.errors.map(err => err.message).join(' | '))
  }
}

export default class StrapiType {
  strapi: Strapi;
  name: string;
  single: boolean;
  mutations: any;
  actions: any;

  constructor (type: { name: string, single: boolean }, strapi: Strapi) {
    this.strapi = strapi
    this.single = Boolean(type.single)

    if (this.single) {
      this.name = camelCase(type.name)

      this.mutations = {
        setItem: `SET_${this.singular.toUpperCase()}`
      }

      this.actions = {
        fetchItem: camelCase(`fetch-${this.singular}`)
      }
    } else {
      this.name = camelCase(pluralize(type.name, Infinity))

      this.mutations = {
        setCollection: `SET_${this.plural.toUpperCase()}`,
        setCount: `SET_${this.plural.toUpperCase()}_COUNT`,
        setItem: `SET_${this.singular.toUpperCase()}`,
        setStatic: `SET_${this.plural.toUpperCase()}_STATIC`
      }

      this.actions = {
        fetchCollection: camelCase(`fetch-${this.plural}`),
        fetchItem: camelCase(`fetch-${this.singular}`),
        fetchStatic: camelCase(`fetch-${this.plural}-static`)
      }
    }
  }

  get singular () {
    return pluralize(this.name, 1)
  }

  get plural () {
    return this.name
  }

  get static () {
    return `${this.plural}Static`
  }

  generateState (state: any) {
    state[this.singular] = null
    state[`${this.singular}PersistenceKey`] = null

    if (!this.single) {
      state[this.plural] = []
      state[this.static] = {}
      state[`${this.plural}PersistenceKey`] = null
    }
  }

  generateActions (actions: ActionTree<any, any>) {
    actions[this.actions.fetchItem] = this.generateFetchItemAction()
    if (!this.single) {
      actions[this.actions.fetchCollection] = this.generateFetchCollectionAction()
      actions[this.actions.fetchStatic] = this.generateFetchItemAction(true)
    }
  }

  generateGetters (getters: GetterTree<any, any>) {
    getters[this.singular] = state => state[this.singular]
    if (!this.single) {
      getters[this.plural] = state => state[this.plural]
      getters[this.static] = (state) => (persistenceKey) => state[this.static][persistenceKey]
    }
  }

  generateMutations (mutations: MutationTree<any>) {
    mutations[this.mutations.setItem] = (state, {item, persistenceKey}) => {
      Vue.set(state, this.singular, item)
      Vue.set(state, `${this.singular}PersistenceKey`, persistenceKey)
    }

    if (!this.single) {
      mutations[this.mutations.setCollection] = (state, {items, persistenceKey}) => {
        Vue.set(state, this.plural, items)
        Vue.set(state, `${this.plural}PersistenceKey`, persistenceKey)
      }

      mutations[this.mutations.setStatic] = (state, {item, persistenceKey}) => {
        Vue.set(state[this.static], persistenceKey, item)
      }
    }
  }

  generateFetchItemAction (statically: boolean = false) {
    const mutation = statically ? 'setStatic' : 'setItem'
    return ({ commit }, {query, variables = {}, persistenceKey}) => new Promise((resolve, reject) => {
      this.strapi.query(query, variables)
        .then((resp) => {
          checkForErrors(resp)
          let item: object
          if (this.single) {
            item = resp.data[this.singular]
          } else if (this.plural in resp.data) {
            item = resp.data[this.plural].shift()
          } else if (Array.isArray(resp.data[this.singular])) {
            item = resp.data[this.singular].shift()
          } else {
            item = resp.data[this.singular]
          }

          Logger.info(`Fetched single ${this.singular}:`, 'Strapi', item)()
          commit(this.mutations[mutation], {item, persistenceKey})
          resolve(item)
        })
        .catch(err => {
          Logger.error(`Failed to fetch item ${this.singular}:`, 'Strapi', err)()
          commit(this.mutations[mutation], {item: null, persistenceKey})
          reject(err)
        })
    })
  }

  generateFetchCollectionAction () {
    return ({ commit, state }, {query, variables = {}, persistenceKey}) => new Promise((resolve, reject) => {
      this.strapi.query(query, variables)
        .then((resp) => {
          checkForErrors(resp)
          let items = resp.data[this.plural]

          Logger.info(`Fetched collection ${this.plural}:`, 'Strapi', items)()
          commit(this.mutations.setCollection, {items, persistenceKey})

          resolve(items)
        })
        .catch(err => {
          Logger.error(`Failed to fetch collection of ${this.plural}:`, 'Strapi', err)()

          commit(this.mutations.setCollection, {items: [], persistenceKey})
          reject(err)
        })
    })
  }
}
