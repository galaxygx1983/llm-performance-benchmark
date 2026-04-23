/**
 * LLM Performance Benchmark Script
 * Supports OpenAI-compatible and Anthropic-compatible APIs
 *
 * Metrics measured:
 * - First Token Latency (TTFT)
 * - Time to Last Token (TTLT)
 * - Throughput (tokens/second)
 * - Total Duration
 * - Tokens per Second (TPS)
 */

import readline from 'readline';
import { readFile } from 'fs/promises';

// Configuration
const CONFIG_FILE = './llm-benchmark.config.json';
const DATASET_FILE = '../references/test-datasets.json';

// Default configuration
const defaultConfig = {
  // API Provider: 'openai' | 'anthropic' | 'openai-compatible'
  provider: 'openai-compatible',

  // Base URL for API
  baseURL: '',

  // API Key
  apiKey: '',

  // Model to test
  model: '',

  // Test parameters
  prompt: 'Write a short explanation of how distributed consensus works.',
  maxTokens: 512,
  temperature: 0.7,

  // Number of runs for averaging
  runs: 3,

  // Delay between runs (ms)
  delayBetweenRuns: 2000,

  // Context window (for token estimation)
  contextWindow: 128000,

  // Output limit (for token estimation)
  outputLimit: 4096,

  // Test dataset configuration
  useDataset: false,
  datasetCategory: 'medium_response',
  datasetPromptIds: []
};

// Load or use default config
async function loadConfig() {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { ...defaultConfig };
  }
}

// Load test dataset
async function loadDataset() {
  try {
    const content = await readFile(DATASET_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Display available dataset categories
function displayDatasetCategories(dataset) {
  if (!dataset || !dataset.categories) return;

  console.log('\nAvailable Dataset Categories:');
  console.log('-'.repeat(50));
  for (const [key, cat] of Object.entries(dataset.categories)) {
    console.log(`  ${key}: ${cat.description}`);
    console.log(`    Prompts: ${cat.prompts.length}`);
  }

  if (dataset.standard_benchmarks) {
    console.log('\nStandard Benchmarks:');
    for (const [key, bench] of Object.entries(dataset.standard_benchmarks)) {
      console.log(`  ${key}: ${bench.name}`);
    }
  }
}

// Get prompts from dataset
function getDatasetPrompts(dataset, category, promptIds) {
  if (!dataset || !dataset.categories) return null;

  const cat = dataset.categories[category];
  if (!cat) return null;

  if (promptIds && promptIds.length > 0) {
    return cat.prompts.filter(p => promptIds.includes(p.id));
  }
  return cat.prompts;
}

// Prompt for configuration
function promptConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const questions = [
      { key: 'provider', question: 'Provider (openai-compatible/anthropic/openai): ' },
      { key: 'baseURL', question: 'Base URL: ' },
      { key: 'apiKey', question: 'API Key: ' },
      { key: 'model', question: 'Model: ' }
    ];

    const config = { ...defaultConfig };
    let index = 0;

    function askNext() {
      if (index >= questions.length) {
        rl.close();
        resolve(config);
        return;
      }
      const q = questions[index++];
      rl.question(q.question, (answer) => {
        if (answer.trim()) {
          config[q.key] = answer.trim();
        }
        askNext();
      });
    }

    askNext();
  });
}

// Count tokens (approximate: 1 token ≈ 4 characters for English, less for Chinese)
function estimateTokens(text) {
  // More accurate estimation: ~1.3 tokens per word for English
  // Chinese is roughly 1.5-2 tokens per character
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const otherChars = text.length - englishWords.join('').length - chineseChars.join('').length;

  const englishTokens = englishWords.length * 1.3;
  const chineseTokens = chineseChars.length * 1.5;
  const otherTokens = otherChars / 4;

  return Math.round(englishTokens + chineseTokens + otherTokens);
}

