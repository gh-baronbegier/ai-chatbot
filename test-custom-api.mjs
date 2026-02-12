import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const API_BASE_URL = 'https://a.baronbegier.com/v1';

// Create the custom OpenAI provider
const customAPI = createOpenAI({
  apiKey: 'not-needed',
  baseURL: API_BASE_URL,
});

console.log('🔍 Testing Custom OpenAI-Compatible API\n');
console.log(`Base URL: ${API_BASE_URL}\n`);

// ---- Step 1: List available models ----
console.log('📋 Fetching available models...\n');

try {
  const response = await fetch(`${API_BASE_URL}/models`);
  const data = await response.json();

  console.log('Available models:');
  data.data.forEach((model) => {
    console.log(`  - ${model.id} (owned by ${model.owned_by})`);
  });
  console.log('');
} catch (error) {
  console.error('Error fetching models:', error.message);
}

// ---- Step 2: Test Claude Opus 4.6 ----
console.log('🤖 Testing Claude Opus 4.6...\n');

try {
  const claudeModel = customAPI('claude-opus-4-6');
  const claudeResult = await generateText({
    model: claudeModel,
    messages: [
      {
        role: 'user',
        content: 'Write a haiku about artificial intelligence in the style of a tech enthusiast.',
      },
    ],
  });

  console.log('Claude Opus 4.6 Response:');
  console.log(claudeResult.text);
  console.log('');
  console.log(`Tokens: ${claudeResult.usage?.promptTokens || 0} prompt + ${claudeResult.usage?.completionTokens || 0} completion = ${claudeResult.usage?.totalTokens || 0} total`);
  console.log('');
} catch (error) {
  console.error('Error with Claude Opus:', error.message);
  console.log('');
}

// ---- Step 3: Test GPT-5.3 Codex ----
console.log('🚀 Testing GPT-5.3 Codex...\n');

try {
  const codexModel = customAPI('gpt-5.3-codex');
  const codexResult = await generateText({
    model: codexModel,
    messages: [
      {
        role: 'user',
        content: 'Explain what makes a good API design in 2 sentences.',
      },
    ],
  });

  console.log('GPT-5.3 Codex Response:');
  console.log(codexResult.text);
  console.log('');
  console.log(`Tokens: ${codexResult.usage?.promptTokens || 0} prompt + ${codexResult.usage?.completionTokens || 0} completion = ${codexResult.usage?.totalTokens || 0} total`);
  console.log('');
} catch (error) {
  console.error('Error with GPT Codex:', error.message);
  console.log('');
}

// ---- Step 4: Test Claude Sonnet 4.5 ----
console.log('✨ Testing Claude Sonnet 4.5...\n');

try {
  const sonnetModel = customAPI('claude-sonnet-4-5');
  const sonnetResult = await generateText({
    model: sonnetModel,
    messages: [
      {
        role: 'user',
        content: 'What is the capital of France? Answer in one word.',
      },
    ],
  });

  console.log('Claude Sonnet 4.5 Response:');
  console.log(sonnetResult.text);
  console.log('');
  console.log(`Tokens: ${sonnetResult.usage?.promptTokens || 0} prompt + ${sonnetResult.usage?.completionTokens || 0} completion = ${sonnetResult.usage?.totalTokens || 0} total`);
  console.log('');
} catch (error) {
  console.error('Error with Claude Sonnet:', error.message);
  console.log('');
}

console.log('✅ Testing complete!');
