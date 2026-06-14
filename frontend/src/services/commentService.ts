import apiService from './apiService';

export interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userInitials: string;
  text: string;
  entityId?: string;
  entityType?: string;
  mentionedUserIds?: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentData {
  text: string;
  entityId?: string;
  entityType?: string;
  mentionedUserIds?: string[];
}

export const commentService = {
  /**
   * Fetch comments (global or by entity)
   */
  getComments: async (entityId?: string, entityType?: string, limit = 50): Promise<Comment[]> => {
    let url = `/api/comments?limit=${limit}`;
    if (entityId && entityType) {
      url += `&entityId=${entityId}&entityType=${entityType}`;
    }
    
    const response = await apiService.get(url);
    return response.data;
  },

  /**
   * Create a new comment
   */
  createComment: async (data: CreateCommentData): Promise<Comment> => {
    const response = await apiService.post('/api/comments', data);
    return response.data;
  }
};

export default commentService;
