# vsf-strapi

## Hotfix - Lakritsroten

[LS-14]

- Fixed bug related to iOS Safari. On `route-link` tap recipe collections was rewrited
by collection that have only 4 items. Vue `watch -> $route()` was the issue of this behavior

## Setup
### Installation
For now, we use this package as a git submodule:

```bash
git submodule add git@github.com:lightcom-io/vsf-strapi.git src/modules/strapi
```

### Registration

Then, to make VSF aware of it, it needs to be added in the `src/modules/client.ts` by first importing it:
```js
import { StrapiModule } from './strapi'
```
and then add it in the register function:
```js
registerModule(StrapiModule)
```

### Config

We need to config the endpoint and define the types we are going to use from strapi in the `local.json`:

```json
  "strapi": {
    "url": "https://strapi.hostname.tld",
    "types": [
      {
        "name": "articles"
      },
      {
        "name": "brands"
      }
    ]
  }
```

## Usage

### Single items
**(The item will be accessable in the component as the singular form of the type. In this example it would be `this.brand`.)**

To fetch a single item from strapi, we first include the mixin:
```js
import strapiItem from 'src/modules/strapi/mixins/strapiItem';
```
...then add the mixin to the component:
```js
  mixins: [strapiItem('brands')],
```
Define the `strapiQuery` method in the component:
```js
    strapiQuery () {
      const query = `
      query($id: ID!) {
        brand(id: $id) {
          title
          image {
            url
            name
          }
        }
      }
      `;

      const variables = {
        id: this.$route.params.id
      };

      return { query, variables };
    }
```
The `strapiQuery` method must return an object with a `query` key containing the GraphQL query as a string. An optional `variables` object can be included if variables are needed in the query.

### Collections
**(The collection will be accessable in the component as the plural form of the type. In this example it would be `this.brands`.)**
To fetch a single item from strapi, we first include the mixin:
```js
import strapiCollection from 'src/modules/strapi/mixins/strapiCollection';
```
...then add the mixin to the component:
```js
  mixins: [strapiCollection('brands')],
```
Define the `strapiQuery` method in the component:
```js
    strapiQuery () {
      const query = `
        query {
          brands {
            title
            image {
                url
                name
            }
          }
        }
      `;

      return { query };
    }
```
The `strapiQuery` method must return an object with a `query` key containing the GraphQL query as a string. An optional `variables` object can be included if variables are needed in the query.

## Notes
 - See the [documentation for the Strapi GraphQL layer](https://strapi.io/documentation/3.0.0-beta.x/plugins/graphql.html) if you need more info on how to build the queries.
 - Don't forget the submodule when deploying.
