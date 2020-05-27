import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'

export default (typeName: string, { onDemand = false }: {onDemand?: boolean} = {}) => {
  const type = Strapi.getType(typeName)

  return {
    serverPrefetch () {
      return onDemand || this.fetchItem()
    },
    data () {
      return {
        [type.singular]: null,
        strapiLoading: false
      }
    },
    computed: {
      ...mapGetters({
        [type.static]: `strapi/${type.static}`
      })
    },
    beforeMount () {
      if (!this.strapiPersistenceKey) {
        throw new Error(`Strapi: Static loading of items require the "strapiPersistenceKey" property to be set or computed in the component`)
      }
    },
    watch: {
      strapiPersistenceKey () {
        onDemand || this.fetchItem()
      }
    },
    mounted () {
      const item = this[type.static](this.strapiPersistenceKey)

      if (item) {
        this[type.singular] = item
      } else if (!onDemand) {
        this.fetchItem()
      }
    },
    methods: {
      fetchItem (force: boolean = false) {
        if (this.strapiLoading) return

        const item = this[type.static](this.strapiPersistenceKey)

        if (item && !force) {
          this[type.singular] = item
          return
        }

        const persistenceKey = this.strapiPersistenceKey
        const {query, variables = {}} = this.strapiQuery()

        this.strapiLoading = true

        return this.$store.dispatch(`strapi/${type.actions.fetchStatic}`, {query, variables, persistenceKey})
          .then(() => {
            this[type.singular] = this[type.static](this.strapiPersistenceKey)
          })
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
