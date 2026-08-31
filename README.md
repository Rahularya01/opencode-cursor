# @rahularya01/opencode-cursor

Unofficial Cursor provider package for OpenCode. Run `/connect`, choose Cursor, and complete the
browser login. OpenCode stores and refreshes the resulting OAuth credential outside the project.

```json
{
  "plugin": ["@rahularya01/opencode-cursor/plugin/auth", "@rahularya01/opencode-cursor/plugin/v2"],
  "provider": {
    "cursor": {
      "name": "Cursor",
      "npm": "@rahularya01/opencode-cursor",
      "models": { "composer-2": { "name": "Composer 2" } }
    }
  }
}
```

The package has the OpenCode registration and credential boundary in place. Its native Cursor
Connect/protobuf protocol port must be completed before this initial package is published.
