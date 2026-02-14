# 🎤 语音/视频转文字服务架构

## 📐 方案设计

### 优先级策略（降级机制）

```
用户上传音频/视频
    ↓
1. 优先：阿里云智能语音服务（专业STT）
    - 准确率高（95%+）
    - 成本低（0.0048元/分钟）
    - 支持中英文混合
    - 支持实时/非实时
    ↓ 失败/不可用
2. 降级：讯飞语音识别（备用）
    - 准确率高（95%+）
    - 支持多种方言
    ↓ 失败
3. 兜底：大模型（Qwen-Audio/Whisper）
    - 通用性好
    - 成本较高
    - 支持多语言
    ↓
返回转写结果
```

---

## 🛠️ 技术选型

### 方案A：阿里云智能语音（推荐）

**优势：**
- ✅ 与阿里云生态整合
- ✅ 成本低（0.0048元/分钟）
- ✅ 准确率高（95%+）
- ✅ 支持实时识别
- ✅ 支持长音频（5小时）

**支持格式：**
- 音频：MP3, WAV, PCM, AAC, OGG
- 视频：MP4, AVI, FLV（自动提取音频）

**API：**
- 实时识别：WebSocket
- 录音文件识别：HTTPS REST API

### 方案B：讯飞语音识别（备用）

**优势：**
- ✅ 中文识别最准确
- ✅ 支持方言（粤语、四川话等）
- ✅ 专业的语音技术

### 方案C：大模型（兜底）

**Qwen-Audio / OpenAI Whisper**
- ✅ 多语言支持
- ✅ 长音频处理
- ✅ 噪音鲁棒性好

---

## 📊 数据流设计

### 完整流程

```typescript
interface TranscriptionRequest {
  fileUrl: string;          // 文件URL（OSS）
  fileType: 'audio' | 'video';
  language?: string;        // zh-CN, en-US
  enablePunctuation?: boolean;  // 智能标点
  enableDiarization?: boolean;  // 说话人分离
}

interface TranscriptionResult {
  text: string;            // 完整文本
  segments?: Segment[];    // 分段结果
  confidence: number;      // 置信度
  duration: number;        // 音频时长（秒）
  provider: 'aliyun' | 'xunfei' | 'ai_model';  // 使用的服务
  timestamp: number;
}

interface Segment {
  text: string;
  startTime: number;  // 毫秒
  endTime: number;
  speaker?: string;   // 说话人（如果启用分离）
}
```

---

## 🔧 实现细节

### 1. 视频处理流程

```
上传视频文件
    ↓
FFmpeg提取音频轨道
    ├─ 格式转换（MP4 → WAV）
    ├─ 采样率转换（16000Hz）
    ├─ 通道转换（单声道）
    └─ 码率优化
    ↓
音频文件临时存储
    ↓
调用STT服务
    ↓
删除临时音频
    ↓
返回转写结果
```

### 2. 服务降级逻辑

```typescript
async transcribe(file: string): Promise<TranscriptionResult> {
  try {
    // 优先：阿里云智能语音
    return await this.aliyunSTT.transcribe(file);
  } catch (error) {
    this.logger.warn('阿里云STT失败，降级到讯飞', error);
    
    try {
      // 备用：讯飞语音
      return await this.xunfeiSTT.transcribe(file);
    } catch (error2) {
      this.logger.warn('讯飞STT失败，降级到AI模型', error2);
      
      // 兜底：大模型
      return await this.aiModelSTT.transcribe(file);
    }
  }
}
```

### 3. 缓存策略

