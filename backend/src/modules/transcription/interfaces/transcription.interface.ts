export interface TranscriptionRequest {
  fileUrl: string;
  fileType: 'audio' | 'video';
  language?: string;
  enablePunctuation?: boolean;
  enableDiarization?: boolean;
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  confidence: number;
  duration: number;
  provider: 'aliyun' | 'xunfei' | 'ai_model';
  timestamp: number;
}

export interface ITranscriptionProvider {
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  isAvailable(): Promise<boolean>;
}
