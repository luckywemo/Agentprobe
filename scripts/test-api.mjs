import http from 'http';

async function testApiDirectly() {
    console.log('📡 Hitting http://localhost:3000/api/admin/review ...');

    const startTime = Date.now();

    const req = http.request('http://localhost:3000/api/admin/review', (res) => {
        let data = '';
        console.log(`Status Code: ${res.statusCode}`);

        res.on('data', (chunk) => { data += chunk; });

        res.on('end', () => {
            const duration = Date.now() - startTime;
            console.log(`⏱️ Duration: ${duration}ms`);
            try {
                const json = JSON.parse(data);
                console.log('📦 Response received. Submissions count:', json.submissions?.length || 0);
                if (json.submissions && json.submissions.length > 0) {
                    console.log('First submission ID:', json.submissions[0].id);
                    console.log('Feedback keys:', Object.keys(json.submissions[0].feedback));
                }
            } catch (e) {
                console.error('❌ Failed to parse JSON:', e.message);
                console.log('Raw data:', data.slice(0, 100));
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Connection Error:', error.message);
    });

    req.end();
}

testApiDirectly();
