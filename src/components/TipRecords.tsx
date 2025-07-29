'use client';

import { useState, useEffect } from 'react';
import { DollarSign, MessageCircle, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import TipButton from './TipButton';

interface Tip {
  id: number;
  article_id: number;
  from_user_id: number;
  to_user_id: number;
  amount: number;
  system_fee: number;
  net_amount: number;
  message: string | null;
  created_at: string;
  from_username: string;
  from_display_name: string;
  from_display_color: string;
  to_username: string;
  to_display_name: string;
  to_display_color: string;
}

interface TipStats {
  total_tips: number;
  total_amount: number;
  total_fees: number;
  total_net: number;
}

interface TipRecordsProps {
  articleId: number;
  refreshTrigger?: number;
  authorId: number;
  authorName: string;
  onTipSent?: () => void;
}

export default function TipRecords({ articleId, refreshTrigger, authorId, authorName, onTipSent }: TipRecordsProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [stats, setStats] = useState<TipStats>({
    total_tips: 0,
    total_amount: 0,
    total_fees: 0,
    total_net: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTips = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tips?article_id=${articleId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTips(data.tips || []);
        setStats(data.stats || {
          total_tips: 0,
          total_amount: 0,
          total_fees: 0,
          total_net: 0
        });
        setError('');
      } else {
        console.error('Failed to fetch tips');
        setError('Failed to load tips');
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
      setError('Error loading tips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, [articleId, refreshTrigger]);

  if (loading) {
    return (
      <div className="bloomberg-panel">
        <div className="terminal-orange">LOADING TIP RECORDS...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bloomberg-panel">
        <div className="text-red-400">ERROR: {error}</div>
      </div>
    );
  }

  return (
    <div className="bloomberg-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="terminal-orange" size={20} />
          <h3 className="text-xl font-bold terminal-orange font-mono tracking-wider">
            TIP_RECORDS
          </h3>
        </div>
        <TipButton
          articleId={articleId}
          authorId={authorId}
          authorName={authorName}
          onTipSent={() => {
            fetchTips(); // Refresh tips immediately
            if (onTipSent) onTipSent(); // Call parent callback
          }}
        />
      </div>

      {/* Stats Summary */}
      {stats.total_tips > 0 && (
        <div className="mb-6 p-4 border border-bloomberg-gray bg-bloomberg-darkgray/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="terminal-green" size={16} />
            <span className="text-sm terminal-green font-mono">STATISTICS</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
            <div>
              <div className="terminal-blue mb-1">TOTAL TIPS</div>
              <div className="terminal-yellow font-bold">{stats.total_tips}</div>
            </div>
            <div>
              <div className="terminal-blue mb-1">TOTAL AMOUNT</div>
              <div className="terminal-yellow font-bold">{stats.total_amount} M-COIN</div>
            </div>
            <div>
              <div className="terminal-blue mb-1">SYSTEM FEES</div>
              <div className="terminal-gray font-bold">{stats.total_fees} M-COIN</div>
            </div>
            <div>
              <div className="terminal-blue mb-1">AUTHOR RECEIVED</div>
              <div className="terminal-green font-bold">{stats.total_net} M-COIN</div>
            </div>
          </div>
        </div>
      )}

      {/* Tips List */}
      {tips.length === 0 ? (
        <div className="text-center py-8 terminal-gray">
          <DollarSign className="mx-auto mb-2 opacity-50" size={24} />
          <div>NO TIPS YET</div>
          <div className="text-xs mt-1">Be the first to support this author!</div>
        </div>
      ) : (
        <div className="space-y-4">
          {tips.map((tip) => (
            <div 
              key={tip.id} 
              className="p-4 border border-bloomberg-gray bg-bloomberg-darkgray/20 hover:bg-bloomberg-darkgray/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Tip Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span 
                      className="font-bold text-sm"
                      style={{ color: tip.from_display_color || 'var(--bloomberg-fallback-user-color)' }}
                    >
                      {tip.from_display_name?.toUpperCase() || tip.from_username?.toUpperCase()}
                    </span>
                    <span className="terminal-gray text-xs">tipped</span>
                    <span className="terminal-orange font-bold font-mono">
                      {tip.amount} M-COIN
                    </span>
                    <span className="terminal-gray text-xs">
                      ({tip.net_amount} after fees)
                    </span>
                  </div>

                  {/* Message */}
                  {tip.message && (
                    <div className="mb-2 p-2 border-l-2 border-bloomberg-blue bg-bloomberg-darkgray/50">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="terminal-blue" size={14} />
                        <span className="text-xs terminal-blue font-mono">MESSAGE</span>
                      </div>
                      <div className="text-sm terminal-yellow">
                        &ldquo;{tip.message}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs terminal-gray font-mono">
                    {formatDate(tip.created_at)}
                  </div>
                </div>

                {/* Amount Display */}
                <div className="text-right">
                  <div className="terminal-green font-bold font-mono text-lg">
                    +{tip.net_amount}
                  </div>
                  <div className="text-xs terminal-green">M-COIN</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Note */}
      {tips.length > 0 && (
        <div className="mt-6 pt-4 border-t border-bloomberg-gray text-xs terminal-gray text-center">
          Tips are processed with a 10% system fee. Authors receive the net amount.
        </div>
      )}
    </div>
  );
}