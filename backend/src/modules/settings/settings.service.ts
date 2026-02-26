import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SettingField {
  key: string;
  value: string;
  sensitive: boolean;
}

export interface SettingsGroup {
  group: string;
  label: string;
  fields: SettingField[];
}

@Injectable()
export class SettingsService {
  private readonly envPath = path.join(process.cwd(), '.env');

  private readonly sensitiveKeys = new Set([
    'DB_PASSWORD',
    'JWT_SECRET',
    'OSS_ACCESS_KEY_ID',
    'OSS_ACCESS_KEY_SECRET',
    'DASHSCOPE_API_KEY',
    'DEEPSEEK_API_KEY',
    'KIMI_API_KEY',
  ]);

  private readonly groupDef: { group: string; label: string; keys: string[] }[] = [
    {
      group: 'app',
      label: '应用配置',
      keys: ['NODE_ENV', 'PORT', 'API_PREFIX'],
    },
    {
      group: 'db',
      label: '数据库配置',
      keys: ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'],
    },
    {
      group: 'jwt',
      label: 'JWT 配置',
      keys: ['JWT_SECRET', 'JWT_EXPIRES_IN'],
    },
    {
      group: 'oss',
      label: '阿里云 OSS',
      keys: ['OSS_REGION', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET', 'OSS_BUCKET', 'OSS_ENDPOINT'],
    },
    {
      group: 'cors',
      label: 'CORS 跨域配置',
      keys: ['CORS_ORIGIN'],
    },
    {
      group: 'upload',
      label: '文件上传配置',
      keys: ['MAX_FILE_SIZE'],
    },
    {
      group: 'log',
      label: '日志配置',
      keys: ['LOG_LEVEL'],
    },
    {
      group: 'ai',
      label: 'AI 密钥与模型配置',
      keys: [
        'DASHSCOPE_API_KEY',
        'DEEPSEEK_API_KEY',
        'KIMI_API_KEY',
        'AI_TEXT_MODEL',
        'AI_TEXT_ENDPOINT',
        'AI_VISION_MODEL',
        'AI_VISION_ENDPOINT',
        'AI_TRANSCRIPTION_MODEL',
      ],
    },
  ];

  /** 读取 .env 文件，返回 key->value 映射 */
  private readEnvFile(): Record<string, string> {
    if (!fs.existsSync(this.envPath)) return {};
    const content = fs.readFileSync(this.envPath, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      result[key] = value;
    }
    return result;
  }

  /** 获取所有配置，按分组返回 */
  getSettings(): SettingsGroup[] {
    const env = this.readEnvFile();
    for (const key of Object.keys(process.env)) {
      if (!(key in env)) env[key] = process.env[key] || '';
    }
    return this.groupDef.map((g) => ({
      group: g.group,
      label: g.label,
      fields: g.keys.map((key) => ({
        key,
        value: env[key] ?? '',
        sensitive: this.sensitiveKeys.has(key),
      })),
    }));
  }

  /** 更新指定 key 的值，写回 .env 文件并更新 process.env */
  updateSettings(updates: Record<string, string>): void {
    if (!fs.existsSync(this.envPath)) {
      fs.writeFileSync(this.envPath, '', 'utf-8');
    }
    let content = fs.readFileSync(this.envPath, 'utf-8');
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^(${key}\\s*=).*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content = content.trimEnd() + `\n${key}=${value}\n`;
      }
      process.env[key] = value;
    }
    fs.writeFileSync(this.envPath, content, 'utf-8');
  }
}
