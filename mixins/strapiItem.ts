import { mapGetters } from 'vuex'
import Strapi from '../lib/Strapi'
import axios from 'axios'
import config from 'config'

export default (typeName: string, { onDemand = false, persist = false }: {onDemand?: boolean, persist?: boolean|string} = {}) => {
  const type = Strapi.getType(typeName)

  return {
    serverPrefetch () {
      return onDemand || this.fetchItem()
    },
    data () {
      return {
        dataREST: {},
        strapiLoading: false
      }
    },
    computed: {
      ...mapGetters({
        [type.singular]: `strapi/${type.singular}`
      }),
      strapiPersistenceKey () {
        return persist ? (persist === true ? this.$vnode.tag : persist) : this.$route.fullPath
      },
      strapiPersistenceMatch () {
        return this.strapiPersistenceKey === this.$store.state.strapi[`${type.singular}PersistenceKey`]
      }
    },
    watch: {
      strapiPersistenceKey () {
        onDemand || this.strapiPersistenceMatch || this.fetchItem()
      }
    },
    mounted () {
      if (!onDemand && (!this[type.singular] || !this.strapiPersistenceMatch)) {
        this.fetchItem()
      }
    },
    methods: {
      fetchItem () {
        if (this.strapiLoading) return
        const persistenceKey = this.strapiPersistenceKey
        const {query, variables = {}} = this.strapiQuery()

        this.strapiLoading = true

        return this.$store.dispatch(`strapi/${type.actions.fetchItem}`, {query, variables, persistenceKey})
          .catch(err => {
            if ('strapiErrorHandler' in this) this.strapiErrorHandler(err)
          })
          .finally(() => {
            this.strapiLoading = false
          })
      },
      async fetchRESTContent (endPoint, locale = false) {
        try {
          let response = await axios.get(`${config.strapi.url}/${endPoint}`)
          this.dataREST = {
            ...response.data,
            ...response.data[`content_zone_${locale}`] && { content_zone: response.data[`content_zone_${locale}`] },
            ...response.data[`title_${locale}`] && { title: response.data[`title_${locale}`] }
          }
        } catch (err) {
          console.log(err)
        }
      }
    }
  }
}
