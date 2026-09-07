const https = require('https');
const http = require('http');
const { URL } = require('url');

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  timeout: 120000
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  timeout: 120000
});

function requestJson({ url, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const reqHeaders = {
      'User-Agent': 'Astra-OpenCode-CLI/1.0',
      'Connection': 'keep-alive',
      ...headers
    };

    let bodyStr = null;
    if (body) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: reqHeaders,
      agent: parsed.protocol === 'https:' ? httpsAgent : httpAgent
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: json });
          } else {
            resolve({
              statusCode: res.statusCode,
              error: json.error || json.message || data,
              data: json
            });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data });
          } else {
            resolve({ statusCode: res.statusCode, error: data });
          }
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function getWhoami(apiKey, baseUrl = 'https://api.experientiallabs.ai') {
  const url = `${baseUrl.replace(/\/$/, '')}/api/whoami`;
  const res = await requestJson({
    url,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (res.error) {
    throw new Error(`Falha na autenticação whoami (${res.statusCode}): ${JSON.stringify(res.error)}`);
  }
  return res.data;
}

async function getModels(apiKey, baseUrl = 'https://api.experientiallabs.ai') {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/models`;
  const res = await requestJson({
    url,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (res.error) {
    throw new Error(`Erro ao buscar modelos (${res.statusCode}): ${JSON.stringify(res.error)}`);
  }
  return res.data?.data || [];
}

function streamChatCompletion({
  apiKey,
  baseUrl = 'https://api.experientiallabs.ai',
  model,
  messages,
  tools,
  onDelta,
  onToolDelta,
  signal
}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`);
    const lib = parsed.protocol === 'https:' ? https : http;

    const payload = {
      model,
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: 8192
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const bodyStr = JSON.stringify(payload);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': 'Astra-OpenCode-CLI/1.0',
        'Connection': 'keep-alive'
      },
      agent: parsed.protocol === 'https:' ? httpsAgent : httpAgent
    };

    const req = lib.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', c => errData += c);
        res.on('end', () => {
          try {
            const parsedErr = JSON.parse(errData);
            reject(new Error(parsedErr.error?.message || errData));
          } catch (e) {
            reject(new Error(`HTTP ${res.statusCode}: ${errData}`));
          }
        });
        return;
      }

      let buffer = '';
      let accumulatedContent = '';
      const accumulatedToolCalls = [];
      let finishReason = null;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep unfinished line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              const choice = data.choices?.[0];
              if (!choice) continue;

              if (choice.finish_reason) {
                finishReason = choice.finish_reason;
              }

              const delta = choice.delta;
              if (!delta) continue;

              // Texto streaming
              if (delta.content) {
                accumulatedContent += delta.content;
                if (onDelta) {
                  onDelta(delta.content);
                }
              }

              // Tool calls streaming
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index !== undefined ? tc.index : accumulatedToolCalls.length;
                  if (!accumulatedToolCalls[idx]) {
                    accumulatedToolCalls[idx] = {
                      id: tc.id || `call_${Date.now()}_${idx}`,
                      type: 'function',
                      function: {
                        name: tc.function?.name || '',
                        arguments: tc.function?.arguments || ''
                      }
                    };
                  } else {
                    if (tc.id) accumulatedToolCalls[idx].id = tc.id;
                    if (tc.function?.name) accumulatedToolCalls[idx].function.name += tc.function.name;
                    if (tc.function?.arguments) accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                  }

                  if (onToolDelta) {
                    onToolDelta(accumulatedToolCalls[idx], tc);
                  }
                }
              }
            } catch (err) {
              // Ignore line parse error
            }
          }
        }
      });

      res.on('end', () => {
        const filteredToolCalls = accumulatedToolCalls.filter(tc => tc && tc.function);
        resolve({
          content: accumulatedContent,
          tool_calls: filteredToolCalls.length > 0 ? filteredToolCalls : null,
          finish_reason: finishReason
        });
      });

      res.on('error', reject);
    });

    req.setTimeout(120000, () => {
      req.destroy(new Error('Tempo limite de requisição atingido (Timeout 120s)'));
    });

    req.on('error', reject);
    if (signal) {
      signal.addEventListener('abort', () => req.destroy());
    }
    req.write(bodyStr);
    req.end();
  });
}

module.exports = {
  getWhoami,
  getModels,
  streamChatCompletion
};
