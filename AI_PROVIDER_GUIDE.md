# AI Provider Configuration Guide

This WhatsApp CRM integration supports multiple AI providers for natural language processing. You can easily switch between providers using environment variables.

## Supported Providers

### 1. Groq (Default)
- **Provider**: `groq`
- **Model**: `llama-3.1-8b-instant`
- **API**: Groq Cloud API
- **Speed**: Very fast inference
- **Cost**: Generally lower cost

### 2. OpenAI (ChatGPT)
- **Provider**: `openai`
- **Model**: `gpt-3.5-turbo` (configurable to `gpt-4`)
- **API**: OpenAI API
- **Quality**: High quality responses
- **Features**: More advanced reasoning

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Choose your AI provider ('groq' or 'openai')
AI_PROVIDER=groq

# Groq Configuration (if using Groq)
GROQ_API_KEY=your_groq_api_key_here

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here
```

### Switching Providers

#### To use Groq (Default):
```bash
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_key_here
```

#### To use OpenAI/ChatGPT:
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_openai_key_here
```

## Getting API Keys

### Groq API Key
1. Visit [https://console.groq.com/](https://console.groq.com/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key starting with `gsk_`

### OpenAI API Key
1. Visit [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key starting with `sk-`

## Model Configuration

You can modify the models in `aiAssistant.js`:

```javascript
getModelName() {
    switch (AI_PROVIDER.toLowerCase()) {
        case 'openai':
            return 'gpt-4'; // Change to gpt-4 for better quality
        case 'groq':
        default:
            return 'llama-3.1-8b-instant';
    }
}
```

## Features

- **Automatic Provider Detection**: The system automatically uses the configured provider
- **Error Handling**: Proper error messages for missing API keys
- **Retry Logic**: Built-in retry mechanism for API failures
- **Rate Limiting**: Handles rate limits with exponential backoff
- **Multi-language Support**: Works with Arabic, English, and Hindi inputs

## Troubleshooting

### Common Issues

1. **Missing API Key Error**
   ```
   GROQ API key is not configured. Please set GROQ_API_KEY environment variable.
   ```
   **Solution**: Add the correct API key to your `.env` file

2. **Invalid Provider**
   ```
   AI Assistant initialized with provider: UNKNOWN
   ```
   **Solution**: Set `AI_PROVIDER` to either `groq` or `openai`

3. **Rate Limit Exceeded**
   ```
   Rate limit exceeded on OPENAI. Please try again in a few minutes.
   ```
   **Solution**: Wait for the rate limit to reset or upgrade your API plan

### Logs

The system logs which provider is being used on startup:
```
AI Assistant initialized with provider: OPENAI
Model: gpt-3.5-turbo
```

## Cost Considerations

- **Groq**: Generally more cost-effective, faster responses
- **OpenAI**: Higher cost but potentially better quality for complex queries

Choose based on your needs:
- **High Volume**: Use Groq for cost efficiency
- **High Quality**: Use OpenAI for better understanding
