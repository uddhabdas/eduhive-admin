# EduHive Admin Panel

Next.js admin panel for managing courses, lectures, users, and wallet transactions.

## Features

- ✅ Course Management
- ✅ Lecture Management with AWS S3 Video Upload
- ✅ User Management
- ✅ Wallet Transaction Management
- ✅ Dashboard with Statistics

## Setup

### Local Development

```bash
# Install dependencies
npm install

# Create .env.local file
echo NEXT_PUBLIC_API_URL=https://eduhive-server.onrender.com > .env.local

# Run development server
npm run dev
```

Admin panel will be available at: http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://eduhive-server.onrender.com
```

## Deployment

### Netlify

1. Connect GitHub repository
2. Set base directory: `admin`
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variable: `NEXT_PUBLIC_API_URL`

See `NETLIFY_DEPLOYMENT_GUIDE.md` for detailed instructions.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## API Endpoints

All API calls go to: `NEXT_PUBLIC_API_URL`

- `/api/admin/courses` - Course management
- `/api/admin/lectures` - Lecture management
- `/api/admin/upload/video` - Video upload to S3
- `/api/admin/users` - User management
- `/api/admin/stats` - Dashboard statistics
