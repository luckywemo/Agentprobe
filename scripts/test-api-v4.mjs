import http from 'http';

async function testApiDirectly() {
    console.log('📡 Hitting http://127.0.0.1:3000/api/admin/review ...');

    const startTime = Date.now();

    const req = http.request('http://127.0.0.1:3000/api/admin/review', (res) => {
        let data = '';
        console.log(`Status Code: ${res.statusCode}`);

        res.on('data', (chunk) => { data += chunk; });

        res.on('end', () => {
            const duration = Date.now() - startTime;
            console.log(`⏱️ Duration: ${duration}ms`);
            try {
                const json = JSON.parse(data);
                console.log('📦 JSON Parse Success!');
                console.log('Submissions count:', json.submissions?.length || 0);
            } catch (e) {
                console.error('❌ Failed to parse JSON:', e.message);
                console.log('Raw data trace:', data.slice(0, 300));
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Connection Error:', error.message);
    });

    req.end();
}

testApiDirectly();
