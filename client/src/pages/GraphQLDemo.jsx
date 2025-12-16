import React, { useState } from "react";
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, useMutation, gql } from "@apollo/client";

const client = new ApolloClient({
  uri: "http://localhost:4000", // adjust if running remotely
  cache: new InMemoryCache(),
});

/* GraphQL operations - CRUD */
const HELLO_QUERY = gql`
  query {
    hello
    time
  }
`;

const USERS_QUERY = gql`
  query {
    users {
      id
      name
      email
      imagePath
      createdAt
    }
  }
`;

const EXTERNAL_POSTS_QUERY = gql`
  query ExternalPosts($limit: Int) {
    externalPosts(limit: $limit) {
      id
      userId
      title
      body
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      imagePath
      createdAt
    }
  }
`;

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
      imagePath
      createdAt
    }
  }
`;

const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

/* Simple hello/time query component */
function HelloQuery() {
  const { loading, error, data } = useQuery(HELLO_QUERY);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error 😢</p>;

  return (
    <div>
      <h3>GraphQL Responses:</h3>
      <p><strong>Hello:</strong> {data.hello}</p>
      <p><strong>Time:</strong> {data.time}</p>
    </div>
  );
}

/* New user form */
function NewUserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imagePath, setImagePath] = useState("");

  const [createUser, { loading }] = useMutation(CREATE_USER_MUTATION, {
    refetchQueries: [{ query: USERS_QUERY }],
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) return;
    try {
      await createUser({
        variables: {
          input: { name, email, imagePath: imagePath || null },
        },
      });
      setName("");
      setEmail("");
      setImagePath("");
    } catch (err) {
      console.error("Create user error:", err);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <h4>Create User</h4>
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ marginRight: 8 }}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ marginRight: 8 }}
      />
      <input
        placeholder="Image path (optional)"
        value={imagePath}
        onChange={(e) => setImagePath(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}

/* Update user inline form */
function UpdateUserForm({ user, onDone }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [imagePath, setImagePath] = useState(user.imagePath || "");

  const [updateUser, { loading }] = useMutation(UPDATE_USER_MUTATION, {
    refetchQueries: [{ query: USERS_QUERY }],
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser({
        variables: { id: user.id, input: { name, email, imagePath } },
      });
      onDone();
    } catch (err) {
      console.error("Update user error:", err);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 8 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ marginRight: 8 }}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ marginRight: 8 }}
      />
      <input
        value={imagePath}
        onChange={(e) => setImagePath(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update"}
      </button>
      <button type="button" onClick={onDone} style={{ marginLeft: 8 }}>
        Cancel
      </button>
    </form>
  );
}

/* Users list with delete and edit */
function UsersList() {
  const { loading, error, data } = useQuery(USERS_QUERY);
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER_MUTATION, {
    refetchQueries: [{ query: USERS_QUERY }],
  });
  const [editingId, setEditingId] = useState(null);

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error loading users</p>;

  const users = data.users || [];

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Users</h3>
      <NewUserForm />
      {users.length === 0 && <p>No users yet.</p>}
      <ul>
        {users.map((u) => (
          <li key={u.id} style={{ marginBottom: 12 }}>
            <div>
              <strong>{u.name}</strong> — {u.email}{" "}
              {u.imagePath ? <em>({u.imagePath})</em> : null}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Created: {new Date(u.createdAt).toLocaleString()}
            </div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => setEditingId(u.id)} style={{ marginRight: 8 }}>
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete user "${u.name}"?`)) return;
                  try {
                    await deleteUser({ variables: { id: u.id } });
                  } catch (err) {
                    console.error("Delete error:", err);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>

            {editingId === u.id && (
              <UpdateUserForm user={u} onDone={() => setEditingId(null)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* External posts example (public API) */
function ExternalPostsList({ limit = 5 }) {
  const { loading, error, data } = useQuery(EXTERNAL_POSTS_QUERY, {
    variables: { limit },
  });

  if (loading) return <p>Loading external posts...</p>;
  if (error) return <p>Error loading external posts</p>;

  const posts = data.externalPosts || [];

  return (
    <div>
      <h3>External Posts (JSONPlaceholder)</h3>
      <ul>
        {posts.map((p) => (
          <li key={p.id} style={{ marginBottom: 12 }}>
            <strong>{p.title}</strong>
            <p style={{ margin: "4px 0" }}>{p.body}</p>
            <div style={{ fontSize: 12, color: "#666" }}>userId: {p.userId}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Main page */
export default function GraphQLDemo() {
  return (
    <ApolloProvider client={client}>
      <div style={{ padding: 16 }}>
        <h2>GraphQL Demo</h2>
        <HelloQuery />
        <hr />
        <UsersList />
        <hr />
        <ExternalPostsList limit={5} />
      </div>
    </ApolloProvider>
  );
}
