import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'
import { isServer } from '@vue-storefront/core/helpers'

export default (typeName: string) => {
  const type = Strapi.getType(typeName)

  if(!type) {
    throw `Strapi: unknown type "${typeName}"`;
  }

  return {
    serverPrefetch() {
      return this.fetchCollection()
    },
    computed: {
      ...mapGetters({
        [type.plural]: `strapi/${type.plural}`,
        count: `strapi/${type.plural}Count`
      })
    },
    // Client-side only
    mounted() {
      isServer || this.fetchCollection()
    },
    methods: {
      fetchCollection() {
        const {query,variables = {}} = this.strapiQuery()
        return this.$store.dispatch(`strapi/${type.actions.fetchCollection}`, {query,variables})
      }
    }
  }
}
