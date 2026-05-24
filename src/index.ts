import "dotenv/config";
import cors from "cors";
import express from "express";
import habitRecordRoutes from "./routes/habitRecordRoutes";
import habitRoutes from "./routes/habitRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/habits", habitRoutes);
app.use("/habits/:habitId/records", habitRecordRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
