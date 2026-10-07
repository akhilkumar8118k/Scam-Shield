require('dotenv').config({ path: 'server/.env' });
const API_URL = 'http://localhost:3001/api';
const SUPABASE_URL = process.env.SUPABASE_URL;

async function fetchApi(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (response.status === 204) return { status: 204 };
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return { status: response.status, data };
}

async function runOtpTests() {
  const email = `otp_test_${Date.now()}@example.com`;
  let token;
  let casesToClean = [];

  try {
    await fetchApi('/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'password', display_name: 'OTP Tester' }) });
    token = (await fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'password' }) })).data.token;

    console.log('\n--- OTP Regression Tests ---');
    const scenarios = [
        { name: 'Ordinary OTP', content: 'Please do not share your OTP with anyone.', expectRuleCred: false, expectAiCred: false },
        { name: 'Phishing OTP', content: 'Send me your OTP to complete verification.', expectRuleCred: true, expectAiCred: true },
        { name: 'Mixed OTP', content: 'Do not share your OTP with others; send it to our agent.', expectRuleCred: true, expectAiCred: true },
        { name: 'Unexpected OTP', content: 'Here is your verification code. Use it to log in.', expectRuleCred: false, expectAiCred: false },
        { name: 'Telugu Ordinary', content: 'దయచేసి మీ OTP ని ఎవరితో పంచుకోవద్దు.', expectRuleCred: false, expectAiCred: false }, 
        { name: 'Telugu Phishing', content: 'వెరిఫికేషన్ కోసం మీ OTP ని పంపండి.', expectRuleCred: false, expectAiCred: true } 
    ];

    let allPassed = true;

    for (const s of scenarios) {
        let res = await fetchApi('/cases', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: s.name, input_type: 'message', submitted_content: s.content }) });
        casesToClean.push(res.data.id);
        
        let analyzeRes = await fetchApi(`/cases/${res.data.id}/analyze?language=Telugu`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        
        const findings = analyzeRes.data.suspicious_findings || [];
        const hasRuleCred = findings.some(f => f.source === 'Rule: Credentials');
        const hasAiCred = findings.some(f => f.source === 'AI' && f.reason.toLowerCase().includes('otp')); // Or just checking if it caught something suspicious
        const hasAnySuspicious = findings.length > 0;
        
        let passed = true;
        
        if (s.expectRuleCred && !hasRuleCred) {
             console.error(`❌ ${s.name} failed. Expected Rule: Credentials finding, but got none.`);
             passed = false;
        } else if (!s.expectRuleCred && hasRuleCred) {
             console.error(`❌ ${s.name} failed. Unexpected Rule: Credentials finding.`);
             passed = false;
        }
        
        // For AI detection (especially Telugu phishing)
        if (s.expectAiCred && !hasAnySuspicious) {
             console.error(`❌ ${s.name} failed. Expected AI to detect phishing, but got no suspicious findings.`);
             passed = false;
        }

        // Verify quotes are exact substrings
        for (const f of findings) {
            if (!s.content.includes(f.quote)) {
                console.error(`❌ ${s.name} failed. Evidence quote "${f.quote}" is not an exact substring.`);
                passed = false;
            }
        }

        // Check Telugu output language
        if (analyzeRes.data.analysis_language !== 'Telugu') {
             console.error(`❌ ${s.name} failed. Expected language to be Telugu, but got ${analyzeRes.data.analysis_language}`);
             passed = false;
        } else if (analyzeRes.data.summary && !/[\u0C00-\u0C7F]/.test(analyzeRes.data.summary)) { // Check for Telugu characters
             console.error(`❌ ${s.name} failed. Telugu language requested but no Telugu characters found in summary.`);
             passed = false;
        }

        if (passed) {
            console.log(`✅ ${s.name} passed`);
        } else {
            console.log(`Findings:`, findings);
            allPassed = false;
        }
    }

    // 6. Direct DB Denial Test
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (anonKey) {
        console.log('\n--- Direct DB RLS Test ---');
        // Test reads against known synthetic record
        const directRead = await fetch(`${SUPABASE_URL}/rest/v1/cases`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
        });
        const readBody = await directRead.json().catch(()=>null);
        // Should return empty array for GET if RLS blocks reads, or 403/404/401 depending on setup.
        // A 200 with empty array proves RLS works (row filters out).
        if (directRead.status === 200 && Array.isArray(readBody) && readBody.length === 0) {
            console.log('✅ Direct DB read denied (returned empty array due to RLS)');
        } else if (directRead.status === 403 || directRead.status === 404) {
            console.log(`✅ Direct DB read denied (${directRead.status})`);
        } else if (directRead.status === 401) {
            console.error('❌ Direct DB read failed with 401 (Invalid Key, not RLS)');
            allPassed = false;
        } else {
            console.error(`❌ Direct DB read failed. Status: ${directRead.status}`);
            allPassed = false;
        }

        // Test insert
        const directInsert = await fetch(`${SUPABASE_URL}/rest/v1/cases`, {
            method: 'POST',
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({ title: 'Hacked', input_type: 'message', submitted_content: 'hacked' })
        });
        const insertBody = await directInsert.json().catch(()=>null);
        if (directInsert.status === 401) {
            console.error('❌ Direct DB insert failed with 401 (Invalid Key)');
            allPassed = false;
        } else if (directInsert.status === 403 || directInsert.status === 404 || (insertBody && insertBody.code === '42501')) {
            console.log(`✅ Direct DB insert denied by RLS: ${insertBody?.message || directInsert.status}`);
        } else if (directInsert.status === 201) {
            console.error('❌ Direct DB insert succeeded! RLS failed.');
            allPassed = false;
        } else {
            console.error(`❌ Direct DB insert unexpected result: ${directInsert.status}`);
            allPassed = false;
        }
    } else {
        console.error('\n❌ Direct DB RLS Test Skipped (No SUPABASE_ANON_KEY found in server/.env)');
        allPassed = false;
    }

    if (!allPassed) process.exit(1);

  } catch(e) {
    console.error('Test script failed:', e);
    process.exit(1);
  } finally {
    if (token) {
        for (const cid of casesToClean) {
            await fetchApi(`/cases/${cid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
    }
  }
}
runOtpTests();
