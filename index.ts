import { module } from './store'
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import Strapi from './lib/Strapi'

export const StrapiModule: StorefrontModule = async function ({app, store, router, moduleConfig, appConfig}) {
	console.log('[Strapi] Initializing module...',Strapi)
  store.registerModule('strapi', module)
}
