// hanzo-app project metadata collection.
//
// One shared base collection, one row per (user_id, space_id). hanzo.app's
// server is the trust boundary: it authenticates the end user via hanzo.id
// (IAM/OIDC), then talks to this Base with the user's IAM bearer token and
// ALWAYS scopes every query by user_id = the IAM `sub`. Base validates the
// token against hanzo.id JWKS (the platform plugin sets externalAuthOnly +
// jwksURL); the rules below only assert "a valid IAM user" — per-user
// isolation is enforced by hanzo.app's filter, never by these rules. A
// NetworkPolicy restricts ingress to hanzo-app pods so no other in-cluster
// caller can reach the collection.
//
// Fields:
//   user_id   text   IAM `sub` (raw, canonical owner key)
//   space_id  text   "namespace/repoId"
//   prompts   json   string[]
//   created   autodate (on create)
//   updated   autodate (on create + update)
//
// Indexes:
//   UNIQUE (user_id, space_id)   — one project per space per user
//   (user_id, created)           — list-by-user newest-first
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "projects",
    // "a valid IAM user"; hanzo.app scopes by user_id, NetworkPolicy pins the caller.
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "user_id",
        type: "text",
        required: true,
        min: 1,
        max: 255,
      },
      {
        name: "space_id",
        type: "text",
        required: true,
        min: 1,
        max: 255,
      },
      {
        name: "prompts",
        type: "json",
        maxSize: 1048576, // 1 MiB
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_projects_user_space` ON `projects` (`user_id`, `space_id`)",
      "CREATE INDEX `idx_projects_user_created` ON `projects` (`user_id`, `created`)",
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("projects");

  return app.delete(collection);
});
