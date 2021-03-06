import { ResolverContext } from "types/graphql"
import { getMicrofunnelData } from "./utils/getMicrofunnelData"
import { shuffle, take } from "lodash"

import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
} from "graphql"
import { ArtworkType } from "schema/v2/artwork"
import { deprecate } from "lib/deprecation"
import { getRecentlySoldArtworksConnection } from "schema/v2/types/targetSupply/recentlySoldArtworksConnection"
import { TargetSupplyMicrofunnelMetadata } from "schema/v2/types/targetSupply/targetSupplyMicrofunnelMetadata"

const ArtistTargetSupplyType = new GraphQLObjectType<any, ResolverContext>({
  name: "ArtistTargetSupply",
  fields: {
    isTargetSupply: {
      description: "True if artist is in target supply list.",
      type: GraphQLBoolean,
      resolve: (artist) => artist.target_supply,
    },
    isInMicrofunnel: {
      description: "True if an artist is in the microfunnel list.",
      type: GraphQLBoolean,
      resolve: (artist) => Boolean(getMicrofunnelData(`/artist/${artist.id}`)),
    },
    microfunnel: {
      type: new GraphQLObjectType<any, ResolverContext>({
        name: "ArtistTargetSupplyMicrofunnel",
        fields: () => ({
          /**
           * This field is resolved by parsing static CSVtoJSON data.
           * @see src/schema/v2/artist/targetSupply/utils/getMicrofunnelData.ts
           */
          metadata: {
            type: TargetSupplyMicrofunnelMetadata,
          },

          artworksConnection: getRecentlySoldArtworksConnection(),

          /**
           * Deprecated.
           */
          artworks: {
            deprecationReason: deprecate({
              inVersion: 2,
              preferUsageOf: "artworksConnection",
            }),
            args: {
              randomize: {
                type: GraphQLBoolean,
                description:
                  "Randomize the order of artworks for display purposes.",
              },
              size: {
                type: GraphQLInt,
                description: "Number of artworks to return",
              },
            },
            type: new GraphQLList(
              new GraphQLObjectType({
                name: "ArtistTargetSupplyMicrofunnelArtwork",
                fields: () => {
                  return {
                    artwork: {
                      type: ArtworkType,
                    },
                    realizedPrice: {
                      type: GraphQLString,
                    },
                  }
                },
              })
            ),
            resolve: async (
              artist,
              { randomize = false, size = 100 },
              { artworksLoader }
            ) => {
              const artworkIds = take(
                artist.metadata.recentlySoldArtworkIDs,
                size
              )
              const artworks = await artworksLoader({
                ids: artworkIds,
              })
              let artworksWithRealizedPrice = artworks.map((artwork, index) => {
                const realizedPrice = artist.artworks[index].realizedPrice
                return {
                  artwork,
                  realizedPrice,
                }
              })
              if (randomize) {
                artworksWithRealizedPrice = shuffle(artworksWithRealizedPrice)
              }
              return artworksWithRealizedPrice
            },
          },
        }),
      }),
      resolve: (artist) => {
        const microfunnelData = getMicrofunnelData(`/artist/${artist.id}`) // pass in artist href, as thats how CSV data is formatted
        return microfunnelData
      },
    },
  },
})

export const ArtistTargetSupply: GraphQLFieldConfig<void, ResolverContext> = {
  type: ArtistTargetSupplyType,
  resolve: (artist) => artist,
}
