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

interface StrapiTypeInterface {
  name: string,
  single?: boolean,
  cacheItems?: boolean,
  cacheKey?: string
}

export default class StrapiType {
  strapi: Strapi;
  name: string;
  single: boolean;
  mutations: any;
  actions: any;
  cacheItems: boolean;
  cacheKey: string;
  cacheName: string;

  constructor ({name, single, cacheItems = true, cacheKey = 'id'}: StrapiTypeInterface, strapi: Strapi) {
    Object.assign(this, {strapi, single, cacheItems, cacheKey})

    if (this.single) {
      this.name = camelCase(name)

      this.mutations = {
        setItem: `SET_${this.singular.toUpperCase()}`
      }

      this.actions = {
        fetchItem: camelCase(`fetch-${this.singular}`)
      }
    } else {
      this.name = camelCase(pluralize(name, Infinity))

      this.mutations = {
        setCollection: `SET_${this.plural.toUpperCase()}`,
        setItem: `SET_${this.singular.toUpperCase()}`,
        setStatic: `SET_${this.plural.toUpperCase()}_STATIC`
      }

      this.actions = {
        fetchCollection: camelCase(`fetch-${this.plural}`),
        fetchItem: camelCase(`fetch-${this.singular}`),
        fetchStatic: camelCase(`fetch-${this.plural}-static`),
        fetchStaticCollection: camelCase(`fetch-${this.plural}-static-collection`)
      }
    }

    this.cacheName = pluralize(name, Infinity).toUpperCase()
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
      actions[this.actions.fetchStaticCollection] = this.generateFetchCollectionAction(true)
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
    return async ({ commit }, {query, variables = {}, persistenceKey}) => {
      try {
        const response = await this.strapi.query(query, variables)
        checkForErrors(response)
        let item: object
        if (this.single) {
          item = response.data[this.singular]
        } else if (this.plural in response.data) {
          item = response.data[this.plural].shift()
        } else if (Array.isArray(response.data[this.singular])) {
          item = response.data[this.singular].shift()
        } else {
          item = response.data[this.singular]
        }

        Logger.info(`Fetched single ${this.singular}:`, 'Strapi', item)()
        commit(this.mutations[mutation], {item, persistenceKey})
        this.cacheTag(item, query)
        return item
      } catch (err) {
        Logger.error(`Failed to fetch item ${this.singular}:`, 'Strapi', err)()
        commit(this.mutations[mutation], {item: null, persistenceKey})
      }
    }
  }

  generateFetchCollectionAction (statically: boolean = false) {
    return async ({ commit, state }, {query, variables = {}, persistenceKey}) => {
      try {
        const response = await this.strapi.query(query, variables)

        checkForErrors(response)
        let items = response.data[this.plural]

        Logger.info(`Fetched collection ${this.plural}:`, 'Strapi', items.length)()
        if (statically) {
          for (let item of items) {
            if (persistenceKey in item) {
              commit(this.mutations.setStatic, {item, persistenceKey: item[persistenceKey]})
              this.cacheTag(item, query)
            } else {
              Logger.error(`Missing peristence key("${persistenceKey}") in ${this.plural} item:`, 'Strapi', item)()
            }
          }
        } else {
          commit(this.mutations.setCollection, {items, persistenceKey})
          for (let i of items) if (!this.cacheTag(i, query)) break
        }

        return items
      } catch (err) {
        Logger.error(`Failed to fetch collection of ${this.plural}:`, 'Strapi', err)()
        statically || commit(this.mutations.setCollection, {items: [], persistenceKey})
      }
    }
  }

  cacheTagType () {
    if (Vue.prototype.$cacheTags) {
      Vue.prototype.$cacheTags.add('S')
      Vue.prototype.$cacheTags.add(`S:${this.cacheName}`)
    }
  }

  cacheTag (item: object, query: string | object): boolean {
    if (this.cacheItems && Vue.prototype.$cacheTags) {
      if (this.cacheKey in item) {
        Vue.prototype.$cacheTags.add(`S:${this.cacheName}:${item[this.cacheKey]}`)
        return true
      } else {
        Logger.warn(`Missing cache key("${this.cacheKey}") in ${this.singular}:`, 'Strapi', query)()
      }
    }
    return false
  }
}
