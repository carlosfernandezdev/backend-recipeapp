// src/config/db.ts
import mongoose from "mongoose";

/**
 * Conecta a MongoDB (Atlas o local) y sincroniza índices.
 * - Usa la URI del .env (mongodb+srv://... para Atlas).
 * - Sincroniza índices definidos en los modelos (unicidad y orden alfabético).
 * - Registra eventos básicos y maneja apagado limpio.
 */
export async function connectDB(uri: string) {
  if (!uri) throw new Error("MONGO_URI no está definido");

  // Recomendado para queries estrictas (evita filtros no definidos)
  mongoose.set("strictQuery", true);

  // En prod puedes desactivar autoIndex para evitar crear índices en caliente.
  // Luego ejecutas un script separado (db:sync) o lo haces durante el arranque controlado.
  const isProd = process.env.NODE_ENV === "production";

  await mongoose.connect(uri, {
    autoIndex: !isProd,                // en prod: false (mejor práctica)
    serverSelectionTimeoutMS: 15000,   // tolerante a DNS/latencia en Atlas
    // family: 4,                       // fuerza IPv4 si tienes issues de IPv6/DNS
  });

  wireConnectionLogging();

  // Importante: garantizar índices únicos (owner+titleSlug, owner+name, etc.)
  await syncAllIndexes();

  if (mongoose.connection.db) {
    const info = await mongoose.connection.db.admin().serverStatus();
    console.log(`[DB] Conectado a MongoDB. Versión: ${info.version}`);
  } else {
    console.warn("[DB] Advertencia: mongoose.connection.db es undefined, no se puede obtener la versión.");
  }
}

/** Desconecta de Mongo para apagado limpio */
export async function disconnectDB() {
  await mongoose.disconnect();
  console.log("[DB] Desconectado de MongoDB");
}

/** Sincroniza índices de TODOS los modelos registrados */
export async function syncAllIndexes() {
  await Promise.all(
    Object.values(mongoose.models).map((m) => m.syncIndexes())
  );
  console.log("[DB] Índices sincronizados");
}

/** Logs y manejo de eventos de conexión */
function wireConnectionLogging() {
  const conn = mongoose.connection;

  if (conn.listeners("connected").length === 0) {
    conn.on("connected", () => console.log(`[DB] Estado: connected (${conn.name})`));
    conn.on("reconnected", () => console.log("[DB] Estado: reconnected"));
    conn.on("disconnected", () => console.log("[DB] Estado: disconnected"));
    conn.on("error", (err) => console.error("[DB] Error:", err));
  }

  // Apagado limpio en SIGINT/SIGTERM (PM2/Docker/K8s)
  const graceful = async (signal: string) => {
    console.log(`[DB] Recibida señal ${signal}. Cerrando conexión...`);
    try {
      await mongoose.connection.close();
      console.log("[DB] Conexión cerrada. Saliendo.");
      process.exit(0);
    } catch (e) {
      console.error("[DB] Error al cerrar conexión:", e);
      process.exit(1);
    }
  };

  // Evita registrar múltiples handlers si la función se llama más de una vez
  if (process.listeners("SIGINT").findIndex(l => (l as any).__dbHandler) === -1) {
    const h1 = graceful.bind(null, "SIGINT"); (h1 as any).__dbHandler = true;
    const h2 = graceful.bind(null, "SIGTERM"); (h2 as any).__dbHandler = true;
    process.on("SIGINT", h1);
    process.on("SIGTERM", h2);
  }
}