// Parse streaming response for different API formats
function parseDelta(parsed) {
  // OpenAI format: choices[0].delta.content
  if (parsed.choices && parsed.choices[0]?.delta?.content) {
    return parsed.choices[0].delta.content;
  }

  // Anthropic format: delta.text
  if (parsed.delta?.text) {
    return parsed.delta.text;
  }

  // OpenAI non-streaming: choices[0].message.content
  if (parsed.choices && parsed.choices[0]?.message?.content) {
    return parsed.choices[0].message.content;
  }

  return '';
}

// Build request headers based on provider
function buildHeaders(config) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    // OpenAI and OpenAI-compatible
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

// Build request body based on provider
function buildRequestBody(config) {
  if (config.provider === 'anthropic') {
    return {
      model: config.model,
      messages: [{ role: 'user', content: config.prompt }],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true
    };
  } else {
    // OpenAI and OpenAI-compatible
    return {
      model: config.model,
      messages: [{ role: 'user', content: config.prompt }],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true
    };
  }
}

// Build streaming endpoint
function buildEndpoint(config) {
  if (config.provider === 'anthropic') {
    return `${config.baseURL}/v1/messages`;
  } else {
    return `${config.baseURL}/chat/completions`;
  }
}

// Run benchmark for streaming response
async function benchmarkStreaming(config) {
  const startTime = Date.now();
  let firstTokenTime = null;
  let lastTokenTime = null;
  let totalTokens = 0;
  let fullText = '';

  const response = await fetch(buildEndpoint(config), {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(buildRequestBody(config))
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parseDelta(parsed);

          if (content && content.length > 0) {
            if (firstTokenTime === null) {
              firstTokenTime = Date.now();
            }
            lastTokenTime = Date.now();
            fullText += content;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  totalTokens = estimateTokens(fullText);

  return {
    firstTokenLatency: firstTokenTime ? (firstTokenTime - startTime) / 1000 : null,
    timeToLastToken: lastTokenTime ? (lastTokenTime - startTime) / 1000 : null,
    totalTokens,
    duration,
    throughput: duration > 0 && totalTokens > 0 ? Math.round(totalTokens / duration) : null,
    tokensPerSecond: duration > 0 && totalTokens > 0 ? (totalTokens / duration).toFixed(2) : null,
    timePerToken: totalTokens > 0 ? (duration * 1000 / totalTokens).toFixed(2) : null,
    fullText: fullText.substring(0, 200) + (fullText.length > 200 ? '...' : '')
  };
}

// Run non-streaming benchmark for comparison
async function benchmarkNonStreaming(config) {
  const startTime = Date.now();

  const body = buildRequestBody(config);
  body.stream = false;

  const response = await fetch(buildEndpoint(config), {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const endTime = Date.now();

  const content = parseDelta(data);
  const totalTokens = estimateTokens(content);
  const duration = (endTime - startTime) / 1000;

  return {
    totalLatency: duration,
    totalTokens,
    throughput: duration > 0 && totalTokens > 0 ? Math.round(totalTokens / duration) : null,
    tokensPerSecond: duration > 0 && totalTokens > 0 ? (totalTokens / duration).toFixed(2) : null,
    fullText: content.substring(0, 200) + (content.length > 200 ? '...' : '')
  };
}

// Run single benchmark iteration
async function runIteration(config, iteration, promptInfo = null) {
  const iterationLabel = promptInfo ? `${promptInfo.name} [${iteration + 1}/${config.runs}]` : `Run ${iteration + 1}/${config.runs}`;
  console.log(`\n--- ${iterationLabel} ---`);

  if (promptInfo) {
    console.log(`Prompt: "${promptInfo.prompt.substring(0, 60)}..."`);
    console.log(`Expected tokens: ~${promptInfo.expectedTokens}`);
  }

  try {
    // Streaming benchmark
    const streamingResult = await benchmarkStreaming(config);

    console.log(`✓ Streaming Test Complete`);
    if (streamingResult.firstTokenLatency) {
      console.log(`  First Token Latency (TTFT): ${streamingResult.firstTokenLatency.toFixed(3)}s`);
    }
    console.log(`  Time to Last Token (TTLT): ${streamingResult.timeToLastToken?.toFixed(3)}s`);
    console.log(`  Output Tokens: ~${streamingResult.totalTokens}`);
    console.log(`  Throughput: ${streamingResult.throughput || 'N/A'} tokens/s`);
    console.log(`  Time per Token: ${streamingResult.timePerToken || 'N/A'} ms`);

    // Delay before non-streaming test
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Non-streaming benchmark
    const nonStreamingResult = await benchmarkNonStreaming(config);

    console.log(`\n✓ Non-Streaming Test Complete`);
    console.log(`  Total Latency: ${nonStreamingResult.totalLatency.toFixed(3)}s`);
    console.log(`  Output Tokens: ~${nonStreamingResult.totalTokens}`);
    console.log(`  Throughput: ${nonStreamingResult.throughput || 'N/A'} tokens/s`);

    return {
      streaming: streamingResult,
      nonStreaming: nonStreamingResult,
      promptInfo
    };
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return { error: error.message, promptInfo };
  }
}

// Calculate statistics
function calculateStats(results) {
  const validResults = results.filter(r => !r.error);

  if (validResults.length === 0) {
    return null;
  }

  const stats = {
    runs: validResults.length,
    streaming: {},
    nonStreaming: {},
    byPrompt: {}
  };

  // Calculate overall streaming stats
  const ttftValues = validResults.map(r => r.streaming.firstTokenLatency).filter(v => v !== null);
  const ttltValues = validResults.map(r => r.streaming.timeToLastToken).filter(v => v !== null);
  const throughputValues = validResults.map(r => r.streaming.throughput).filter(v => v !== null);

  if (ttftValues.length > 0) {
    stats.streaming.firstTokenLatency = {
      min: Math.min(...ttftValues),
      max: Math.max(...ttftValues),
      avg: ttftValues.reduce((a, b) => a + b, 0) / ttftValues.length
    };
  }

  if (ttltValues.length > 0) {
    stats.streaming.timeToLastToken = {
      min: Math.min(...ttltValues),
      max: Math.max(...ttltValues),
      avg: ttltValues.reduce((a, b) => a + b, 0) / ttltValues.length
    };
  }

  if (throughputValues.length > 0) {
    stats.streaming.throughput = {
      min: Math.min(...throughputValues),
      max: Math.max(...throughputValues),
      avg: Math.round(throughputValues.reduce((a, b) => a + b, 0) / throughputValues.length)
    };
  }

  // Calculate non-streaming stats
  const latencyValues = validResults.map(r => r.nonStreaming.totalLatency);
  const nsThroughputValues = validResults.map(r => r.nonStreaming.throughput).filter(v => v !== null);

  if (latencyValues.length > 0) {
    stats.nonStreaming.totalLatency = {
      min: Math.min(...latencyValues),
      max: Math.max(...latencyValues),
      avg: latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length
    };
  }

  if (nsThroughputValues.length > 0) {
    stats.nonStreaming.throughput = {
      min: Math.min(...nsThroughputValues),
      max: Math.max(...nsThroughputValues),
      avg: Math.round(nsThroughputValues.reduce((a, b) => a + b, 0) / nsThroughputValues.length)
    };
  }

  // Calculate per-prompt stats if using dataset
  const promptGroups = {};
  validResults.forEach(r => {
    if (r.promptInfo) {
      const pid = r.promptInfo.id;
      if (!promptGroups[pid]) {
        promptGroups[pid] = {
          name: r.promptInfo.name,
          results: []
        };
      }
      promptGroups[pid].results.push(r);
    }
  });

  for (const [pid, group] of Object.entries(promptGroups)) {
    const ttft = group.results.map(r => r.streaming.firstTokenLatency).filter(v => v !== null);
    const ttlt = group.results.map(r => r.streaming.timeToLastToken).filter(v => v !== null);
    const tput = group.results.map(r => r.streaming.throughput).filter(v => v !== null);

    stats.byPrompt[pid] = {
      name: group.name,
      ttft: ttft.length > 0 ? {
        min: Math.min(...ttft),
        max: Math.max(...ttft),
        avg: ttft.reduce((a, b) => a + b, 0) / ttft.length
      } : null,
      ttlt: ttlt.length > 0 ? {
        min: Math.min(...ttlt),
        max: Math.max(...ttlt),
        avg: ttlt.reduce((a, b) => a + b, 0) / ttlt.length
      } : null,
      throughput: tput.length > 0 ? {
        min: Math.min(...tput),
        max: Math.max(...tput),
        avg: Math.round(tput.reduce((a, b) => a + b, 0) / tput.length)
      } : null
    };
  }

  return stats;
}

// Print summary
function printSummary(config, stats, prompts = null) {
  console.log('\n' + '═'.repeat(70));
  console.log('  BENCHMARK SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\nModel: ${config.model}`);
  console.log(`Provider: ${config.provider}`);
  console.log(`Base URL: ${config.baseURL}`);
  if (config.useDataset) {
    console.log(`Dataset Category: ${config.datasetCategory}`);
  } else {
    console.log(`Prompt: "${config.prompt.substring(0, 50)}..."`);
  }
  console.log(`Max Tokens: ${config.maxTokens}`);
  console.log(`Temperature: ${config.temperature}`);
  console.log(`Runs: ${stats.runs}`);

  console.log('\n--- Streaming Results (Overall) ---');
  if (stats.streaming.firstTokenLatency) {
    console.log(`First Token Latency (TTFT):`);
    console.log(`  Min: ${stats.streaming.firstTokenLatency.min.toFixed(3)}s`);
    console.log(`  Max: ${stats.streaming.firstTokenLatency.max.toFixed(3)}s`);
    console.log(`  Avg: ${stats.streaming.firstTokenLatency.avg.toFixed(3)}s`);
  }

  if (stats.streaming.timeToLastToken) {
    console.log(`Time to Last Token (TTLT):`);
    console.log(`  Min: ${stats.streaming.timeToLastToken.min.toFixed(3)}s`);
    console.log(`  Max: ${stats.streaming.timeToLastToken.max.toFixed(3)}s`);
    console.log(`  Avg: ${stats.streaming.timeToLastToken.avg.toFixed(3)}s`);
  }

  if (stats.streaming.throughput) {
    console.log(`Throughput (tokens/s):`);
    console.log(`  Min: ${stats.streaming.throughput.min}`);
    console.log(`  Max: ${stats.streaming.throughput.max}`);
    console.log(`  Avg: ${stats.streaming.throughput.avg}`);
  }

  // Print per-prompt breakdown if available
  if (Object.keys(stats.byPrompt).length > 0) {
    console.log('\n--- Results by Prompt ---');
    for (const [pid, data] of Object.entries(stats.byPrompt)) {
      console.log(`\n${data.name} (${pid}):`);
      if (data.ttft) {
        console.log(`  TTFT: min=${data.ttft.min.toFixed(3)}s, max=${data.ttft.max.toFixed(3)}s, avg=${data.ttft.avg.toFixed(3)}s`);
      }
      if (data.throughput) {
        console.log(`  Throughput: min=${data.throughput.min}, max=${data.throughput.max}, avg=${data.throughput.avg} tokens/s`);
      }
    }
  }

  console.log('\n--- Non-Streaming Results ---');
  if (stats.nonStreaming.totalLatency) {
    console.log(`Total Latency:`);
    console.log(`  Min: ${stats.nonStreaming.totalLatency.min.toFixed(3)}s`);
    console.log(`  Max: ${stats.nonStreaming.totalLatency.max.toFixed(3)}s`);
    console.log(`  Avg: ${stats.nonStreaming.totalLatency.avg.toFixed(3)}s`);
  }

  if (stats.nonStreaming.throughput) {
    console.log(`Effective Throughput (tokens/s):`);
    console.log(`  Min: ${stats.nonStreaming.throughput.min}`);
    console.log(`  Max: ${stats.nonStreaming.throughput.max}`);
    console.log(`  Avg: ${stats.nonStreaming.throughput.avg}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('Metrics Legend:');
  console.log('  TTFT = Time To First Token (首Token延迟)');
  console.log('  TTLT = Time To Last Token (最后一个Token的时间)');
  console.log('  Throughput = tokens generated per second (吞吐量)');
  console.log('  Token count is estimated (~1.3 words/token for English)');
  console.log('═'.repeat(70) + '\n');
}

// Main function
async function main() {
  console.log('\n' + '█'.repeat(60));
  console.log('  LLM Performance Benchmark');
  console.log('  OpenAI & Anthropic Compatible');
  console.log('  + Dataset Support');
  console.log('█'.repeat(60));

  // Load configuration and dataset
  let config = await loadConfig();
  const dataset = await loadDataset();

  // Show dataset categories if available
  if (dataset) {
    console.log('\n[Test Dataset Available]');
    displayDatasetCategories(dataset);
  }

  // Check if user wants to use dataset
  if (dataset && !config.useDataset) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\nWould you like to use a test dataset? (y/n): ');
    config.useDataset = await new Promise(resolve => {
      rl.question('', answer => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  // If using dataset, get prompts
  let datasetPrompts = [];
  if (config.useDataset && dataset) {
    console.log(`\nUsing dataset category: ${config.datasetCategory}`);
    datasetPrompts = getDatasetPrompts(dataset, config.datasetCategory, config.datasetPromptIds);

    if (!datasetPrompts || datasetPrompts.length === 0) {
      console.error(`No prompts found for category: ${config.datasetCategory}`);
      console.log('Available categories:', Object.keys(dataset.categories).join(', '));
      return;
    }

    console.log(`Found ${datasetPrompts.length} prompts to test`);
    console.log('Prompts:');
    datasetPrompts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.id}) - expected ~${p.expectedTokens} tokens`);
    });
  }

  // If no baseURL, prompt for configuration
  if (!config.baseURL || !config.apiKey || !config.model) {
    console.log('\n--- Configuration Required ---');
    config = { ...config, ...(await promptConfig()) };
  }

  console.log(`\nTesting Model: ${config.model}`);
  console.log(`Provider: ${config.provider}`);
  console.log(`Base URL: ${config.baseURL}`);
  console.log(`Runs: ${config.runs}`);

  const results = [];

  if (config.useDataset && datasetPrompts.length > 0) {
    // Run benchmark for each prompt in dataset
    for (const promptInfo of datasetPrompts) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing: ${promptInfo.name}`);
      console.log(`${'='.repeat(60)}`);

      // Create config for this prompt
      const promptConfig = {
        ...config,
        prompt: promptInfo.prompt,
        maxTokens: promptInfo.maxTokens || config.maxTokens
      };

      for (let i = 0; i < config.runs; i++) {
        const result = await runIteration(promptConfig, i, promptInfo);
        results.push(result);

        if (i < config.runs - 1) {
          console.log(`\nWaiting ${config.delayBetweenRuns / 1000}s before next run...`);
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenRuns));
        }
      }
    }
  } else {
    // Single prompt mode (original behavior)
    for (let i = 0; i < config.runs; i++) {
      const result = await runIteration(config, i);
      results.push(result);

      if (i < config.runs - 1) {
        console.log(`\nWaiting ${config.delayBetweenRuns / 1000}s before next run...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenRuns));
      }
    }
  }

  // Calculate and print statistics
  const stats = calculateStats(results);

  if (stats) {
    printSummary(config, stats, datasetPrompts);
  } else {
    console.error('\n✗ All runs failed. Check your configuration.');
  }
}

// Export for programmatic use
export { benchmarkStreaming, benchmarkNonStreaming, estimateTokens, loadDataset };

// Run if executed directly
main().catch(console.error);
