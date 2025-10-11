import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db"; 
import { env } from "./config/env";

const PORT = Number(env.PORT || 4000);

connectDB(env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`API lista en :${PORT}`)))
  .catch((err) => {
    console.error("Error al iniciar:", err);
    process.exit(1);
  });
