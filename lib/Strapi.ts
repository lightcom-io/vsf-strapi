import _ from 'lodash'
import pluralize from 'pluralize'
import config from 'config'
import StrapiType from './StrapiType'
import { ActionTree, GetterTree, MutationTree } from 'vuex';
import fetch from 'isomorphic-fetch'

export class Strapi {
  url: string;
  types: StrapiType[] = []

  constructor (config) {
    this.url = config.url

    config.types.forEach((type) => {
      this.types.push(new StrapiType(type, this))
    })
  }

  async query (query: string, variables = {}) {
    console.log('[Strapi]: Performing query ', {query, variables})

    const gqlQueryBody = JSON.stringify({ query, variables })

    let urlGql = `${config.strapi.url}/graphql`

    const resp = await fetch(urlGql, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: gqlQueryBody
    })

    if (!resp.ok) {
      console.error(`[Strapi] Error ${resp.status} ${resp.statusText}`)
      return Promise.reject(resp.statusText)
    }
    return await resp.json()
  }

  generateState () {
    return this.types.reduce((state: any, type: StrapiType) => Object.assign(state, {
      [type.singular]: null,
      [type.plural]: [],
      [`${type.plural}Count`]: null
    }), {})
  }

  generateActions () {
    const actions: ActionTree<any, any> = {}

    this.types.forEach((type: StrapiType) => type.generateActions(actions))

    return actions
  }

  generateGetters () {
    const getters: GetterTree<any, any> = {}

    this.types.forEach((type: StrapiType) => type.generateGetters(getters))

    return getters
  }

  generateMutations () {
    const mutations: MutationTree<any> = {}

    this.types.forEach((type: StrapiType) => type.generateMutations(mutations))

    return mutations
  }

  getType (typeName: string) {
    return this.types.find(type => type.name === pluralize(typeName, Infinity))
  }

  resolve (url) {
    return `${this.url}${url}`
  }
}

export default new Strapi(config.strapi)
