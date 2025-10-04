# Expense Management System - React Frontend

A modern, responsive frontend for the Expense Management System built with React, Vite, and TailwindCSS.

## Features

- **Modern UI/UX**: Clean, professional interface with TailwindCSS
- **Role-based Access**: Different views for Admin, Manager, and Employee roles
- **Expense Management**: Submit, track, and manage expense claims
- **OCR Integration**: Automatic receipt scanning and data extraction
- **Approval Workflow**: Visual approval queue for managers
- **Real-time Updates**: Live data updates and notifications
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **React Hook Form**: Form handling and validation
- **Axios**: HTTP client for API requests
- **React Hot Toast**: Beautiful toast notifications
- **Heroicons**: Beautiful SVG icons
- **Tesseract.js**: OCR for receipt processing

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Backend API running (see backend README)

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your backend API URL:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── api/                 # API client configuration
├── components/          # Reusable UI components
│   ├── AppShell.jsx    # Main layout component
│   └── ProtectedRoute.jsx # Route protection
├── contexts/            # React contexts
│   └── AuthContext.jsx # Authentication state
├── pages/               # Page components
│   ├── Login.jsx       # Login page
│   ├── Signup.jsx      # Registration page
│   ├── Dashboard.jsx   # Main dashboard
│   ├── SubmitExpense.jsx # Expense submission
│   ├── History.jsx     # Expense history
│   ├── ApprovalsQueue.jsx # Manager approvals
│   ├── AdminSettings.jsx # Admin panel
│   └── Profile.jsx     # User profile
├── main.jsx            # Application entry point
└── index.css           # Global styles
```

## Key Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Manager, Employee)
- Protected routes and components
- Automatic token refresh

### Expense Management
- **Submit Expenses**: Upload receipts with OCR processing
- **Track Status**: Real-time status updates
- **History View**: Filterable expense history
- **Receipt Viewer**: View uploaded receipts

### Manager Features
- **Approval Queue**: Review pending expenses
- **Approval Chain**: Visual approval workflow
- **Statistics**: Approval metrics and analytics

### Admin Features
- **User Management**: Create and manage users
- **Company Settings**: Configure approval workflows
- **Analytics Dashboard**: Company-wide statistics

### OCR Integration
- **Receipt Scanning**: Automatic data extraction
- **Data Validation**: Smart form pre-filling
- **Multiple Formats**: Support for images and PDFs

## UI Components

### Design System
- **Colors**: Primary, success, warning, danger color schemes
- **Typography**: Inter font family with proper hierarchy
- **Spacing**: Consistent spacing scale
- **Shadows**: Subtle shadow system for depth

### Components
- **Buttons**: Primary, secondary, outline, and danger variants
- **Forms**: Input fields, selects, and validation
- **Cards**: Content containers with headers and footers
- **Badges**: Status indicators and labels
- **Navigation**: Sidebar and top navigation

## Responsive Design

- **Mobile-first**: Optimized for mobile devices
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Flexible Layout**: Adapts to different screen sizes
- **Touch-friendly**: Optimized for touch interactions

## State Management

- **React Context**: Global authentication state
- **Local State**: Component-level state with useState
- **Form State**: React Hook Form for form management
- **API State**: Axios interceptors for request/response handling

## Error Handling

- **Toast Notifications**: User-friendly error messages
- **Form Validation**: Client-side validation with error display
- **API Errors**: Centralized error handling
- **Loading States**: Visual feedback during operations

## Performance Optimizations

- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Dynamic imports for better performance
- **Image Optimization**: Optimized receipt previews
- **Bundle Analysis**: Vite's built-in bundle analyzer

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Development

### Code Style
- ESLint configuration for code quality
- Prettier for code formatting
- Consistent naming conventions
- Component documentation

### Best Practices
- Functional components with hooks
- Custom hooks for reusable logic
- Proper error boundaries
- Accessibility considerations

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
```env
VITE_API_URL=https://your-api-domain.com/api
```

### Static Hosting
The built files can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3
- GitHub Pages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.