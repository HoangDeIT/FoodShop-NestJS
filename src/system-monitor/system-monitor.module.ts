// system-monitor.module.ts
import { Module } from "@nestjs/common";
import { SystemGateway } from "./system.gateway";
import { SystemService } from "./system.service";

@Module({
    providers: [SystemGateway, SystemService],
})
export class SystemMonitorModule { }
