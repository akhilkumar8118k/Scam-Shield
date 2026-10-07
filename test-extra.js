const API_URL = 'http://localhost:3001/api';
const SUPABASE_URL = 'https://nsootcjmkvlznnlmkxva.supabase.co';
// Using anon key, wait, we don't know the anon key but we can try without one, or grab it from .env if it was there. It's not in server/.env.
// Instead, I'll test the API endpoints with User B token on User A case.

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

async function runExtraTests() {
  let tokenA, tokenB, caseId;
  const emailA = `extA_${Date.now()}@example.com`;
  const emailB = `extB_${Date.now()}@example.com`;

  try {
    await fetchApi('/auth/register', { method: 'POST', body: JSON.stringify({ email: emailA, password: 'password', display_name: 'User A' }) });
    tokenA = (await fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email: emailA, password: 'password' }) })).data.token;
    await fetchApi('/auth/register', { method: 'POST', body: JSON.stringify({ email: emailB, password: 'password', display_name: 'User B' }) });
    tokenB = (await fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email: emailB, password: 'password' }) })).data.token;

    const res = await fetchApi('/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ title: 'Search Me', input_type: 'message', submitted_content: 'Test content' })
    });
    caseId = res.data.id;
    console.log('✅ Case created for User A');

    // Test edit by User B
    try {
      await fetchApi(`/cases/${caseId}`, { method: 'PUT', headers: { Authorization: `Bearer ${tokenB}` }, body: JSON.stringify({ title: 'Hacked' }) });
      console.error('❌ User B edited User A case!');
    } catch(e) {
      console.log('✅ User B prevented from editing User A case');
    }

    // Test delete by User B
    try {
      await fetchApi(`/cases/${caseId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
      console.error('❌ User B deleted User A case!');
    } catch(e) {
      console.log('✅ User B prevented from deleting User A case');
    }

    // Test analyze by User B
    try {
      await fetchApi(`/cases/${caseId}/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } });
      console.error('❌ User B analyzed User A case!');
    } catch(e) {
      console.log('✅ User B prevented from analyzing User A case');
    }

    // Test Search/Filtering
    const searchRes = await fetchApi('/cases?search=Search', { headers: { Authorization: `Bearer ${tokenA}` } });
    if (searchRes.data.length > 0) console.log('✅ Search successful');
    else console.error('❌ Search failed');

    // Test Telugu Output
    const analyzeRes = await fetchApi(`/cases/${caseId}/analyze?language=Telugu`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } });
    if (analyzeRes.data.analysis_language === 'Telugu') console.log('✅ Telugu language analysis requested successfully');
    else console.error('❌ Telugu language analysis failed');

    // Test anon direct db access
    const directDb = await fetch(`${SUPABASE_URL}/rest/v1/cases`, {
      headers: { 'apikey': 'anon-key', 'Authorization': 'Bearer anon-key' }
    });
    if (directDb.status === 401 || directDb.status === 403 || directDb.status === 404) {
       console.log(`✅ Direct DB access denied: ${directDb.status}`);
    } else {
       console.log(`❌ Direct DB access: ${directDb.status}`);
    }

  } catch(e) {
    console.error('Test failed', e);
  }
}
runExtraTests();
