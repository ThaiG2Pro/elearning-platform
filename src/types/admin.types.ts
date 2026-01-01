export interface ApprovalQueueItem {
    id: number;
    title: string;
    lecturerName: string;
    submittedAt: string;
}

export interface ModerateRequest {
    action: 'APPROVE' | 'REJECT';
    rejectNote?: string;
}
