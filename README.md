# CV Summary Backend

Express.js backend application boilerplate.

## Features

- Express.js server setup
- CORS enabled
- Security headers (Helmet)
- Request logging (Morgan)
- Environment variables support
- Error handling middleware
- Organized folder structure

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update the environment variables in `.env` as needed

## Running the Application

### Development mode (with auto-reload)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Example environment variables
├── .gitignore
├── package.json
├── README.md
└── server.js            # Application entry point
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API root endpoint

## License

ISC
