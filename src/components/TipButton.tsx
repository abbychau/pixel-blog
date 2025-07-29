'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Send, X } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface TipButtonProps {
  articleId: number;
  authorId: number;
  authorName: string;
  onTipSent?: () => void;
}

export default function TipButton({ articleId, authorId, authorName, onTipSent }: TipButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const { user: firebaseUser } = useFirebaseAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();

  // Check if current user is the author (hide button if so)
  useEffect(() => {
    const checkCurrentUser = async () => {
      if (firebaseUser) {
        try {
          const response = await authenticatedFetch('/api/auth/user-info');
          if (response.ok) {
            const data = await response.json();
            setCurrentUserId(data.user.id);
          }
        } catch (error) {
          console.error('Failed to get current user:', error);
        }
      } else {
        setCurrentUserId(null);
      }
    };

    checkCurrentUser();
  }, [firebaseUser, authenticatedFetch]);

  const handleOpenModal = async () => {
    if (!firebaseUser) {
      setError('Please log in to send tips');
      return;
    }

    // Get current user info and balance
    try {
      const response = await authenticatedFetch('/api/auth/user-info');
      if (response.ok) {
        const data = await response.json();
        const userId = data.user.id;
        
        // Check if trying to tip themselves
        if (userId === authorId) {
          setError('You cannot tip yourself');
          return;
        }
        
        setCurrentUserId(userId);
        setCurrentBalance(data.user.currency1 || 0);
        setShowModal(true);
        setError('');
        setSuccess('');
      }
    } catch (error) {
      setError('Failed to load balance');
    }
  };

  const handleSendTip = async () => {
    if (!firebaseUser) {
      setError('Please log in to send tips');
      return;
    }

    if (amount < 10) {
      setError('Minimum tip amount is 10 M-Coin');
      return;
    }

    if (currentBalance !== null && amount > currentBalance) {
      setError(`Insufficient M-Coin balance. You have ${currentBalance} M-Coin.`);
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_id: articleId,
          to_user_id: authorId,
          amount: amount,
          message: message.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully sent ${amount} M-Coin to ${authorName}!`);
        setCurrentBalance(data.balances.sender);
        setAmount(10);
        setMessage('');
        
        // Call callback to refresh tips display
        if (onTipSent) {
          onTipSent();
        }

        // Close modal after a delay
        setTimeout(() => {
          setShowModal(false);
          setSuccess('');
        }, 2000);
      } else {
        setError(data.error || 'Failed to send tip');
      }
    } catch (error) {
      console.error('Error sending tip:', error);
      setError('Network error occurred');
    } finally {
      setSending(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
    setSuccess('');
    setAmount(10);
    setMessage('');
  };

  const systemFee = Math.floor(amount * 0.1);
  const netAmount = amount - systemFee;

  // Don't show tip button if user is the author
  if (currentUserId === authorId) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-3 py-2 bg-bloomberg-orange text-black font-bold rounded hover:bg-orange-400 transition-colors text-sm"
          title={`Tip ${authorName} with M-Coin`}
        >
          <DollarSign size={16} />
          TIP M-COIN
        </button>
        
        {/* Error display for button-level errors */}
        {error && !showModal && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-red-500/10 border border-red-500 text-red-400 text-xs rounded whitespace-nowrap z-10">
            {error}
          </div>
        )}
      </div>

      {/* Tip Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-bloomberg-orange max-w-md w-full mx-4">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4 border-b border-bloomberg-gray pb-2">
                <h3 className="text-lg font-bold terminal-orange font-mono">
                  TIP M-COIN
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="terminal-gray hover:terminal-orange transition-colors text-xl"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Recipient Info */}
              <div className="mb-4 p-3 border border-bloomberg-gray bg-bloomberg-darkgray/30">
                <div className="text-sm terminal-blue mb-1">TIPPING TO:</div>
                <div className="terminal-yellow font-bold">{authorName.toUpperCase()}</div>
              </div>

              {/* Balance Display */}
              {currentBalance !== null && (
                <div className="mb-4 p-3 border border-bloomberg-gray bg-bloomberg-darkgray/30">
                  <div className="text-sm terminal-blue mb-1">YOUR BALANCE:</div>
                  <div className="terminal-green font-bold font-mono">{currentBalance} M-COIN</div>
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm terminal-blue mb-2">AMOUNT (M-COIN)</label>
                <input
                  type="number"
                  min="10"
                  max={currentBalance || 1000}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 10)}
                  className="w-full bg-black border border-bloomberg-orange text-bloomberg-yellow px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                  disabled={sending}
                />
              </div>

              {/* Fee Breakdown */}
              <div className="mb-4 p-3 border border-bloomberg-gray bg-bloomberg-darkgray/30 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="terminal-blue">Amount:</span>
                    <span className="terminal-yellow ml-2">{amount} M-COIN</span>
                  </div>
                  <div>
                    <span className="terminal-blue">System Fee (10%):</span>
                    <span className="terminal-gray ml-2">{systemFee} M-COIN</span>
                  </div>
                  <div className="col-span-2 border-t border-bloomberg-gray pt-2 mt-2">
                    <span className="terminal-blue">Author Receives:</span>
                    <span className="terminal-green ml-2 font-bold">{netAmount} M-COIN</span>
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="mb-4">
                <label className="block text-sm terminal-blue mb-2">MESSAGE (OPTIONAL)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message for the author..."
                  rows={3}
                  maxLength={200}
                  className="w-full bg-black border border-bloomberg-orange text-bloomberg-yellow px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                  disabled={sending}
                />
                <div className="text-xs terminal-gray mt-1">
                  {message.length}/200 characters
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 p-2 border border-red-500 bg-red-500/10 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-2 border border-green-500 bg-green-500/10 text-green-400 text-sm">
                  {success}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSendTip}
                  disabled={sending || amount < 10 || (currentBalance !== null && amount > currentBalance)}
                  className="flex-1 flex items-center justify-center gap-2 bg-bloomberg-green text-black px-4 py-2 font-bold rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                  {sending ? 'SENDING...' : 'SEND TIP'}
                </button>
                <button
                  onClick={handleCloseModal}
                  disabled={sending}
                  className="px-4 py-2 border border-bloomberg-gray text-bloomberg-gray hover:bg-bloomberg-gray hover:text-black transition-colors rounded"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}