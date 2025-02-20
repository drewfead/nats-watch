# NATS Watch

A web-based NATS monitoring and debugging tool that allows you to view and interact with NATS JetStream messages and subscriptions.

## Running with Docker

To run NATS Watch using Docker, use the following command:

```bash
docker run -p 9666:9666 \
  -e NATS_URL=nats://your-nats-server:4222 \
  -v /path/to/your/nats.creds:/app/nats.creds \
  drewfead/nats-watch
```

### Environment Variables

- `NATS_URL`: The URL of your NATS server (e.g., `nats://localhost:4222`)
- `NATS_CREDS_PATH`: Path to your NATS credentials file inside the container. When using the Docker command above, this should be set to `/app/nats.creds`

### Volume Mount

You need to mount your NATS credentials file into the container. Replace `/path/to/your/nats.creds` with the actual path to your credentials file on your host machine.

## Features

- Real-time message monitoring for both Core NATS and JetStream
- Message inspection and payload viewing
- Stream and Consumer management
- Subject-based filtering
- Message replay and historical viewing

## Development

TODO:

- Add support for selecting from multiple nats servers based on multi-config
- Add support for scanning nats context so that the app can auto-discover nats clusters already configured in the nats cli
