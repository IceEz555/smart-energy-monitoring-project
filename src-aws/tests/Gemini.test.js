// test-gemini.js
// ไฟล์ทดสอบ Gemini API ในเครื่อง
const https = require('https');

const API_KEY = 'AIzaSyBuV3VA2CR5Aj-Y--W6SoQSvOo4kiQ0XBM';
const MODEL = 'gemini-1.5-flash';

function callGemini(prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Response:', data.substring(0, 500));

                try {
                    const json = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(json);
                    } else {
                        reject(new Error(JSON.stringify(json, null, 2)));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON: ' + data));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ทดสอบ
(async () => {
    try {
        console.log('Testing Gemini API...\n');

        const result = await callGemini('สวัสดีครับ ช่วยแนะนำวิธีประหยัดไฟ 3 ข้อ');

        console.log('\n✅ SUCCESS!\n');
        console.log('Full Response Structure:');
        console.log(JSON.stringify(result, null, 2));

        if (result.candidates && result.candidates[0]) {
            const text = result.candidates[0].content?.parts?.[0]?.text;
            console.log('\n📝 Extracted Text:');
            console.log(text);
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
})();