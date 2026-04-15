export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  text: string;
  color: string;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  type: 'move' | 'create';
  fromColumn?: string;
  toColumn?: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: number;
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  color?: string;
  dueDate?: string;
  comments: Comment[];
  checklists: ChecklistItem[];
  tags: Tag[];
  logs: ActivityLog[];
  attachments: Attachment[];
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  projectId: string;
  columns: Column[];
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
}

export interface AppState {
  version: number;
  projects: Project[];
  boards: Board[];
}
