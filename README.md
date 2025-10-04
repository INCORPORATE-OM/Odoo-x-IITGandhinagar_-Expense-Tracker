# Expense Management System

A comprehensive full-stack expense management system with role-based access control, multi-level approval workflows, OCR receipt processing, and real-time currency conversion.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Company-based isolation with automatic setup
- **Role-based Access Control**: Admin, Manager, and Employee roles
- **Expense Management**: Submit, track, and manage expense claims
- **Multi-level Approval Workflow**: Configurable approval sequences
- **OCR Receipt Processing**: Automatic data extraction from receipts
- **Currency Conversion**: Real-time conversion using external APIs
- **File Upload**: Secure receipt storage and management

### Advanced Features
- **Conditional Approval Rules**: Percentage-based, specific approver, and hybrid rules
- **Manager Hierarchy**: Automatic manager assignment and escalation
- **Real-time Notifications**: Toast notifications and status updates
- **Responsive Design**: Mobile-first approach with modern UI
- **Comprehensive Analytics**: Dashboard with statistics and insights

## 🛠 Tech Stack

### Backend (Node.js)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **File Upload**: Multer with validation
- **OCR**: Tesseract.js for receipt processing
- **External APIs**: RestCountries, ExchangeRate-API

### Frontend (React)
- **Framework**: React 18 with Vite
- **Styling**: TailwindCSS with custom design system
- **Routing**: React Router with protected routes
- **State Management**: React Context for authentication
- **Forms**: React Hook Form with validation
- **Notifications**: React Hot Toast
- **Icons**: Heroicons

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd expense-tracker-odoo
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd nodejs-backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your database and API configurations

# Set up the database
npx prisma generate
npx prisma migrate dev
npm run seed

# Start the backend server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your backend API URL

# Start the frontend development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health

## 👥 Demo Credentials

After running the seed script, you can use these credentials:

- **Admin**: admin@acme.com / admin123
- **Manager**: manager@acme.com / manager123
- **Employee**: employee1@acme.com / employee123
- **Employee**: employee2@acme.com / employee123

## 📁 Project Structure

```
expense-tracker-odoo/
├── nodejs-backend/          # Node.js + Express backend
│   ├── prisma/             # Database schema and migrations
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   ├── scripts/            # Database scripts
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── api/            # API client
│   │   └── main.jsx        # App entry point
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/expense_manager"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# Server
PORT=8000
NODE_ENV="development"

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH="./uploads"

# External APIs
RESTCOUNTRIES_API="https://restcountries.com/v3.1/all?fields=name,currencies"
EXCHANGE_RATE_API="https://api.exchangerate-api.com/v4/latest"
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:8000/api
```

## 📊 Database Schema

### Core Tables
- **companies**: Company information and settings
- **users**: User accounts with role-based access
- **expenses**: Expense claims with approval tracking
- **expense_approvals**: Multi-level approval workflow
- **approval_sequences**: Configurable approval chains
- **approval_rules**: Conditional approval logic

### Key Relationships
- Users belong to companies (multi-tenant)
- Users can have managers (hierarchy)
- Expenses go through approval sequences
- Approval rules determine final decisions

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **File Upload Security**: Type and size validation
- **Role-based Authorization**: Granular permission system

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user and company
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Expenses
- `POST /api/expenses` - Submit new expense
- `GET /api/expenses` - Get user's expenses (with filtering)
- `GET /api/expenses/:id` - Get specific expense
- `PUT /api/expenses/:id` - Update expense (pending only)
- `DELETE /api/expenses/:id` - Cancel expense

### Approvals
- `GET /api/approvals/pending` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve expense
- `POST /api/approvals/:id/reject` - Reject expense
- `GET /api/approvals/history` - Get approval history

### Admin
- `GET /api/admin/users` - Get all company users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/stats` - Get company statistics

### OCR & Currency
- `POST /api/ocr/process-receipt` - Process receipt image
- `GET /api/currency/currencies` - Get available currencies
- `POST /api/currency/convert` - Convert currency amounts

## 🎨 UI/UX Features

### Design System
- **Modern Interface**: Clean, professional design with TailwindCSS
- **Responsive Layout**: Mobile-first approach with flexible grid
- **Color Scheme**: Consistent primary, success, warning, and danger colors
- **Typography**: Inter font family with proper hierarchy
- **Icons**: Heroicons for consistent iconography

### User Experience
- **Role-based Dashboards**: Customized views for each user role
- **Real-time Updates**: Live status updates and notifications
- **Form Validation**: Client-side validation with helpful error messages
- **Loading States**: Visual feedback during operations
- **Toast Notifications**: Non-intrusive success and error messages

## 📱 Mobile Support

- **Responsive Design**: Optimized for all screen sizes
- **Touch-friendly**: Large touch targets and gestures
- **Progressive Web App**: Can be installed on mobile devices
- **Offline Support**: Basic offline functionality (planned)

## 🚀 Deployment

### Production Environment Variables

#### Backend
```env
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
JWT_SECRET="strong-production-secret"
PORT=8000
```

#### Frontend
```env
VITE_API_URL="https://your-api-domain.com/api"
```

### Docker Deployment

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 8000
CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deployment Platforms

- **Backend**: Railway, Heroku, DigitalOcean, AWS
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Database**: PostgreSQL on Railway, Heroku Postgres, AWS RDS

## 🧪 Testing

### Backend Testing
```bash
cd nodejs-backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📈 Performance

### Backend Optimizations
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis integration for frequently accessed data
- **Compression**: Gzip compression for API responses

### Frontend Optimizations
- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Dynamic imports for better performance
- **Image Optimization**: Optimized receipt previews
- **Bundle Analysis**: Vite's built-in bundle analyzer

## 🔄 Workflow Examples

### Employee Workflow
1. Submit expense with receipt upload
2. OCR processes receipt and pre-fills form
3. Employee reviews and submits
4. Expense enters approval workflow
5. Track status in history

### Manager Workflow
1. View pending approvals in queue
2. Review expense details and receipt
3. Approve or reject with comments
4. Track approval statistics
5. Manage team members

### Admin Workflow
1. Create and manage users
2. Configure approval sequences
3. Set up approval rules
4. View company-wide analytics
5. Override approvals if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in each directory
- Review the API documentation

## 🗺 Roadmap

### Phase 1 (Current)
- ✅ Core expense management
- ✅ Multi-level approvals
- ✅ OCR integration
- ✅ Role-based access

### Phase 2 (Planned)
- 🔄 Email notifications
- 🔄 Advanced reporting
- 🔄 Mobile app
- 🔄 API webhooks

### Phase 3 (Future)
- 📋 Multi-currency support
- 📋 Expense categories management
- 📋 Budget tracking
- 📋 Integration with accounting software

---

**Built with ❤️ using Node.js, Express, React, and PostgreSQL**