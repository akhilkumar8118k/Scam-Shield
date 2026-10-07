import { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { MessageSquare, Search, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TelegramLog {
  id: string;
  chat_id: number;
  message_text: string;
  risk_level: string;
  risk_score: number;
  summary: string;
  created_at: string;
}

const TelegramLogs = () => {
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await fetchApi('/telegram-webhook/logs');
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch Telegram logs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const getRiskIcon = (level: string) => {
    if (level === 'high_concern') return <ShieldAlert size={18} className="text-red-500" />;
    if (level === 'some_concerns') return <AlertTriangle size={18} className="text-yellow-500" />;
    return <ShieldCheck size={18} className="text-green-500" />;
  };

  const getRiskColor = (level: string) => {
    if (level === 'high_concern') return 'bg-red-100 text-red-800 border-red-200';
    if (level === 'some_concerns') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (level === 'few_signals_detected') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterLevel === 'all' || log.risk_level === filterLevel;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} /> Telegram Bot Logs
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="card flex-1 flex items-center gap-2" style={{ padding: '0.75rem 1rem', marginBottom: 0 }}>
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search messages or summaries..." 
            className="form-control" 
            style={{ border: 'none', padding: 0, background: 'transparent' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="form-control card" 
          style={{ padding: '0.75rem 1rem', width: 'auto', marginBottom: 0 }}
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="all">All Risk Levels</option>
          <option value="high_concern">High Concern</option>
          <option value="some_concerns">Some Concerns</option>
          <option value="few_signals_detected">Few Signals</option>
          <option value="insufficient_evidence">Insufficient Evidence</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8"><span className="spinner"></span></div>
      ) : filteredLogs.length === 0 ? (
        <div className="card text-center py-8 text-muted">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-50" style={{ margin: '0 auto 1rem' }} />
          <p>No Telegram reports found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLogs.map(log => (
            <div key={log.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {getRiskIcon(log.risk_level)}
                  <span className={`text-xs font-semibold px-2 py-1 rounded border ${getRiskColor(log.risk_level)}`}>
                    {log.risk_level.replace(/_/g, ' ').toUpperCase()} (Score: {log.risk_score})
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-1 text-muted">Original Message:</h4>
                <p className="p-3 bg-gray-50 rounded text-sm italic border border-gray-100" style={{ whiteSpace: 'pre-wrap' }}>
                  "{log.message_text}"
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-1 text-muted">AI Summary:</h4>
                <p className="text-sm">{log.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TelegramLogs;
