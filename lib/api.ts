const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://eduhive-server.onrender.com";

// --------------------------
// Interfaces
// --------------------------

export interface User {
  _id: string;
  email: string;
  role: "user" | "teacher" | "admin";
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
  type: "credit" | "debit";
  status: "pending" | "approved" | "rejected" | "completed";
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

// -----------------------------
// API Client
// -----------------------------

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  }

  // ------------------------------------
  // AUTH
  // ------------------------------------
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: User }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));
    }

    return data;
  }

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
  }

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem("admin_user");
    return value ? JSON.parse(value) : null;
  }

  // ------------------------------------
  // COURSES
  // ------------------------------------
  getCourses() {
    return this.request<Course[]>("/api/admin/courses");
  }

  getCourse(id: string) {
    return this.request<Course>(`/api/admin/courses/${id}`);
  }

  createCourse(course: Partial<Course>) {
    return this.request<Course>("/api/admin/courses", {
      method: "POST",
      body: JSON.stringify(course),
    });
  }

  updateCourse(id: string, course: Partial<Course>) {
    return this.request<Course>(`/api/admin/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(course),
    });
  }

  deleteCourse(id: string) {
    return this.request(`/api/admin/courses/${id}`, {
      method: "DELETE",
    });
  }

  // ------------------------------------
  // LECTURES
  // ------------------------------------
  getLectures(courseId: string) {
    return this.request<Lecture[]>(
      `/api/admin/courses/${courseId}/lectures`
    );
  }

  getLecture(id: string) {
    return this.request<Lecture>(`/api/admin/lectures/${id}`);
  }

  createLecture(courseId: string, lecture: Partial<Lecture>) {
    return this.request<Lecture>(
      `/api/admin/courses/${courseId}/lectures`,
      {
        method: "POST",
        body: JSON.stringify(lecture),
      }
    );
  }

  updateLecture(id: string, lecture: Partial<Lecture>) {
    return this.request<Lecture>(`/api/admin/lectures/${id}`, {
      method: "PUT",
      body: JSON.stringify(lecture),
    });
  }

  deleteLecture(id: string) {
    return this.request(`/api/admin/lectures/${id}`, {
      method: "DELETE",
    });
  }

  // ------------------------------------
  // USERS
  // ------------------------------------
  getUsers() {
    return this.request<User[]>("/api/admin/users");
  }

  getUser(id: string) {
    return this.request<User>(`/api/admin/users/${id}`);
  }

  createUser(user: Partial<User & { password: string }>) {
    return this.request<User>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  }

  updateUser(id: string, user: Partial<User & { password?: string }>) {
    return this.request<User>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  }

  deleteUser(id: string) {
    return this.request(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
  }

  // ------------------------------------
  // WALLET
  // ------------------------------------
    // Wallet
  async getPendingWalletRequests(): Promise<WalletTransaction[]> {
    return this.request<WalletTransaction[]>('/api/wallet/admin/pending');
  }

  // 👉 NEW VERSION: always returns ALL wallet transactions for admin
  async getAllWalletTransactions(): Promise<WalletTransaction[]> {
    return this.request<WalletTransaction[]>('/api/wallet/admin/transactions');
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


  // ------------------------------------
  // STATS
  // ------------------------------------
  getStats() {
    return this.request<Stats>("/api/admin/stats");
  }

  // ------------------------------------
  // VIDEO UPLOAD
  // ------------------------------------
  uploadVideo(file: File, onProgress?: (p: number) => void) {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("video", file);

    return new Promise<{ videoUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));

      xhr.open("POST", `${API_URL}/api/admin/upload/video`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  }
}

export const api = new ApiClient();
