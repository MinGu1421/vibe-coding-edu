export type RequestStatus = '대기' | '승인' | '완료' | '반려';

export interface CodeRequest {
  id: string;
  student_name: string;
  prompt: string;
  status: RequestStatus;
  ai_response_code: string;
  teacher_comment: string;
  created_at: string;
}

export interface PromptHistoryItem {
  version: number;
  prompt: string;
  code: string;
  timestamp: string;
}
