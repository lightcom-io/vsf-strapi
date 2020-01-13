import { Module } from 'vuex'
import Strapi from '../lib/Strapi'

export const module: Module<any, any> = {
  namespaced: true,
  state: Strapi.generateState(),
  actions: Strapi.generateActions(),
  getters: Strapi.generateGetters(),
  mutations: Strapi.generateMutations()
}

console.log('strapi store',module)
