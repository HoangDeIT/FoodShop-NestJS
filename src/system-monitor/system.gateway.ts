// system.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import * as fs from "fs";
import * as path from "path";
import { SystemService } from "./system.service";

@WebSocketGateway({
    cors: {
        origin: "*", // hoặc http://localhost:3001 nếu frontend port khác
    }, namespace: "/monitor"
})
export class SystemGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    private readonly JWT_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET || "my_secret_key";
    private readonly LOG_PATH = path.join(process.cwd(), "logs/app.log");
    private monitorInterval: NodeJS.Timeout;

    constructor(private readonly systemService: SystemService) { }

    /** Khi admin kết nối */
    async handleConnection(client: Socket) {
        const token = client.handshake.auth?.token || client.handshake.query?.token;
        if (!token) {
            client.emit("systemMessage", "⛔ Missing token");
            return client.disconnect();
        }

        try {
            const decoded: any = jwt.verify(token, this.JWT_SECRET);
            if (decoded.role !== "admin") {
                client.emit("systemMessage", "🚫 Permission denied (admin only)");
                return client.disconnect();
            }

            client.data.user = decoded;
            client.emit("systemMessage", "✅ Authorized as admin");
            console.log(`✅ Admin connected: ${decoded.email || decoded._id}`);

            // Start sending stats every 3s
            if (!this.monitorInterval) {
                this.startMonitoring();
            }
        } catch (err) {
            client.emit("systemMessage", "❌ Invalid token");
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`❌ Disconnected: ${client.data?.user?.email || client.id}`);
    }

    /** Gửi thông tin hệ thống định kỳ cho mọi admin */
    private startMonitoring() {
        this.monitorInterval = setInterval(() => {
            const data = this.systemService.getSystemStats();
            this.server.emit("systemInfo", data);

            // Ghi log cơ bản (chỉ để demo)
            this.appendLog(`System info: CPU ${data.cpuLoad}%, RAM ${data.memoryUsage}%`);
        }, 1000);
    }

    /** Xử lý lệnh adminCommand */
    @SubscribeMessage("adminCommand")
    handleCommand(
        @MessageBody() payload: { type: string },
        @ConnectedSocket() client: Socket, // 👈 thêm dòng này
    ) {
        const user = client.data.user;
        if (!user || user.role !== "admin") {
            client.emit("systemMessage", "🚫 Permission denied");
            return;
        }

        switch (payload.type) {
            case "getLogs":
                this.handleGetLogs(client);
                break;
            case "restart":
                this.handleRestart(client);
                break;
            default:
                client.emit("systemMessage", "⚠️ Unknown command");
        }
    }

    /** Gửi log về client */
    private handleGetLogs(client: Socket) {
        if (!fs.existsSync(this.LOG_PATH)) {
            client.emit("systemMessage", "⚠️ No log file found");
            return;
        }
        const log = fs.readFileSync(this.LOG_PATH, "utf8");
        client.emit("systemLog", log);
    }

    /** Restart server */
    private handleRestart(client: Socket) {
        client.emit("systemMessage", "🔄 Restarting server...");
        this.appendLog(`[${new Date().toISOString()}] Server restarting by admin`);
        setTimeout(() => process.exit(0), 1000);
    }

    /** Ghi log đơn giản vào file */
    private appendLog(line: string) {
        const logDir = path.join(process.cwd(), "logs");
        const logFile = path.join(logDir, "app.log");

        // 🛠️ Nếu thư mục logs chưa tồn tại → tự tạo
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${line}\n`);
    }
}
