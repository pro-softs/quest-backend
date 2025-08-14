# Episode Generator Backend - MVP

A Node.js backend service that generates story-driven video episodes using AI, designed for content creators and educational platforms.

## 🚀 Features

- **Story Generation**: Create engaging multi-episode narratives based on any topic
- **AI-Powered Content**: Leverages OpenAI GPT for creative storytelling
- **Multiple Formats**: Supports various genres (anime, realistic, cartoon, fantasy, sci-fi, documentary)
- **Age-Appropriate**: Tailored content for different age groups (8-12, 13-15, 16-18, 18+)
- **Structured Output**: Returns ready-to-use scene descriptions, dialogue, image prompts, and voiceover scripts
- **Job Queue**: Simulates video rendering pipeline with job management

## 📁 Project Structure

```
src/
├── controllers/         # Request handlers
├── services/           # Business logic
├── routes/             # API route definitions
├── middleware/         # Validation and error handling
├── models/             # Data models
├── utils/              # Utility functions
└── app.js              # Main application file
```

## 🛠️ Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development
```

3. **Start the Server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### POST `/api/generate-episodes`

Generate story-driven video episodes based on a topic.

**Request Body:**
```json
{
  "topic": "What if dinosaurs never went extinct?",
  "age_group": "13-15",
  "genre": "anime"
}
```

**Response:**
```json
{
  "status": "queued",
  "video_status": "processing",
  "episodes": [
    {
      "title": "Episode 1: The Discovery",
      "scenes": [
        {
          "scene_id": 1,
          "description": "A mysterious laboratory filled with ancient artifacts",
          "dialogue": "What we discovered would change everything.",
          "image_prompt": "A sci-fi anime scene showing a mysterious laboratory...",
          "voiceover_script": "In this moment, our understanding of history would be forever altered."
        }
      ]
    }
  ],
  "video_urls": []
}
```

### GET `/health`

Health check endpoint to verify service status.

## 🎭 Supported Parameters

### Age Groups
- `8-12`: Elementary school content
- `13-15`: Middle school content  
- `16-18`: High school content
- `18+`: Adult content

### Genres
- `anime`: Anime-style storytelling
- `realistic`: Realistic narrative approach
- `cartoon`: Cartoon-style content
- `fantasy`: Fantasy genre elements
- `sci-fi`: Science fiction themes
- `documentary`: Educational documentary style

## 🔧 Configuration

The service uses environment variables for configuration:

- `OPENAI_API_KEY`: Your OpenAI API key for content generation
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## 📊 Job Queue

Generated episodes are automatically queued for processing in the `jobs/` directory. Each job contains:

- Original request parameters
- Generated episode data
- Processing status
- Timestamp

## 🛡️ Error Handling

The API includes comprehensive error handling for:
- Input validation errors
- OpenAI API failures
- Network connectivity issues
- Invalid JSON requests
- Service unavailability

## 🔍 Example Usage

```bash
curl -X POST http://localhost:3000/api/generate-episodes \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "What if humans could breathe underwater?",
    "age_group": "13-15",
    "genre": "fantasy"
  }'
```

## 📝 Development Notes

- Uses ES6 modules throughout
- Implements proper separation of concerns
- Includes fallback responses when OpenAI API is unavailable
- Parallel processing for scene generation using Promise.all
- Comprehensive input validation using Joi
- Morgan logging for request tracking
- Helmet for security headers

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper OpenAI API key
3. Set up process management (PM2 recommended)
4. Configure reverse proxy (Nginx recommended)
5. Set up monitoring and logging

## 📄 License

MIT License - see LICENSE file for details# quest-backend
