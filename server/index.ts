import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import habitsRouter from './routes/habits';
import dashboardRouter from './routes/dashboard';
import pomodoroRouter from './routes/pomodoro';
import areasRouter from './routes/areas';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/habits', habitsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/pomodoro', pomodoroRouter);
app.use('/api/areas', areasRouter);

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[karma-yoga] server running on http://localhost:${PORT}`);
  });
}

start();
