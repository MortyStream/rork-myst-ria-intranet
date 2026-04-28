export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  memberIds: string[];
}
