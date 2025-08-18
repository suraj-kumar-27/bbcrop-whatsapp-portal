# WhatsApp CRM Integration

A Node.js application that integrates WhatsApp messaging with CRM systems using Twilio API. The application provides automated WhatsApp flows, user management, and API logging capabilities.

## Features

- 🚀 WhatsApp Business API integration via Twilio
- 💼 CRM system integration
- 👥 User management and authentication
- 📊 API logging and monitoring
- 🔄 Automated user flows and sessions
- 🌐 Real-time communication with Socket.IO
- 📄 API documentation with Swagger
- 🗄️ SQLite database with Prisma ORM
- ☁️ File upload with Cloudinary integration
- 📧 Email notifications
- 📱 SMS integration
- 🔐 JWT authentication
- 🛡️ Security middleware (Helmet, XSS protection, HPP)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT, Passport.js (Google OAuth)
- **Messaging**: Twilio WhatsApp API
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary
- **Documentation**: Swagger UI
- **Security**: Helmet, XSS-Clean, HPP
- **Other**: Winston (logging), Joi (validation), Moment.js, QR Code generation

## Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-crm-integration
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and configure the following variables:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRY=24h

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

   # CRM API Configuration
   CRM_API_KEY=your_crm_api_key

   # Cloudinary Configuration (for file uploads)
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Email Configuration (Gmail)
   SEND_EMAIL=true
   GMAIL_SERVICE=gmail
   GMAIL_USER=your_gmail_email@gmail.com
   GMAIL_PASS=your_gmail_app_password

   # SMS Configuration
   SMS_URL=your_sms_provider_url
   SMS_API_KEY=your_sms_api_key
   SMS_SENDER_ID=your_sms_sender_id
   SMS_TEMPLATE_ID=your_sms_template_id

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback

   # API Logging
   API_LOGS_PASS=your_api_log_password

   # Swagger Documentation
   SWAGGER_UI=true
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## Running the Application

### Development Mode
```bash
npm start
# or
npm run nodemon
```

The application will start on `http://localhost:3000` (or the port specified in your `.env` file).

### Production Mode
```bash
NODE_ENV=production node index.js
```

## API Documentation

When `SWAGGER_UI=true` is set in your `.env` file, you can access the API documentation at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### WhatsApp Integration
- `POST /api/v1/whatsapp/*` - WhatsApp webhook and messaging endpoints

### API Logs
- `GET/POST /api/v1/apiLogs/*` - API logging and monitoring endpoints

## Database Schema

The application uses SQLite with Prisma ORM. Key models include:

- **User**: User management and authentication
- **UserSession**: WhatsApp conversation sessions
- **ApiLogs**: API request/response logging
- **ApiResponse**: API response templates
- **adminSession**: Admin authentication sessions

## File Structure

```
├── server/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── apiLogs/     # API logging controllers
│   │   │   ├── whatsapp/    # WhatsApp integration controllers
│   │   │   └── socket/      # Socket.IO controllers
│   │   └── services/        # Business logic services
│   ├── automation/          # Cron jobs and automation
│   ├── common/             # Server configuration
│   ├── db/                 # Database connection
│   ├── enums/              # Application enums
│   ├── helper/             # Utility functions
│   └── middleware/         # Authentication and security middleware
├── prisma/
│   └── schema.prisma       # Database schema
├── public/                 # Static files and logs
└── db_data/               # SQLite database file
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRY` | JWT expiration time | No | 24h |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes | - |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Yes | - |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp number | No | whatsapp:+96178709578 |
| `CRM_API_KEY` | CRM system API key | Yes | - |
| `SEND_EMAIL` | Enable email sending | No | true |
| `GMAIL_USER` | Gmail account for sending emails | No | - |
| `GMAIL_PASS` | Gmail app password | No | - |
| `API_LOGS_PASS` | API logging password | Yes | - |
| `SWAGGER_UI` | Enable Swagger documentation | No | false |

## Development

### Database Management

To reset the database:
```bash
rm db_data/data.db
npx prisma db push
```

To view data in Prisma Studio:
```bash
npx prisma studio
```

### Adding New Migrations
```bash
npx prisma migrate dev --name migration_name
```

## Security Considerations

The application includes several security measures:
- Helmet.js for security headers
- XSS protection
- HTTP Parameter Pollution (HPP) protection
- JWT authentication
- Input validation with Joi
- Environment variable validation

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure the `db_data` directory exists and has proper permissions.
2. **Twilio webhook issues**: Make sure your webhook URL is publicly accessible and uses HTTPS in production.
3. **Environment variables not loading**: Verify your `.env` file is in the root directory and properly formatted.

### Logs

Application logs are stored in:
- Console output (development)
- Winston logger (configurable)
- API logs in database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the package.json file for details.

## Support

For support and questions, please refer to the API documentation or contact the development team.