import _ from 'lodash'
import pluralize from 'pluralize'
import { ActionTree, GetterTree, MutationTree } from 'vuex';
import { Strapi } from './Strapi'

const defaultQueryVars = {
  sort: undefined,
  limit: 0,
  start: 0,
  where: undefined
}

export default class StrapiType {
  strapi: Strapi;
  name: string;
  fields: any[];
  mutations: any;
  actions: any;

  constructor(type: { name: string; fields: any[]; }, strapi: Strapi) {
    this.strapi = strapi
    this.name = pluralize(type.name, Infinity)
    this.fields = type.fields

    this.mutations = {
      setCollection: `SET_${this.plural.toUpperCase()}`,
      setCount: `SET_${this.plural.toUpperCase()}_COUNT`,
      setItem: `SET_${this.singular.toUpperCase()}`
    }

    this.actions = {
      fetchCollection: _.camelCase(`fetch-${this.plural}`),
      fetchItem: _.camelCase(`fetch-${this.singular}`),
      // fetchItemBySlug: _.camelCase(`fetch-${this.singular}-by-slug`),
    }
  }

  get singular() {
    return pluralize(this.name, 1)
  }

  get plural() {
    return this.name
  }

  get graphqlFields() {
    return this.fields.join(' ')
  }

  get hasSlugField() {
    return this.fields.some(field => field == 'slug')
  }

  generateActions(actions: ActionTree<any, any>) {
    actions[this.actions.fetchCollection] = this.generateFetchCollectionAction()
    actions[this.actions.fetchItem] = this.generateFetchItemAction()

    // if(this.hasSlugField) {
    //   actions[this.actions.fetchItemBySlug] = this.generateFetchItemBySlugAction()
    // }
  }

  generateGetters(getters: GetterTree<any,any>) {
    getters[this.singular] = state => state[this.singular]
    getters[`${this.plural}Count`] = state => state[`${this.plural}Count`]
    getters[this.plural] = state => state[this.plural]
  }

  generateMutations(mutations: MutationTree<any>) {
    mutations[this.mutations.setCollection] = (state, payload) => state[this.plural] = payload
    mutations[this.mutations.setCount] = (state, payload) => state[`${this.plural}Count`] = payload
    mutations[this.mutations.setItem] = (state, payload) => state[this.singular] = payload
  }

  generateFetchItemAction() {
    return ({ commit },{ query, variables = {}}) => new Promise((resolve, reject) => {
      this.strapi.query(query, variables).then((resp) => {
        let item: object

        if(this.plural in resp.data) {
          item = resp.data[this.plural].shift()
        } else {
          item = resp.data[this.singular]
        }

        console.log(`[Strapi] fetched single ${this.singular}:`, item)
        commit(this.mutations.setItem, item)
        resolve(item)
      })

    })
  }

  generateFetchCollectionAction() {
    return ({ commit, state }, { query, variables = {}}) => new Promise((resolve, reject) => {
      this.strapi.query(query, variables).then((resp) => {
        let items = resp.data[this.plural]
        console.log(`[Strapi] fetched collection ${this.plural}:`, items.length)
        commit(this.mutations.setCollection, items)

        if('count' in resp.data) {
          commit(this.mutations.setCount, resp.data.count.length)
        }

        resolve(items)
      })
    })
  }
}
