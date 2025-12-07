import { Injectable } from "@nestjs/common";
import * as os from "os";

@Injectable()
export class SystemService {
    private lastMeasure?: { idle: number; total: number };

    private calculateCpuLoad() {
        const cpus = os.cpus();

        let idleMs = 0;
        let totalMs = 0;

        cpus.forEach((core) => {
            for (const type in core.times) {
                totalMs += core.times[type as keyof typeof core.times];
            }
            idleMs += core.times.idle;
        });

        if (!this.lastMeasure) {
            this.lastMeasure = { idle: idleMs, total: totalMs };
            return 0; // lần đầu chưa có dữ liệu trước đó
        }

        const idleDiff = idleMs - this.lastMeasure.idle;
        const totalDiff = totalMs - this.lastMeasure.total;
        this.lastMeasure = { idle: idleMs, total: totalMs };

        const cpuPercent = (1 - idleDiff / totalDiff) * 100;
        return Number(cpuPercent.toFixed(2));
    }

    getSystemStats() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const used = totalMem - freeMem;

        return {
            cpuLoad: this.calculateCpuLoad(),
            memoryUsage: Number(((used / totalMem) * 100).toFixed(1)),
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }
}
