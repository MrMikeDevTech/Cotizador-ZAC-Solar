// TODO(Fase 4): servidor API REST (Express/Fastify) + PostgreSQL.
const server = Bun.serve({
  port: 3001,
  fetch: () =>
    new Response("Cotizador Solar — backend en construcción (Fase 4)", {
      headers: { "content-type": "text/plain" },
    }),
});

console.log(`Backend escuchando en http://localhost:${server.port}`);