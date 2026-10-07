import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../api';

const Profile = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      await fetchApi('/profile', {
        method: 'PUT',
        body: JSON.stringify({ display_name: displayName })
      });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Profile Settings</h1>
      
      <div className="card">
        {message.text && (
          <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-[#ef4444] bg-opacity-20 text-[#ef4444]' : 'bg-[#10b981] bg-opacity-20 text-[#10b981]'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address (Read-only)</label>
            <input 
              type="email" 
              className="form-control bg-opacity-50 cursor-not-allowed" 
              value={user.email} 
              disabled 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
