# EduHive Admin Panel

Professional admin panel for managing the EduHive learning platform. Built with Next.js 16, React 19, and TypeScript.

## Features

- 📊 **Dashboard** - View platform statistics and analytics
- 📚 **Course Management** - Create, edit, and manage courses
- 🎥 **Lecture Management** - Add lectures with video support (AWS S3 integration)
- 👥 **User Management** - Manage users, roles, and permissions
- 💰 **Wallet Management** - Handle wallet transactions and top-ups
- 🔐 **Secure Authentication** - JWT-based authentication

## Tech Stack

- **Framework:** Next.js 16
- **UI Library:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Prerequisites

- Node.js 20+ installed
- Backend server running (see server configuration)
- AWS S3 account (for video uploads - optional)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=https://your-server-url.com
```

For local development:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## AWS S3 Video Upload Setup

To enable video uploads:

1. **Create AWS S3 Bucket**
   - Create a bucket in AWS S3
   - Configure bucket permissions (public read access recommended)

2. **Configure Server Environment Variables**
   Add these to your backend server (Render, etc.):
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-bucket-name
   ```

3. **Upload Videos**
   - Go to Courses → Select Course → Lectures
   - Click "Add Lecture"
   - Use "Upload Video to AWS S3" feature
   - Or manually enter AWS S3 URL

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository
2. Set root directory: `/` (empty)
3. Framework: Next.js (auto-detected)
4. Add environment variable: `NEXT_PUBLIC_API_URL`
5. Deploy

### Manual Deployment

```bash
npm run build
# Deploy the .next folder to your hosting provider
```

## Project Structure

```
admin/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard page
│   ├── courses/           # Course management
│   ├── users/             # User management
│   ├── wallet/            # Wallet management
│   └── login/             # Login page
├── components/            # Reusable components
├── lib/                   # API client and utilities
├── public/               # Static assets
└── package.json          # Dependencies
```

## API Integration

The admin panel connects to the EduHive backend API. All API calls are handled through `lib/api.ts`.

### Required API Endpoints

- `POST /api/auth/login` - Admin login
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/courses` - List courses
- `POST /api/admin/courses` - Create course
- `GET /api/admin/courses/:id/lectures` - List lectures
- `POST /api/admin/courses/:id/lectures` - Create lecture
- `POST /api/admin/upload/video` - Upload video to S3

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Security Notes

- All admin routes are protected with JWT authentication
- Tokens are stored in localStorage (consider httpOnly cookies for production)
- Only users with `admin` or `teacher` role can access

## Support

For issues or questions, please refer to the main EduHive repository documentation.

## License

Part of the EduHive learning platform.
