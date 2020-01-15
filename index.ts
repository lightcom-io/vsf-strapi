import { module } from './store'
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { Logger } from '@vue-storefront/core/lib/logger'
import Strapi from './lib/Strapi'

export const StrapiModule: StorefrontModule = async function ({app, store, router, moduleConfig, appConfig}) {
  Logger.info('Initializing module...', 'Strapi', Strapi)()
  store.registerModule('strapi', module)
}
