import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'

export default (typeName: string, { onDemand = false, persist = false }: {onDemand?: boolean, persist?: boolean|string} = {}) => {
  const type = Strapi.getType(typeName)

  if (!type) {
    throw new TypeError(`Strapi: unknown content type "${typeName}"`);
  }

  return {
    serverPrefetch () {
      return onDemand || this.fetchCollection()
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
        return persist ? (persist === true ? this.$vnode.tag : persist) : this.$route.fullPath
      },
      strapiPersistenceMatch () {
        return this.strapiPersistenceKey === this.$store.state.strapi[`${type.plural}PersistenceKey`]
      }
    },
    watch: {
      $route () {
        onDemand || this.strapiPersistenceMatch || this.fetchCollection()
      }
    },
    mounted () {
      if (!onDemand && (!this[type.plural]?.length || !this.strapiPersistenceMatch)) {
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
          .finally(() => {
            this.strapiLoading = false
          })
      }
    }
  }
}
