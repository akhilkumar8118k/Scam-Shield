import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';
import type { Case, Analysis } from '../../../server/src/types';
import { AlertTriangle, CheckCircle, Info, ShieldAlert, Trash2, Edit } from 'lucide-react';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<(Case & { analyses: Analysis[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const loadCase = async () => {
    try {
      const data = await fetchApi(`/cases/${id}`);
      setCaseData(data);
      setEditContent(data.submitted_content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      await fetchApi(`/cases/${id}/analyze`, { method: 'POST' });
      await loadCase();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await fetchApi(`/cases/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ submitted_content: editContent })
      });
      setEditing(false);
      await loadCase();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      try {
        await fetchApi(`/cases/${id}`, { method: 'DELETE' });
        navigate('/');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div className="text-center mt-8"><span className="spinner"></span></div>;
  if (!caseData) return <div className="error-message">Case not found.</div>;

  const activeAnalysis = caseData.analyses.find(a => !a.is_outdated);
  const history = caseData.analyses.filter(a => a.is_outdated);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">{caseData.title}</h1>
        <div className="flex gap-2">
            {!analyzing && (
                <button onClick={handleAnalyze} className="btn btn-primary" disabled={editing}>
                    Run Analysis
                </button>
            )}
            <button onClick={handleDelete} className="btn btn-danger">
                <Trash2 size={16} /> Delete
            </button>
        </div>
      </div>
      
      {error && <div className="error-message mb-4">{error}</div>}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:grid-cols-2 card" style={{ gridColumn: 'span 1' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Content Details</h2>
            {!editing ? (
                <button onClick={() => setEditing(true)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>
                    <Edit size={14} />
                </button>
            ) : (
                <div className="flex gap-1">
                    <button onClick={handleUpdate} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem' }}>Save</button>
                    <button onClick={() => { setEditing(false); setEditContent(caseData.submitted_content); }} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Cancel</button>
                </div>
            )}
          </div>
          
          <div className="mb-4">
            <span className="text-sm text-muted">Type:</span> {caseData.input_type}
          </div>
          
          <div className="mb-4">
            <span className="text-sm text-muted block mb-1">Content:</span>
            {editing ? (
                <textarea 
                    className="form-control" 
                    value={editContent} 
                    onChange={e => setEditContent(e.target.value)} 
                    style={{ minHeight: '150px' }}
                />
            ) : (
                <div className="p-3 bg-opacity-50 rounded bg-[#0f172a] text-sm break-words whitespace-pre-wrap font-mono">
                    {caseData.submitted_content}
                </div>
            )}
          </div>

          {caseData.user_notes && (
            <div>
              <span className="text-sm text-muted block mb-1">Notes:</span>
              <p className="text-sm">{caseData.user_notes}</p>
            </div>
          )}
        </div>

        <div className="md:grid-cols-2" style={{ gridColumn: 'span 2' }}>
          <div className="card h-full">
            <h2 className="font-bold mb-4">Evidence Board</h2>
            
            {analyzing ? (
              <div className="text-center py-8">
                <span className="spinner mb-4" style={{ width: '40px', height: '40px' }}></span>
                <p>Analyzing content with AI and programmed checks...</p>
              </div>
            ) : activeAnalysis ? (
              <div>
                <div className="mb-6 pb-4 border-b border-[#334155]">
                    <div className="flex items-center gap-2 mb-2">
                        {activeAnalysis.assessment === 'high_concern' && <ShieldAlert className="text-danger" />}
                        {activeAnalysis.assessment === 'some_concerns' && <AlertTriangle className="text-warning" />}
                        {activeAnalysis.assessment === 'few_signals_detected' && <CheckCircle className="text-success" />}
                        {activeAnalysis.assessment === 'insufficient_evidence' && <Info className="text-muted" />}
                        <span className={`badge badge-${activeAnalysis.assessment}`}>
                            {activeAnalysis.assessment.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <p className="text-lg">{activeAnalysis.summary}</p>
                </div>

                {activeAnalysis.suspicious_findings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-danger mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} /> Suspicious Findings
                    </h3>
                    {activeAnalysis.suspicious_findings.map((f, i) => (
                      <div key={i} className="mb-4">
                        <div className="quote-box">"{f.quote}"</div>
                        <p className="text-sm pl-4 border-l border-[#334155]">
                            <strong>Reason:</strong> {f.reason}
                            <br/><span className="text-xs text-muted">Source: {f.source}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeAnalysis.reassuring_signals.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-success mb-3 flex items-center gap-2">
                        <CheckCircle size={18} /> Reassuring Context
                    </h3>
                    {activeAnalysis.reassuring_signals.map((f, i) => (
                      <div key={i} className="mb-3">
                        <p className="text-sm">"{f.quote}" - {f.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {activeAnalysis.recommended_steps.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Recommended Actions</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                        {activeAnalysis.recommended_steps.map((step, i) => <li key={i}>{step}</li>)}
                    </ul>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-[#334155] text-xs text-muted text-center">
                    AI analysis relies on provided content. Do not consider this a guarantee of safety.
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <p>No analysis run yet.</p>
                <button onClick={handleAnalyze} className="btn btn-primary mt-4">Run Analysis Now</button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {history.length > 0 && (
          <div className="mt-8">
              <h3 className="font-bold mb-4">Analysis History</h3>
              <div className="grid gap-4 md:grid-cols-2">
                  {history.map(h => (
                      <div key={h.id} className="card p-4 opacity-75">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted">{new Date(h.created_at).toLocaleString()}</span>
                            <span className={`badge badge-${h.assessment} text-xs`}>{h.assessment.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-sm line-clamp-2">{h.summary}</p>
                          <div className="text-xs text-muted mt-2">Content changed since this analysis.</div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default CaseDetail;
