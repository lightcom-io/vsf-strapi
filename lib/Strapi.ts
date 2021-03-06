/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import pluralize from 'pluralize'
import config from 'config'
import StrapiType from './StrapiType'
import { ActionTree, GetterTree, MutationTree } from 'vuex';
import fetch from 'isomorphic-fetch'
import { Logger } from '@vue-storefront/core/lib/logger'
import { camelCase } from 'camel-case'
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import { removeStoreCodeFromRoute, currentStoreView } from '@vue-storefront/core/lib/multistore'

export class Strapi {
  url: string;
  types: StrapiType[] = []

  constructor (config) {
    this.url = config.url

    config.types.forEach((type) => {
      this.types.push(new StrapiType(type, this))
    })
  }

  async query (query: string | object, variables = {}) {
    Logger.info('Performing query', 'Strapi', {query, variables})()

    if (typeof query !== 'string') {
      query = jsonToGraphQLQuery({ query })
    }

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
      Logger.error('Strapi query failed', 'Strapi', `${resp.status} ${resp.statusText}`)()

      return Promise.reject(resp.statusText)
    }
    return resp.json()
  }

  generateState () {
    const state: any = {}

    this.types.forEach((type: StrapiType) => type.generateState(state))

    return state
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
    return this.types.find(type => type.single && type.name === camelCase(typeName)) ||
      this.types.find(type => type.name === camelCase(pluralize(typeName, Infinity)))
  }

  resolve (url) {
    return `${this.url}${url}`
  }

  mappingFallback({type: typeName, route, query}) {
    return async ({ dispatch }, {url, params}) => {
      const { i18n, storeCode, appendStoreCode } = currentStoreView()

      const slug = (removeStoreCodeFromRoute(url.startsWith('/') ? url.slice(1) : url) as string).replace(/\/$/, "")
      const language = i18n.defaultLanguage.toLowerCase()

      try {
        const type = this.getType(typeName)
        const persistenceKey = `${type.singular}:${slug}`

        const item = await dispatch(`strapi/${type.actions.fetchItem}`, 
          { 
            query, 
            variables: { 
              slug, 
              language 
            }, 
            persistenceKey
          },
          { 
            root: true 
          })

        if(item) {
          return {
            name: route,
            params: {
              slug,
              persistenceKey
            }
          }
        }
      } catch {
        return undefined
      }
    }
  }
}

export default new Strapi(config.strapi)
