export interface Deal {
  id: string;
  productName: string;
  proposalMenu: ProposalMenu;
  assignee: Assignee;
  referrer?: string;
  meetingDate: Date;
  minutes: string;
  summary: string;
  nextAction: string;
  nextActionDate?: Date;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export type ProposalMenu = 
  | "第一想起取れるくん"
  | "獲得取れるくん"
  | "インハウスキャンプ"
  | "IFキャスティング"
  | "運用コックピット";

export type Assignee = 
  | "増田 陽"
  | "渡邊 哲成"
  | "加藤 修慈";

export type Status = 
  | "アポ設定"
  | "提案作成中"
  | "検討中"
  | "成約"
  | "保留"
  | "見送り"
  | "案件満了";

export interface DealLog {
  id: string;
  dealId: string;
  productName: string;
  proposalMenu: ProposalMenu;
  assignee: Assignee;
  referrer?: string;
  meetingDate: Date;
  minutes: string;
  summary: string;
  nextAction: string;
  nextActionDate?: Date;
  status: Status;
  createdAt: Date;
}

export interface DashboardFilters {
  assignee?: Assignee;
  status?: Status;
  dueSoon?: boolean;
  sortBy?: 'date' | 'status' | 'assignee';
} 