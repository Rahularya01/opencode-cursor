# @rahularya01/opencode-cursor

Unofficial Cursor provider package for OpenCode. It requires an authorized Cursor account and
never writes credentials to the project. Configure `CURSOR_ACCESS_TOKEN` outside source control.

```json
{
  "plugin": ["@rahularya01/opencode-cursor/plugin/v2"],
  "provider": {
    "cursor": {
      "api": { "type": "aisdk", "package": "@rahularya01/opencode-cursor" },
      "models": { "composer-2": { "name": "Composer 2" } }
    }
  }
}
```

The package has the OpenCode registration and credential boundary in place. Its native Cursor
Connect/protobuf protocol port must be completed before this initial package is published.
