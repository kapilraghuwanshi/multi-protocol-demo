// server/graphql-server.js
import { ApolloServer, gql } from 'apollo-server'; // install apollo-server
import cors from 'cors';

// In-memory user store (for learning/demo purposes)
const users = [
  {
    id: '1',
    name: 'Kapil Raghuwanshi',
    email: 'kapil@example.com',
    imagePath: '/images/kapil.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Bob Demo',
    email: 'bob@example.com',
    imagePath: '/images/bob.png',
    createdAt: new Date().toISOString(),
  },
];

// GraphQL schema
const typeDefs = gql`
  type Query {
    hello: String
    time: String
    user(id: ID!): User
    users: [User!]!
    externalPosts(limit: Int): [ExternalPost!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User
    deleteUser(id: ID!): Boolean!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    imagePath: String
    createdAt: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
    imagePath: String
  }

  input UpdateUserInput {
    name: String
    email: String
    imagePath: String
  }

  type ExternalPost {
    id: ID!
    userId: Int!
    title: String!
    body: String!
  }
`;

// Simple helper to generate IDs
function nextId() {
  return String(Math.max(0, ...users.map(u => Number(u.id || 0))) + 1);
}

// Resolvers - functions that fetch the data for each schema field
const resolvers = {
  // Basic functions to query hello and time
  Query: {
    hello: () => 'Hello from GraphQL!',
    time: () => new Date().toISOString(),

    user: (_, { id }) => users.find(u => u.id === id) || null,
    users: () => users,

    // externalPosts fetches public data from JSONPlaceholder for learning/testing
    externalPosts: async (_, { limit = 10 }) => {
      try {
        const resp = await fetch('https://jsonplaceholder.typicode.com/posts');
        if (!resp.ok) throw new Error(`External API error: ${resp.status}`);
        const data = await resp.json();
        return data.slice(0, limit).map(p => ({
          id: String(p.id),
          userId: p.userId,
          title: p.title,
          body: p.body,
        }));
      } catch (err) {
        console.error('Failed to fetch external posts:', err);
        throw new Error('Could not fetch external posts');
      }
    },
  },
  // Mutations for creating, updating, deleting users
  Mutation: {
    createUser: (_, { input }) => {
      const newUser = {
        id: nextId(),
        name: input.name,
        email: input.email,
        imagePath: input.imagePath || null,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      return newUser;
    },

    updateUser: (_, { id, input }) => {
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      const updated = { ...users[idx], ...input };
      users[idx] = updated;
      return updated;
    },

    deleteUser: (_, { id }) => {
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return false;
      users.splice(idx, 1);
      return true;
    },
  },
};

// Create and start Apollo Server with introspection enabled
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

server.listen({ port: 4000, cors: { origin: '*' } }).then(({ url }) => {
  console.log(`🚀 GraphQL server ready at ${url}`);
});