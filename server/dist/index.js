"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const habits_1 = __importDefault(require("./routes/habits"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const pomodoro_1 = __importDefault(require("./routes/pomodoro"));
const areas_1 = __importDefault(require("./routes/areas"));
const utils_1 = __importDefault(require("./routes/utils"));
const health_1 = __importDefault(require("./routes/health"));
const app = (0, express_1.default)();
const PORT = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/habits', habits_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/pomodoro', pomodoro_1.default);
app.use('/api/areas', areas_1.default);
app.use('/api/utils', utils_1.default);
app.use('/api/health', health_1.default);
async function start() {
    await (0, db_1.initDb)();
    app.listen(PORT, () => {
        console.log(`[karma-yoga] server running on http://localhost:${PORT}`);
    });
}
start();
