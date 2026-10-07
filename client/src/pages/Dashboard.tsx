import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { PlusCircle, FileText, Mail, Link as LinkIcon, Search } from 'lucide-react';
import type { Case } from '../../../server/src/types';
import TelegramLogs from '../components/TelegramLogs';

const getIcon = (type: string) => {
  if (type === 'email') return <Mail size={16} />;
  if (type === 'url') return <LinkIcon size={16} />;
  return <FileText size={16} />;
};

const Dashboard = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadCases = async () => {
      try {
        const data = await fetchApi('/cases');
        setCases(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCases();
  }, []);

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Your Cases</h1>
        <Link to="/cases/new" className="btn btn-primary">
          <PlusCircle size={18} /> New Analysis
        </Link>
      </div>

      <div className="card mb-6 flex items-center gap-2" style={{ padding: '0.75rem 1rem' }}>
        <Search size={18} className="text-muted" />
        <input 
          type="text" 
          placeholder="Search cases..." 
          className="form-control" 
          style={{ border: 'none', padding: 0, background: 'transparent' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center"><span className="spinner"></span></div>
      ) : filteredCases.length === 0 ? (
        <div className="card text-center py-8 text-muted">
          <FileText size={48} className="mx-auto mb-4 opacity-50" style={{ margin: '0 auto 1rem' }} />
          <p>No cases found.</p>
          {searchTerm === '' && (
            <Link to="/cases/new" className="btn btn-primary mt-4">
              Create your first case
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCases.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{c.title}</h3>
                <span className={`badge badge-${c.status === 'analyzed' ? 'few_signals_detected' : 'some_concerns'}`}>
                  {c.status}
                </span>
              </div>
              <div className="text-sm text-muted mb-4 flex items-center gap-1">
                {getIcon(c.input_type)} <span style={{ textTransform: 'capitalize' }}>{c.input_type}</span>
                <span style={{ margin: '0 0.5rem' }}>•</span>
                {new Date(c.created_at).toLocaleDateString()}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                 <Link to={`/cases/${c.id}`} className="btn btn-outline" style={{ width: '100%' }}>View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render the Telegram Logs component */}
      <TelegramLogs />
    </div>
  );
};

export default Dashboard;
