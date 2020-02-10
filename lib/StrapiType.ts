import _ from 'lodash'
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
  mutations: any;
  actions: any;

  constructor (type: { name: string }, strapi: Strapi) {
    this.strapi = strapi
    this.name = pluralize(type.name, Infinity)

    this.mutations = {
      setCollection: `SET_${this.plural.toUpperCase()}`,
      setCount: `SET_${this.plural.toUpperCase()}_COUNT`,
      setItem: `SET_${this.singular.toUpperCase()}`
    }

    this.actions = {
      fetchCollection: _.camelCase(`fetch-${this.plural}`),
      fetchItem: _.camelCase(`fetch-${this.singular}`)
      // fetchItemBySlug: _.camelCase(`fetch-${this.singular}-by-slug`),
    }
  }

  get singular () {
    return pluralize(this.name, 1)
  }

  get plural () {
    return this.name
  }

  generateState (state: any) {
    state[this.singular] = null
    state[this.plural] = []
    // state[`${this.plural}Count`] = null
    state[`${this.singular}PersistenceKey`] = null
    state[`${this.plural}PersistenceKey`] = null
  }

  generateActions (actions: ActionTree<any, any>) {
    actions[this.actions.fetchCollection] = this.generateFetchCollectionAction()
    actions[this.actions.fetchItem] = this.generateFetchItemAction()
  }

  generateGetters (getters: GetterTree<any, any>) {
    getters[this.singular] = state => state[this.singular]
    // getters[`${this.plural}Count`] = state => state[`${this.plural}Count`]
    getters[this.plural] = state => state[this.plural]
  }

  generateMutations (mutations: MutationTree<any>) {
    mutations[this.mutations.setCollection] = (state, {items, persistenceKey}) => {
      state[this.plural] = items
      state[`${this.plural}PersistenceKey`] = persistenceKey
    }
    mutations[this.mutations.setItem] = (state, {item, persistenceKey}) => {
      state[this.singular] = item
      state[`${this.singular}PersistenceKey`] = persistenceKey
    }
    // mutations[this.mutations.setCount] = (state, payload) => state[`${this.plural}Count`] = payload
  }

  generateFetchItemAction () {
    return ({ commit }, { query, variables = {}, persistenceKey}) => new Promise((resolve, reject) => {
      this.strapi.query(query, variables)
        .then((resp) => {
          checkForErrors(resp)
          let item: object
          if (this.plural in resp.data) {
            item = resp.data[this.plural].shift()
          } else if (Array.isArray(resp.data[this.singular])) {
            item = resp.data[this.singular].shift()
          } else {
            item = resp.data[this.singular]
          }

          Logger.info(`Fetched single ${this.singular}:`, 'Strapi', item)()
          commit(this.mutations.setItem, {item, persistenceKey})
          resolve(item)
        })
        .catch(err => {
          Logger.error(`Failed to fetch item ${this.singular}:`, 'Strapi', err)()
          commit(this.mutations.setItem, {item: null, persistenceKey})
          reject(err)
        })
    })
  }

  generateFetchCollectionAction () {
    return ({ commit, state }, { query, variables = {}, persistenceKey}) => new Promise((resolve, reject) => {
      this.strapi.query(query, variables)
        .then((resp) => {
          checkForErrors(resp)
          let items = resp.data[this.plural]

          Logger.info(`Fetched collection ${this.plural}:`, 'Strapi', items)()
          commit(this.mutations.setCollection, {items, persistenceKey})

          // if ('count' in resp.data) {
          //   commit(this.mutations.setCount, resp.data.count.length)
          // }

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
