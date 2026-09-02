# Local drawDB MCP with PostgreSQL canvas

## Goal

Use the workspace's `drawdb-mcp` server from Codex to create and edit a local PostgreSQL ER diagram, with the drawDB editor available in a local browser. The setup must not require drawDB Pro or a drawDB cloud API key.

## Configuration

- The diagram source of truth will be `docs/database.ddb`.
- Codex will start the local server with Node using the built server entry point:
  `/Users/chainarong.j/Projects/MatterSolv/Projects/drawdb-mcp/dist/index.js`.
- The MCP arguments will include `--file /Users/chainarong.j/Projects/MatterSolv/Projects/docs/database.ddb --serve`.
- The `--serve` option starts the bundled canvas at `http://127.0.0.1:4321/editor` for the duration of the Codex session.
- The MCP configuration belongs in the user's Codex configuration, not the repository, because it contains a machine-specific absolute path. No secrets are needed.

## Setup and data flow

1. Install the existing `drawdb-mcp` Node dependencies and build its server and browser canvas.
2. Register it with Codex as a local stdio MCP server.
3. When Codex invokes a drawDB tool, the MCP server starts and serves the browser canvas.
4. MCP tool calls and browser edits both update `docs/database.ddb`; that file is the checked-in, shareable source of truth.
5. The first schema operation sets the diagram dialect to `postgresql` before tables, fields, or relationships are added.

## Error handling

- Setup verifies Node meets the package's required version (`>=20.19`), and reports a clear error if it does not.
- If port 4321 is in use, the MCP server continues to provide file tools but the canvas is unavailable until the conflict is resolved.
- If the diagram file does not yet exist, the server creates it on the first write.
- No API key, network account, or drawDB Pro entitlement is required.

## Verification

- Run the package's type check and test suite after installation/build.
- Restart Codex and confirm the `drawdb` MCP server is available.
- Request `new_diagram`, `set_database` with `postgresql`, then `get_diagram`; verify the returned dialect is PostgreSQL.
- Open `http://127.0.0.1:4321/editor` and confirm the diagram loads and browser edits are saved to `docs/database.ddb`.
