const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for testing
const mockApps = [
  {
    id: '1',
    name: 'PhotoEditor Pro',
    description: 'Professional photo editing software with advanced features',
    price: 29.99,
    rating: 4.5,
    reviewCount: 1250,
    downloads: 50000,
    icon: 'https://via.placeholder.com/128x128/4F46E5/white?text=PE',
    screenshots: [
      'https://via.placeholder.com/800x600/4F46E5/white?text=Screenshot+1',
      'https://via.placeholder.com/800x600/059669/white?text=Screenshot+2'
    ],
    category: 'Graphics & Design',
    platforms: ['web', 'desktop'],
    features: ['Advanced filters', 'Layer support', 'RAW processing', 'Batch editing'],
    developer: {
      id: '1',
      companyName: 'Creative Studios',
      name: 'Creative Studios'
    },
    reviews: [
      {
        id: '1',
        rating: 5,
        comment: 'Excellent app with great features!',
        user: { name: 'John Doe' },
        createdAt: '2024-01-15T10:00:00Z'
      }
    ],
    ratingDistribution: { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 }
  },
  {
    id: '2',
    name: 'TaskManager Plus',
    description: 'Organize your tasks and boost productivity',
    price: 0,
    rating: 4.2,
    reviewCount: 890,
    downloads: 25000,
    icon: 'https://via.placeholder.com/128x128/059669/white?text=TM',
    screenshots: [
      'https://via.placeholder.com/800x600/059669/white?text=Dashboard',
      'https://via.placeholder.com/800x600/DC2626/white?text=Tasks'
    ],
    category: 'Productivity',
    platforms: ['web', 'mobile'],
    features: ['Task scheduling', 'Team collaboration', 'Progress tracking', 'Notifications'],
    developer: {
      id: '2',
      companyName: 'Productivity Inc',
      name: 'Productivity Inc'
    },
    reviews: [
      {
        id: '2',
        rating: 4,
        comment: 'Great for team collaboration!',
        user: { name: 'Jane Smith' },
        createdAt: '2024-01-14T15:30:00Z'
      }
    ],
    ratingDistribution: { 5: 45, 4: 35, 3: 15, 2: 3, 1: 2 }
  },
  {
    id: '3',
    name: 'CodeEditor X',
    description: 'Advanced code editor for developers',
    price: 49.99,
    rating: 4.8,
    reviewCount: 2100,
    downloads: 75000,
    icon: 'https://via.placeholder.com/128x128/DC2626/white?text=CX',
    screenshots: [
      'https://via.placeholder.com/800x600/DC2626/white?text=Editor',
      'https://via.placeholder.com/800x600/7C3AED/white?text=Debugging'
    ],
    category: 'Developer Tools',
    platforms: ['desktop'],
    features: ['Syntax highlighting', 'Auto-completion', 'Git integration', 'Plugin support'],
    developer: {
      id: '3',
      companyName: 'DevTools Corp',
      name: 'DevTools Corp'
    },
    reviews: [
      {
        id: '3',
        rating: 5,
        comment: 'Best code editor I have ever used!',
        user: { name: 'Mike Johnson' },
        createdAt: '2024-01-13T09:15:00Z'
      }
    ],
    ratingDistribution: { 5: 80, 4: 15, 3: 3, 2: 1, 1: 1 }
  }
];

const mockCategories = [
  { id: '1', name: 'Graphics & Design', count: 150 },
  { id: '2', name: 'Productivity', count: 200 },
  { id: '3', name: 'Developer Tools', count: 120 },
  { id: '4', name: 'Business', count: 180 },
  { id: '5', name: 'Education', count: 90 }
];

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Apps routes
app.get('/api/apps/public', (req, res) => {
  const { search, category, sortBy, page = 1, limit = 12 } = req.query;
  
  let filteredApps = [...mockApps];
  
  // Search filter
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredApps = filteredApps.filter(app => 
      app.name.toLowerCase().includes(searchTerm) ||
      app.description.toLowerCase().includes(searchTerm) ||
      app.category.toLowerCase().includes(searchTerm) ||
      app.developer.companyName.toLowerCase().includes(searchTerm)
    );
  }
  
  // Category filter
  if (category && category !== 'all') {
    filteredApps = filteredApps.filter(app => 
      app.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Sort
  if (sortBy) {
    switch (sortBy) {
      case 'name':
        filteredApps.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        filteredApps.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredApps.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filteredApps.sort((a, b) => b.rating - a.rating);
        break;
      case 'downloads':
        filteredApps.sort((a, b) => b.downloads - a.downloads);
        break;
      default:
        // Default sort by popularity (downloads)
        filteredApps.sort((a, b) => b.downloads - a.downloads);
    }
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedApps = filteredApps.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      apps: paginatedApps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredApps.length,
        totalPages: Math.ceil(filteredApps.length / limit)
      }
    }
  });
});

app.get('/api/apps/public/:id', (req, res) => {
  const { id } = req.params;
  const app = mockApps.find(a => a.id === id);
  
  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'App not found'
    });
  }
  
  res.json({
    success: true,
    data: app
  });
});

app.get('/api/apps/categories', (req, res) => {
  res.json({
    success: true,
    data: mockCategories
  });
});

app.get('/api/apps/featured', (req, res) => {
  const featuredApps = mockApps.filter(app => app.rating >= 4.5);
  res.json({
    success: true,
    data: featuredApps
  });
});

app.get('/api/apps/top-charts', (req, res) => {
  const { type = 'free', category } = req.query;
  
  let topApps = [...mockApps];
  
  // Filter by type
  if (type === 'free') {
    topApps = topApps.filter(app => app.price === 0);
  } else if (type === 'paid') {
    topApps = topApps.filter(app => app.price > 0);
  }
  
  // Filter by category if specified
  if (category && category !== 'all') {
    topApps = topApps.filter(app => 
      app.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Sort by downloads (popularity)
  topApps.sort((a, b) => b.downloads - a.downloads);
  
  res.json({
    success: true,
    data: topApps.slice(0, 10) // Top 10
  });
});

// Reviews
app.post('/api/apps/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  
  const app = mockApps.find(a => a.id === id);
  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'App not found'
    });
  }
  
  const newReview = {
    id: Date.now().toString(),
    rating,
    comment,
    user: { name: 'Anonymous User' },
    createdAt: new Date().toISOString()
  };
  
  app.reviews.unshift(newReview);
  
  // Recalculate average rating
  const totalRating = app.reviews.reduce((sum, review) => sum + review.rating, 0);
  app.rating = Math.round((totalRating / app.reviews.length) * 10) / 10;
  app.reviewCount = app.reviews.length;
  
  res.json({
    success: true,
    data: {
      ...newReview,
      newAverageRating: app.rating
    }
  });
});

// Download endpoint
app.post('/api/apps/:id/download', (req, res) => {
  const { id } = req.params;
  const app = mockApps.find(a => a.id === id);
  
  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'App not found'
    });
  }
  
  // Increment download count
  app.downloads += 1;
  
  res.json({
    success: true,
    data: {
      downloadUrl: `https://downloads.example.com/apps/${app.name.replace(/\s+/g, '-').toLowerCase()}.zip`,
      app: app
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Apps API: http://localhost:${PORT}/api/apps/public`);
});