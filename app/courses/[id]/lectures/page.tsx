'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { api, Lecture, Course } from '@/lib/api';
import Link from 'next/link';

export default function LecturesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    videoUrl: '',
    orderIndex: 1,
    isLocked: false,
    duration: 0,
    thumbnailUrl: '',
    notes: '',
    notesFileUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      const [lecturesData, courseData] = await Promise.all([
        api.getLectures(courseId),
        api.getCourse(courseId),
      ]);
      setLectures(lecturesData);
      setCourse(courseData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please select a video file (MP4, MOV, AVI, etc.)');
        return;
      }
      // Validate file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        alert('File size exceeds 500MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleVideoUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await api.uploadVideo(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      // Set the uploaded video URL
      setFormData({ ...formData, videoUrl: result.videoUrl });
      setSelectedFile(null);
      alert('Video uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLecture) {
        await api.updateLecture(editingLecture._id, formData);
      } else {
        await api.createLecture(courseId, formData);
      }
      setShowForm(false);
      setEditingLecture(null);
      setSelectedFile(null);
      setFormData({
        title: '',
        videoUrl: '',
        orderIndex: lectures.length + 1,
        isLocked: false,
        duration: 0,
        thumbnailUrl: '',
        notes: '',
        notesFileUrl: '',
      });
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save lecture');
    }
  };

  const handleEdit = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title,
      videoUrl: lecture.videoUrl || '',
      orderIndex: lecture.orderIndex,
      isLocked: lecture.isLocked,
      duration: lecture.duration,
      thumbnailUrl: lecture.thumbnailUrl,
      notes: lecture.notes || '',
      notesFileUrl: lecture.notesFileUrl || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    try {
      await api.deleteLecture(id);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete lecture');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/courses" className="text-emerald-600 hover:text-emerald-700 mb-2 inline-block">
              ← Back to Courses
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
            <p className="text-gray-600 mt-2">Manage lectures for this course</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingLecture(null);
              setSelectedFile(null);
              setFormData({
                title: '',
                videoUrl: '',
                orderIndex: lectures.length + 1,
                isLocked: false,
                duration: 0,
                thumbnailUrl: '',
                notes: '',
                notesFileUrl: '',
              });
            }}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
          >
            ➕ Add Lecture
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingLecture ? 'Edit Lecture' : 'Add New Lecture'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Video to AWS S3
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-800 font-medium mb-1">⚠️ AWS S3 Setup Required</p>
                    <p className="text-xs text-blue-700">
                      Configure AWS S3 credentials in your server environment variables to enable video uploads.
                      For now, you can manually enter the video URL below.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
                    />
                    {selectedFile && !uploading && (
                      <button
                        type="button"
                        onClick={handleVideoUpload}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
                      >
                        Upload
                      </button>
                    )}
                  </div>
                  {uploading && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Uploading... {Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                  {selectedFile && !uploading && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video URL <span className="text-gray-500">(Required)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://your-bucket.s3.region.amazonaws.com/videos/video.mp4"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter AWS S3 video URL or any direct video URL. Students will access videos via this URL.
                  </p>
                  {formData.videoUrl && (
                    <p className="text-xs text-emerald-600 mt-1">
                      ✓ Video URL set: {formData.videoUrl.substring(0, 60)}...
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Index</label>
                  <input
                    type="number"
                    value={formData.orderIndex}
                    onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lecture Notes (Text)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Lecture notes or summary..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes File URL (PDF/Document)</label>
                <input
                  type="url"
                  value={formData.notesFileUrl}
                  onChange={(e) => setFormData({ ...formData, notesFileUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://example.com/notes.pdf"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isLocked"
                  checked={formData.isLocked}
                  onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
                />
                <label htmlFor="isLocked" className="ml-2 text-sm font-medium text-gray-700">
                  Locked
                </label>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  {editingLecture ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingLecture(null);
                    setSelectedFile(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lectures.map((lecture) => (
                <tr key={lecture._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lecture.orderIndex}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{lecture.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.floor(lecture.duration / 60)}:{(lecture.duration % 60).toString().padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lecture.isLocked ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        Locked
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Unlocked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(lecture)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(lecture._id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lectures.length === 0 && (
            <div className="text-center py-12 text-gray-500">No lectures found</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