```typescript
// 转写结果缓存（避免重复转写）
const cacheKey = `stt:${md5(fileUrl)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await this.transcribe(fileUrl);

// 缓存1天
await redis.setex(cacheKey, 86400, JSON.stringify(result));
```

---

## 📦 依赖包

```json
{
  "dependencies": {
    "@alicloud/speech": "^1.2.0",      // 阿里云语音
    "fluent-ffmpeg": "^2.1.2",         // 视频处理
    "axios": "^1.6.0",                  // HTTP请求
    "md5": "^2.3.0"                     // 文件指纹
  }
}
```

---

## 🎯 API接口设计

### POST /api/transcription

**请求：**
```json
{
  "fileUrl": "https://oss.example.com/video.mp4",
  "fileType": "video",
  "language": "zh-CN",
  "enablePunctuation": true,
  "enableDiarization": false
}
```

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "text": "今天天气真好，适合出去玩。",
    "segments": [
      {
        "text": "今天天气真好，",
        "startTime": 0,
        "endTime": 2000
      },
      {
        "text": "适合出去玩。",
        "startTime": 2000,
        "endTime": 4000
      }
    ],
    "confidence": 0.95,
    "duration": 4.5,
    "provider": "aliyun",
    "timestamp": 1707900000000
  }
}
```

---

## 💰 成本估算

### 阿里云智能语音
- 录音文件识别：0.0048元/分钟
- 实时识别：0.003元/分钟
- 每月前300分钟免费

**示例：**
- 10分钟视频 = 0.048元
- 1000个10分钟视频 = 48元/月

### 讯飞语音识别
- 每天500次免费
- 超出：0.0033元/次

### 大模型（兜底）
- Qwen-Audio：按Token计费
- 仅在前两者失败时使用

---

## 🔄 集成到现有功能

### 1. 素材上传时自动转写

```typescript
// materials.controller.ts

@Post('upload')
async uploadMaterial(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadMaterialDto,
) {
  // 1. 上传到OSS
  const ossResult = await this.ossService.uploadFile(file);
  
  // 2. 检测文件类型
  const fileType = this.detectFileType(file.mimetype);
  
  // 3. 如果是音频/视频，自动转写
  let transcription = null;
  if (fileType === 'audio' || fileType === 'video') {
    transcription = await this.transcriptionService.transcribe({
      fileUrl: ossResult.url,
      fileType,
      language: 'zh-CN',
    });
  }
  
  // 4. 创建素材记录
  return this.materialsService.create({
    name: dto.name,
    fileUrl: ossResult.url,
    fileType,
    transcription: transcription?.text,  // 保存转写文本
  });
}
```

### 2. 选题生成时使用转写文本

```typescript
// 用户上传视频素材
// → 自动转写成文字
// → AI分析转写文本
// → 生成选题建议

const video = await this.materialsService.findOne(videoId);
const transcription = video.transcription;

// 使用转写文本而非视频文件
const topics = await this.aiService.generateTopics(transcription);
```

### 3. 视频字幕生成

```typescript
@Post('generate-subtitles')
async generateSubtitles(@Body() dto: { videoId: number }) {
  const video = await this.materialsService.findOne(dto.videoId);
  
  // 转写视频
  const result = await this.transcriptionService.transcribe({
    fileUrl: video.fileUrl,
    fileType: 'video',
    enablePunctuation: true,
  });
  
  // 生成SRT字幕文件
  const srtContent = this.generateSRT(result.segments);
  
  return {
    srtUrl: await this.ossService.uploadText(srtContent, 'subtitles'),
    segments: result.segments,
  };
}
```

---

## 📝 使用场景

### 场景1：视频素材管理
- 上传视频 → 自动提取音频 → 转写文字
- 保存文字内容，便于搜索
- 示例："咖啡拉花教程" 视频转写后可以搜索"拉花技巧"

### 场景2：AI选题生成
- 用户上传一段采访录音
- 自动转写成文字
- AI分析文字内容生成选题

### 场景3：字幕生成
- 上传视频
- 自动生成带时间轴的字幕
- 支持SRT、VTT格式

### 场景4：语音笔记
- 录音上传
- 转写成文字
- 保存为选题或素材备注

---

## 🎨 前端集成示例

```typescript
// 上传视频时显示转写进度
const uploadVideo = async (file: File) => {
  // 1. 上传文件
  const formData = new FormData();
  formData.append('file', file);
  
  setStatus('uploading');
  const uploadResult = await api.post('/materials/upload', formData);
  
  // 2. 如果是视频，等待转写
  if (uploadResult.fileType === 'video') {
    setStatus('transcribing');
    
    // 轮询转写状态
    const transcription = await pollTranscription(uploadResult.id);
    
    setStatus('completed');
    return {
      ...uploadResult,
      transcription,
    };
  }
};
```

---

## 🔒 安全考虑

1. **文件大小限制**
   - 视频：最大500MB
   - 音频：最大100MB

2. **时长限制**
   - 单个文件：最长5小时
   - 防止恶意上传

3. **并发控制**
   - 同一用户最多3个并发转写任务
   - 队列机制

4. **敏感内容过滤**
   - 转写结果敏感词检测
   - 违规内容标记

---

## 📊 监控指标

- 转写成功率
- 平均响应时间
- 服务降级次数
- 成本统计
- 错误类型分布

---

这个设计确保了：
✅ 高可用（多服务降级）
✅ 低成本（优先专业STT）
✅ 高准确率（专业服务）
✅ 易集成（统一接口）
✅ 用户友好（自动转写）
