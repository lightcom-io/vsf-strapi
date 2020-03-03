import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'
import { isServer } from '@vue-storefront/core/helpers'

export default (typeName: string) => {
  const type = Strapi.getType(typeName)

  return {
    serverPrefetch () {
      return this.fetchItem()
    },
    data () {
      return {
        [type.singular]: null,
        strapiError: null,
        strapiPersistenceKey: this.$route.fullPath,
        strapiIgnoreRouteChange: false
      }
    },
    computed: {
      ...mapGetters({
        storeItem: `strapi/${type.singular}`
      }),
      strapiPersistenceMatch () {
        return this.strapiPersistenceKey === this.$store.state.strapi[`${type.singular}persistenceKey`]
      }
    },
    watch: {
      $route (to, from) {
        this.strapiPersistenceKey = this.$route.fullPath
        this.strapiIgnoreRouteChange || this.fetchItem()
      }
    },
    created () {
      this.$store.watch(
        (state) => {
          return state.strapi;
        },
        (strapiState) => {
          if (strapiState.hasOwnProperty(type.singular)) {
            this[type.singular] = strapiState[type.singular]
          }
        },
        {
          deep: true
        }
      );
    },
    mounted () {
      if (!this[type.singular] || !this.strapiPersistenceMatch) {
        this.fetchItem()
      }
    },
    methods: {
      fetchItem () {
        const persistenceKey = this.strapiPersistenceKey
        const {query, variables = {}} = this.strapiQuery()
        return this.$store.dispatch(`strapi/${type.actions.fetchItem}`, {query, variables, persistenceKey})
          .catch(err => {
            this.strapiError = err
            if ('strapiErrorHandler' in this) this.strapiErrorHandler(err)
          })
      }
    }
  }
}
