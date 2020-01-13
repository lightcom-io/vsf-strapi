import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'
import { isServer } from '@vue-storefront/core/helpers'

export default (typeName: string) => {
  const type = Strapi.getType(typeName)

  return {
    serverPrefetch() {
      return this.fetchItem()
    },
    computed: {
      ...mapGetters({
        [type.singular]: `strapi/${type.singular}`
      })
    },
    // Client-side only
    mounted() {
      isServer || this.fetchItem()
    },
    methods: {
      fetchItem() {
        const {query,variables = {}} = this.strapiQuery()
        return this.$store.dispatch(`strapi/${type.actions.fetchItem}`, {query,variables})
      },
    }
  }
}

