import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'
import { isServer } from '@vue-storefront/core/helpers'

export default (typeName: string) => {
  const type = Strapi.getType(typeName)

  if (!type) {
    throw new TypeError(`Strapi: unknown content type "${typeName}"`);
  }

  return {
    serverPrefetch () {
      return this.fetchCollection()
    },
    data () {
      return {
        strapiError: null
      }
    },
    computed: {
      ...mapGetters({
        [type.plural]: `strapi/${type.plural}`,
        count: `strapi/${type.plural}Count`
      }),
      strapiPersistenceMatch () {
        return this.getStrapiPersistenceKey() === this.$store.state.strapi[`${type.plural}persistenceKey`]
      }
    },
    // Client-side only
    mounted () {
      if (!this[type.plural] || !this[type.plural].length || !this.strapiPersistenceMatch) {
        this.fetchCollection()
      }
    },
    methods: {
      getStrapiPersistenceKey () {
        return this.$route.fullPath
      },
      fetchCollection () {
        const persistenceKey = this.getStrapiPersistenceKey()
        const {query, variables = {}} = this.strapiQuery()

        return this.$store.dispatch(`strapi/${type.actions.fetchCollection}`, {query, variables, persistenceKey})
          .catch(err => {
            this.strapiError = err
            if ('strapiErrorHandler' in this) this.strapiErrorHandler(err)
          })
      }
    }
  }
}
