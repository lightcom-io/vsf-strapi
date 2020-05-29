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
        strapiLoading: false
      }
    },
    computed: {
      ...mapGetters({
        [type.plural]: `strapi/${type.plural}`
      }),
      strapiPersistenceKey () {
        return this.$route.fullPath
      },
      strapiPersistenceMatch () {
        return this.strapiPersistenceKey === this.$store.state.strapi[`${type.plural}PersistenceKey`]
      }
    },
    mounted () {
      if (!this[type.plural] || !this[type.plural].length || !this.strapiPersistenceMatch) {
        this.fetchCollection()
      }
    },
    methods: {
      fetchCollection () {
        if (this.strapiLoading) return
        const persistenceKey = this.strapiPersistenceKey
        const {query, variables = {}} = this.strapiQuery()

        this.strapiLoading = true

        return this.$store.dispatch(`strapi/${type.actions.fetchCollection}`, {query, variables, persistenceKey})
          .catch(err => {
            if ('strapiErrorHandler' in this) this.strapiErrorHandler(err)
          })
          .then(res => {
            this.strapiLoading = false
            return res
          })
      }
    }
  }
}
