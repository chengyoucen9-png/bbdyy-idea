import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getSettings();
  }

  @Put()
  update(@Body() body: { updates: Record<string, string> }) {
    this.settingsService.updateSettings(body.updates);
    return { ok: true };
  }
}
