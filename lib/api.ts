const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface User {
  _id: string;
  email: string;
  role: 'user' | 'teacher' | 'admin';
  name: string;
  walletBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  about?: string;
  highlights?: string[];
  thumbnailUrl: string;
  isActive: boolean;
  lectureCount: number;
  price?: number;
  isPaid?: boolean;
  notes?: string;
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lecture {
  _id: string;
  courseId: string;
  title: string;
  videoUrl?: string;
  orderIndex: number;
  isLocked: boolean;
  duration: number;
  thumbnailUrl: string;
  notes?: string;
  notesFileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string | User;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  utrNumber: string;
  upiId: string;
  description: string;
  adminNotes?: string;
  processedBy?: string | User;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalCourses: number;
  activeCourses: number;
  totalLectures: number;
  totalUsers: number;
  totalTeachers: number;
  pendingWalletRequests?: number;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}


    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
    }
    return data;
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    return this.request<Course[]>('/api/admin/courses');
  }

  async getCourse(id: string): Promise<Course> {
    return this.request<Course>(`/api/admin/courses/${id}`);
  }

  async createCourse(course: Partial<Course>): Promise<Course> {
    return this.request<Course>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    });
  }

  async updateCourse(id: string, course: Partial<Course>): Promise<Course> {
    return this.request<Course>(`/api/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    });
  }

  async deleteCourse(id: string): Promise<void> {
    return this.request<void>(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // Lectures
  async getLectures(courseId: string): Promise<Lecture[]> {
    return this.request<Lecture[]>(`/api/admin/courses/${courseId}/lectures`);
  }

  async getLecture(id: string): Promise<Lecture> {
    return this.request<Lecture>(`/api/admin/lectures/${id}`);
  }

  async createLecture(courseId: string, lecture: Partial<Lecture>): Promise<Lecture> {
    return this.request<Lecture>(`/api/admin/courses/${courseId}/lectures`, {
      method: 'POST',
      body: JSON.stringify(lecture),
    });
  }

  async updateLecture(id: string, lecture: Partial<Lecture>): Promise<Lecture> {
    return this.request<Lecture>(`/api/admin/lectures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lecture),
    });
  }

  async deleteLecture(id: string): Promise<void> {
    return this.request<void>(`/api/admin/lectures/${id}`, {
      method: 'DELETE',
    });
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/admin/users');
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/api/admin/users/${id}`);
  }

  async createUser(user: Partial<User & { password: string }>): Promise<User> {
    return this.request<User>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: Partial<User & { password?: string }>): Promise<User> {
    return this.request<User>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Wallet
  async getPendingWalletRequests(): Promise<WalletTransaction[]> {
    return this.request<WalletTransaction[]>('/api/wallet/admin/pending');
  }

  async getAllWalletTransactions(status?: string, userId?: string): Promise<WalletTransaction[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (userId) params.append('userId', userId);
    return this.request<WalletTransaction[]>(`/api/wallet/admin/transactions?${params.toString()}`);
  }

  async approveWalletRequest(id: string, adminNotes?: string): Promise<WalletTransaction> {
    return this.request<WalletTransaction>(`/api/wallet/admin/approve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    });
  }

  async rejectWalletRequest(id: string, adminNotes?: string): Promise<WalletTransaction> {
    return this.request<WalletTransaction>(`/api/wallet/admin/reject/${id}`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    });
  }

  // Stats
  async getStats(): Promise<Stats> {
    return this.request<Stats>('/api/admin/stats');
  }

  // Video Upload
  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<{ videoUrl: string }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('video', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', `${API_URL}/api/admin/upload/video`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async deleteVideo(videoUrl: string): Promise<void> {
    return this.request<void>('/api/admin/upload/video', {
      method: 'DELETE',
      body: JSON.stringify({ videoUrl }),
    });
  }
}

export const api = new ApiClient();
