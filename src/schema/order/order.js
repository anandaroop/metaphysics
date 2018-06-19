import { graphql, GraphQLNonNull, GraphQLString } from "graphql"
import { OrderType } from "schema/order/index"
export const Order = {
  name: "Order",
  type: OrderType,
  description: "Returns a single Order",
  args: { id: { type: new GraphQLNonNull(GraphQLString) } },
  resolve: (_parent, _args, context, { rootValue: { stressSchema } }) => {
    const query = `
      query EcommerceOrder($id: ID!) {
        ecommerce_order(id: $id) {
          id
          code
          currencyCode
          state
          partnerId
          userId
          lineItems{
            edges{
              node{
                id
                priceCents
                artworkId
                editionSetId
              }
            }
          }
        }
      }
    `
    return graphql(stressSchema, query, null, context, {
      id: _args.id,
    }).then(a => {
      console.log(a)
      return a.data.ecommerce_order
    })
  },
}
