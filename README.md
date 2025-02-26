# NATS Watch

A web-based NATS monitoring and debugging tool that allows you to view and interact with NATS JetStream messages and subscriptions.

## Running with Docker

There are a few options for running NATS Watch using Docker.

### Option 1: Run with a single NATS cluster

```bash
docker run -p 9666:9666 \
  -e NATS_URL=nats://your-nats-server:4222 \
  -e NATS_CREDS_PATH=/etc/nats/nats.creds \
  -v ~/.config/nats/context/nats.creds:/etc/nats/nats.creds \
  drewfead/nats-watch
```

### Option 2: Run with multiple NATS clusters

```bash
docker run -p 9666:9666 \
  -v ~/.config/nats:/etc/nats \
  drewfead/nats-watch
```

> [!NOTE]
> This option expects that you have all of your NATS configuration and credentials files referenced by them in your `~/.config/nats` directory.

### Environment Variables

- `NATS_URL`: The URL of your NATS server (e.g., `nats://localhost:4222`)
- `NATS_CREDS_PATH`: Path to your NATS credentials file inside the container. When using the Docker command above, this should be set to `/app/nats.creds`
- `NEXT_PUBLIC_MULTICLUSTER_ENABLED`: Set to `true` to enable support for multiple NATS clusters
- `NATS_CLUSTER_AUTO_IMPORT`: Set to `true` to automatically import NATS configurations on startup
- `NATS_CLUSTER_AUTO_IMPORT_PATH`: Path to scan for NATS configurations (e.g., `~/.config/nats` or `/etc/nats`)

## Features

- Real-time message monitoring for both Core NATS and JetStream
- Message inspection and payload viewing
- Stream and Consumer management
- Subject-based filtering
- Message replay and historical viewing
- Multi-cluster support for connecting to multiple NATS servers
- Auto-discovery of NATS configurations from the NATS CLI
- Auto-import of NATS configurations on startup

## Development

TODO:

- Add support for authentication methods beyond credentials files
- Add K/V support
