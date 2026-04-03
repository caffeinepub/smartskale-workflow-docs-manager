import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> { __kind__: "Some"; value: T; }
export interface None { __kind__: "None"; }
export type Option<T> = Some<T> | None;

export type ProjectStatus = { PLANNING: null } | { ACTIVE: null } | { ON_HOLD: null } | { COMPLETED: null } | { CANCELLED: null };
export type Priority = { LOW: null } | { MEDIUM: null } | { HIGH: null } | { URGENT: null };
export type TaskStatus = { TODO: null } | { IN_PROGRESS: null } | { IN_REVIEW: null } | { DONE: null };
export type NotifType = { TASK_ASSIGNED: null } | { TASK_UPDATED: null } | { DOC_UPDATED: null } | { PROJECT_UPDATED: null };
export type EntityType = { TASK: null } | { DOCUMENT: null };

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  ownerId: Principal;
  memberIds: Principal[];
  createdAt: bigint;
  updatedAt: bigint;
  dueDate: [] | [bigint];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: [] | [Principal];
  reporterId: Principal;
  createdAt: bigint;
  updatedAt: bigint;
  dueDate: [] | [bigint];
  tags: string[];
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  authorId: Principal;
  createdAt: bigint;
  updatedAt: bigint;
  version: bigint;
  fileUrl: [] | [string];
}

export interface Notification {
  id: string;
  userId: Principal;
  message: string;
  notifType: NotifType;
  relatedId: string;
  isRead: boolean;
  createdAt: bigint;
}

export interface Comment {
  id: string;
  entityId: string;
  entityType: EntityType;
  authorId: Principal;
  content: string;
  createdAt: bigint;
}

export interface Activity {
  id: string;
  actorId: Principal;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: bigint;
}

export interface DashboardStats {
  totalProjects: bigint;
  totalTasks: bigint;
  todoCount: bigint;
  inProgressCount: bigint;
  inReviewCount: bigint;
  doneCount: bigint;
  recentActivities: Activity[];
}

export interface backendInterface {
  createProject(name: string, description: string, status: ProjectStatus, priority: Priority, dueDate: [] | [bigint]): Promise<Project>;
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<[] | [Project]>;
  updateProject(id: string, name: string, description: string, status: ProjectStatus, priority: Priority, dueDate: [] | [bigint], memberIds: Principal[]): Promise<[] | [Project]>;
  deleteProject(id: string): Promise<boolean>;

  createTask(projectId: string, title: string, description: string, status: TaskStatus, priority: Priority, assigneeId: [] | [Principal], dueDate: [] | [bigint], tags: string[]): Promise<Task>;
  getTasks(): Promise<Task[]>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTask(id: string): Promise<[] | [Task]>;
  updateTask(id: string, title: string, description: string, status: TaskStatus, priority: Priority, assigneeId: [] | [Principal], dueDate: [] | [bigint], tags: string[]): Promise<[] | [Task]>;
  deleteTask(id: string): Promise<boolean>;

  createDocument(projectId: string, title: string, content: string, fileUrl: [] | [string]): Promise<Document>;
  getDocuments(): Promise<Document[]>;
  getDocumentsByProject(projectId: string): Promise<Document[]>;
  getDocument(id: string): Promise<[] | [Document]>;
  updateDocument(id: string, title: string, content: string, fileUrl: [] | [string]): Promise<[] | [Document]>;
  deleteDocument(id: string): Promise<boolean>;

  getMyNotifications(): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<boolean>;
  markAllNotificationsRead(): Promise<bigint>;

  addComment(entityId: string, entityType: EntityType, content: string): Promise<Comment>;
  getComments(entityId: string): Promise<Comment[]>;
  deleteComment(id: string): Promise<boolean>;

  getRecentActivity(limit: bigint): Promise<Activity[]>;
  getDashboardStats(): Promise<DashboardStats>;
}
