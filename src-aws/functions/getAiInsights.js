// functions/getAiInsights.js

const https = require('https');

exports.handler = async (event) => {
    // CORS headers
    const corsHeaders = {
        'Content-Type':  'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // 1. Parse request body
        const body = JSON.parse(event.body);
        const userPrompt = body.prompt;

        if (!userPrompt) {
            console.error('[ERROR] No prompt provided');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Prompt is required' })
            };
        }

        // 2. Get API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[FATAL ERROR] GEMINI_API_KEY not configured');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'API Key not configured' })
            };
        }

        // 3. Try multiple models with v1 API (ใช้ models ที่มีจริงจาก API)
        const modelsToTry = [
            'gemini-2.5-flash',      // เร็วและประหยัด
            'gemini-2.0-flash',      // สำรอง
            'gemini-2.5-pro'         // แม่นยำที่สุดแต่ช้ากว่า
        ];

        let result = null;
        let usedModel = null;

        for (const model of modelsToTry) {
            try {
                result = await callGeminiAPI(model, userPrompt, apiKey);
                usedModel = model;
                break;
            } catch (error) {
                continue;
            }
        }

        if (!result) {
            throw new Error('All models failed');
        }

        // 4. Extract text from response
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        // 5. Return response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                candidates: [{
                    content: {
                        parts: [{
                            text: text
                        }]
                    }
                }],
                modelUsed: usedModel
            })
        };

    } catch (error) {
        console.error('[FATAL ERROR]', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Helper function to call Gemini API
function callGeminiAPI(model, prompt, apiKey) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8 ',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {

            res.setEncoding('utf8');

            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonData);
                    } else {
                        reject(new Error(jsonData.error?.message || `HTTP ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}