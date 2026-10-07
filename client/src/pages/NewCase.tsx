import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

const NewCase = () => {
  const [title, setTitle] = useState('');
  const [inputType, setInputType] = useState<'message' | 'email' | 'url'>('message');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/cases', {
        method: 'POST',
        body: JSON.stringify({
          title,
          input_type: inputType,
          submitted_content: content,
          user_notes: notes
        })
      });
      navigate(`/cases/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Create New Case</h1>
      
      <div className="card">
        {error && <div className="error-message mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Case Title</label>
            <input 
              type="text" 
              className="form-control" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g., Suspicious Bank SMS"
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Input Type</label>
            <select 
              className="form-control form-select" 
              value={inputType} 
              onChange={(e) => setInputType(e.target.value as any)}
            >
              <option value="message">Text Message / SMS</option>
              <option value="email">Email</option>
              <option value="url">Website URL</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Suspicious Content to Analyze</label>
            <textarea 
              className="form-control" 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              placeholder="Paste the exact text or URL here..."
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your Notes (Optional)</label>
            <textarea 
              className="form-control" 
              style={{ minHeight: '80px' }}
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Any context like sender name, how you received it, etc."
            />
          </div>

          <div className="flex gap-4">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Save Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCase;
