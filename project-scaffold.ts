// frontend/pages/community/new.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function NewPost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await axios.post('/api/forum/posts', 
        { title, content },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      router.push('/community');
    } catch (error) {
      setError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Create New Post</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border rounded h-32"
              required
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// frontend/pages/community/post/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface Reply {
  _id: string;
  content: string;
  author: {
    name: string;
    _id: string;
  };
  createdAt: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  author: {
    name: string;
    _id: string;
  };
  replies: Reply[];
  createdAt: string;
}

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<Post | null>(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      try {
        const response = await axios.get(`/api/forum/posts/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching post:', error);
      }
    };

    fetchPost();
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await axios.post(
        `/api/forum/posts/${id}/reply`,
        { content: reply },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPost(prev => prev ? { ...prev, replies: [...prev.replies, response.data] } : null);
      setReply('');
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!post) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Post Content */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
            <p className="text-gray-600 mb-4">{post.content}</p>
            <div className="text-sm text-gray-500">
              Posted by {post.author.name} on {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Replies */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Replies</h2>
            <div className="space-y-4">
              {post.replies.map(reply => (
                <div key={reply._id} className="border-b pb-4">
                  <p className="mb-2">{reply.content}</p>
                  <div className="text-sm text-gray-500">
                    {reply.author.name} • {new Date(reply.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleReply} className="mt-6">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="w-full p-2 border rounded h-24"
                placeholder="Write a reply..."
                required
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// backend/src/routes/forum.ts
import express from 'express';
import { auth } from '../middleware/auth';
import ForumPost from '../models/ForumPost';

const router = express.Router();

// Get all posts
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new post
router.post('/posts', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const post = new ForumPost({
      title,
      content,
      author: req.userId
    });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get post by ID
router.get('/posts/:id', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'name')
      .populate('replies.author', 'name');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reply to post
router.post('/posts/:id/reply', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.replies.push({
      content: req.body.content,
      author: req.userId
    });

    await post.save();
    res.status(201).json(post.replies[post.replies.length - 1]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};

// backend/src/__tests__/recommendationEngine.test.ts
import { calculateMatchScore } from '../utils/recommendationEngine';

describe('Recommendation Engine', () => {
  const mockPreferences = {
    budget: '2000-3000',
    climatePreference: 'Mediterranean',
    healthcareImportance: 8,
    lgbtqFriendly: true,
    safetyImportance: 9
  };

  const mockDestination = {
    name: 'Test City',
    costOfLiving: 2,
    climate: 'Mediterranean',
    healthcare: {
      quality: 8,
      cost: 3
    },
    safety: 9,
    lgbtqFriendly: 8
  };

  test('calculates match score correctly', () => {
    const score = calculateMatchScore(mockPreferences, mockDestination);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('penalizes mismatched climate', () => {
    const mismatchedDestination = {
      ...mockDestination,
      climate: 'Tropical'
    };
    const mismatchScore = calculateMatchScore(mockPreferences, mismatchedDestination);
    const matchScore = calculateMatchScore(mockPreferences, mockDestination);
    expect(mismatchScore).toBeLessThan(matchScore);
  });
});

// Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json frontend/
COPY backend/package*.json backend/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build applications
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built assets and dependencies
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]

// docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/relocation-advisor
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001

volumes:
  mongodb_data:
