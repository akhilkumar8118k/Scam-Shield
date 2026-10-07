const API_URL = 'http://localhost:3001/api';

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

async function runTests() {
  let userA = null;
  let tokenA = null;
  let userB = null;
  let tokenB = null;
  let caseId = null;
  
  console.log('--- ScamShield Integration Tests ---');

  // 0. Health
  try {
    const health = await fetchApi('/health');
    console.log('✅ Health check passed', health.data);
  } catch (e) {
    console.error('❌ Health check failed', e.message);
    return;
  }

  // 1. Auth & Profiles
  try {
    const emailA = `testA_${Date.now()}@example.com`;
    const emailB = `testB_${Date.now()}@example.com`;
    
    // Register A
    let res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: emailA, password: 'password123', display_name: 'User A' })
    });
    console.log('✅ Registered User A');

    // Login A
    res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailA, password: 'password123' })
    });
    tokenA = res.data.token;
    console.log('✅ Logged in User A');

    // Register B
    await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: emailB, password: 'password123', display_name: 'User B' })
    });
    console.log('✅ Registered User B');

    // Login B
    res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailB, password: 'password123' })
    });
    tokenB = res.data.token;
    console.log('✅ Logged in User B');

    // Update Profile A
    res = await fetchApi('/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ display_name: 'User A Updated' })
    });
    if (res.data.display_name === 'User A Updated') {
      console.log('✅ Profile Update successful');
    } else {
      throw new Error('Profile update mismatch');
    }
  } catch (e) {
    console.error('❌ Auth/Profile testing failed', e.message);
    return;
  }

  // 2. Case CRUD & Search
  try {
    // Create
    let res = await fetchApi('/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: 'Test Case 1',
        input_type: 'message',
        submitted_content: 'Send me your OTP now!',
        user_notes: 'Got this via SMS'
      })
    });
    caseId = res.data.id;
    console.log('✅ Created Case for User A');

    // View
    res = await fetchApi(`/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (res.data.id === caseId) console.log('✅ Fetched Case Details');

    // Search/List
    res = await fetchApi('/cases', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (res.data.find(c => c.id === caseId)) console.log('✅ Case listed in Dashboard');

    // Edit (partial)
    res = await fetchApi(`/cases/${caseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ user_notes: 'Updated note' })
    });
    if (res.data.user_notes === 'Updated note') console.log('✅ Edited Case');
  } catch (e) {
    console.error('❌ Case CRUD testing failed', e.message);
  }

  // 3. AI Analysis & 4. Reanalysis
  try {
    let res = await fetchApi(`/cases/${caseId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('✅ AI Analysis completed:', res.data.assessment);
    
    // Check if it persists
    res = await fetchApi(`/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (res.data.analyses && res.data.analyses.length === 1) {
       console.log('✅ AI Analysis result persisted');
    }

    // Edit content (triggers outdated)
    await fetchApi(`/cases/${caseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ submitted_content: 'Different content to trigger outdated' })
    });
    
    // Verify outdated
    res = await fetchApi(`/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (res.data.analyses[0].is_outdated === true) {
      console.log('✅ Previous analysis correctly marked as outdated after content edit');
    }

    // Reanalyze
    res = await fetchApi(`/cases/${caseId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('✅ Re-Analysis completed:', res.data.assessment);

    // Verify history retained
    res = await fetchApi(`/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (res.data.analyses.length === 2) {
      console.log('✅ Analysis history preserved correctly');
    }

  } catch (e) {
    console.error('❌ AI Analysis testing failed:', e.message);
  }

  // 5. User Isolation
  try {
    let accessFailed = false;
    try {
      await fetchApi(`/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
    } catch (e) {
      accessFailed = true;
    }
    if (accessFailed) {
      console.log('✅ User Isolation: User B cannot access User A case');
    } else {
      console.error('❌ User Isolation Failed! User B accessed User A case');
    }
  } catch (e) {
    console.error('❌ User Isolation testing failed', e.message);
  }
  
  // Clean up: delete case
  try {
    await fetchApi(`/cases/${caseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('✅ Case deleted successfully');
  } catch (e) {
    console.error('❌ Case deletion failed', e.message);
  }

  // 6. Logout / Session Revocation
  try {
    await fetchApi('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('✅ User A logged out');

    let tokenInvalid = false;
    try {
      await fetchApi('/profile', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (e) {
      tokenInvalid = true;
    }
    if (tokenInvalid) {
      console.log('✅ Session securely revoked');
    } else {
      console.error('❌ Session revocation failed! Token still valid after logout.');
    }
  } catch (e) {
    console.error('❌ Logout testing failed', e.message);
  }

  console.log('--- Test Suite Completed ---');
}

runTests();
