# @rahularya01/opencode-cursor

Unofficial Cursor provider for OpenCode. Run `/connect`, choose Cursor, and complete browser
login. OpenCode stores and refreshes the OAuth credential. This package does not harvest
Cursor IDE or Keychain tokens.

> Unofficial integration. Not affiliated with or endorsed by Cursor / Anysphere.

```json
{
  "plugin": ["@rahularya01/opencode-cursor/plugin/auth", "@rahularya01/opencode-cursor/plugin/v2"],
  "provider": {
    "cursor": {
      "name": "Cursor",
      "npm": "@rahularya01/opencode-cursor"
    }
  }
}
```

Streaming uses Cursor's native Connect/protobuf protocol over HTTP/2. OpenCode owns
conversation history and tool execution; this package maps those onto Cursor's wire format.
