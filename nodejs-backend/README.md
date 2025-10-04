# Expense Management System - Node.js Backend

A comprehensive expense management system built with Node.js, Express, PostgreSQL, and Prisma ORM.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Admin, Manager, Employee)
- **Expense Management**: Submit, track, and manage expense claims
- **Approval Workflow**: Multi-level approval system with customizable rules
- **OCR Integration**: Automatic receipt scanning and data extraction
- **Currency Conversion**: Real-time currency conversion using external APIs
- **File Upload**: Receipt upload and management
- **Company Management**: Multi-tenant system with company-specific settings

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **File Upload**: Multer
- **OCR**: Tesseract.js
- **External APIs**: RestCountries, ExchangeRate-API

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodejs-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/expense_manager"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="24h"
   PORT=8000
   NODE_ENV="development"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # Seed the database with sample data
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:8000`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - Register new user and company
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Expense Endpoints

- `POST /api/expenses` - Submit new expense
- `GET /api/expenses` - Get user's expenses (with filtering)
- `GET /api/expenses/:id` - Get specific expense
- `PUT /api/expenses/:id` - Update expense (pending only)
- `DELETE /api/expenses/:id` - Cancel expense (pending only)

### Approval Endpoints

- `GET /api/approvals/pending` - Get pending approvals
- `GET /api/approvals/history` - Get approval history
- `POST /api/approvals/:id/approve` - Approve expense
- `POST /api/approvals/:id/reject` - Reject expense
- `GET /api/approvals/stats` - Get approval statistics

### Admin Endpoints

- `GET /api/admin/users` - Get all company users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/expenses` - Get all company expenses
- `GET /api/admin/stats` - Get company statistics
- `PUT /api/admin/approval-sequence` - Update approval sequence

### OCR Endpoints

- `POST /api/ocr/process-receipt` - Process receipt image
- `POST /api/ocr/validate-expense` - Validate extracted data

### Currency Endpoints

- `GET /api/currency/currencies` - Get all currencies
- `GET /api/currency/countries` - Get all countries
- `GET /api/currency/rate/:base/:target` - Get exchange rate
- `POST /api/currency/convert` - Convert amount
- `POST /api/currency/detect` - Detect currency for country

## Database Schema

### Core Tables

- **companies**: Company information
- **users**: User accounts with roles
- **expenses**: Expense claims
- **expense_approvals**: Approval workflow records
- **approval_sequences**: Company approval workflows
- **approval_rules**: Conditional approval rules

### User Roles

- **ADMIN**: Full system access, user management, company settings
- **MANAGER**: Approve expenses, manage team members
- **EMPLOYEE**: Submit expenses, view own history

## Approval Workflow

The system supports flexible approval workflows:

1. **Sequential Approval**: Expenses go through approval steps in order
2. **Role-based**: Assign approvals to specific roles
3. **User-specific**: Assign approvals to specific users
4. **Manager Hierarchy**: Automatic manager assignment

### Approval Rules

- **Percentage Rule**: Require X% of approvers to approve
- **Specific Rule**: Require specific user/role approval
- **Hybrid Rule**: Combine percentage and specific rules

## OCR Integration

- **Supported Formats**: JPEG, PNG, GIF, PDF
- **Extraction**: Amount, date, description, category
- **Validation**: Automatic data validation and suggestions

## File Upload

- **Local Storage**: Files stored in `uploads/` directory
- **File Validation**: Size and type restrictions
- **Security**: Multer configuration with file filtering

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API rate limiting
- **CORS**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Input Validation**: Express-validator for request validation

## Error Handling

- **Global Error Handler**: Centralized error processing
- **Validation Errors**: Detailed validation feedback
- **Database Errors**: Prisma error handling
- **HTTP Status Codes**: Proper status code usage

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm run generate` - Generate Prisma client
- `npm run seed` - Seed database with sample data

### Code Structure

```
nodejs-backend/
├── middleware/          # Custom middleware
├── routes/             # API route handlers
├── utils/              # Utility functions
├── scripts/            # Database scripts
├── prisma/             # Database schema and migrations
├── uploads/            # File upload directory
├── server.js           # Main application file
└── package.json        # Dependencies and scripts
```

## Deployment

### Production Setup

1. **Environment Variables**
   ```env
   NODE_ENV="production"
   DATABASE_URL="your-production-database-url"
   JWT_SECRET="strong-production-secret"
   ```

2. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start Application**
   ```bash
   npm start
   ```

### Docker Deployment

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

## Testing

The API can be tested using tools like Postman, curl, or any HTTP client.

### Sample Requests

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme.com", "password": "admin123"}'
```

**Submit Expense:**
```bash
curl -X POST http://localhost:8000/api/expenses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalAmount": 50.00,
    "originalCurrency": "USD",
    "category": "Meals",
    "description": "Business lunch",
    "date": "2024-01-15"
  }'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
