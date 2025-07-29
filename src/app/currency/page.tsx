'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import { Save, DollarSign } from 'lucide-react';

interface CurrencySettings {
  currency_url_slug_cost: string;
  currency_registration_bonus: string;
  currency_daily_login_bonus: string;
}

export default function CurrencySettingsPage() {
  const [settings, setSettings] = useState<CurrencySettings>({
    currency_url_slug_cost: '5',
    currency_registration_bonus: '10', 
    currency_daily_login_bonus: '1'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const router = useRouter();

  useDynamicTitle('Currency Settings', { showUser: true, showNotifications: true });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
      return;
    }

    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin, authLoading, router]);

  const fetchSettings = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/system-settings');
      if (response.ok) {
        const allSettings = await response.json();
        const currencySettings: CurrencySettings = {
          currency_url_slug_cost: '5',
          currency_registration_bonus: '10',
          currency_daily_login_bonus: '1'
        };

        allSettings.forEach((setting: any) => {
          if (setting.key in currencySettings) {
            currencySettings[setting.key as keyof CurrencySettings] = setting.value;
          }
        });

        setSettings(currencySettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await authenticatedFetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Currency settings updated successfully!' });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof CurrencySettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (authLoading || loading) {
    return (
      <AuthenticatedLayout requireAdmin={true} titlePrefix="Currency Settings" currentPage="currency">
        <div className="p-8">
          <div className="terminal-orange">LOADING CURRENCY SETTINGS...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AuthenticatedLayout requireAdmin={true} titlePrefix="Currency Settings" currentPage="currency">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <DollarSign className="terminal-orange" size={24} />
            <h1 className="text-2xl font-bold terminal-orange tracking-wider font-mono">
              CURRENCY_SETTINGS
            </h1>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bloomberg-panel">
          <div className="flex items-center gap-2 mb-6 text-sm font-mono">
            <span className="terminal-green">$</span>
            <span className="terminal-orange">configure</span>
            <span className="terminal-blue">--currency-system</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Slug Cost */}
            <div className="space-y-2">
              <label className="block text-sm font-mono font-bold terminal-yellow">
                URL Slug Cost
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.currency_url_slug_cost}
                  onChange={(e) => handleInputChange('currency_url_slug_cost', e.target.value)}
                  className="bg-bloomberg-darkgray border border-bloomberg-gray text-bloomberg-yellow px-3 py-2 rounded font-mono text-sm focus:border-bloomberg-orange focus:outline-none"
                  required
                />
                <span className="text-xs terminal-gray">
                  M-Coin cost for users to set custom URL slugs (admins exempt)
                </span>
              </div>
            </div>

            {/* Registration Bonus */}
            <div className="space-y-2">
              <label className="block text-sm font-mono font-bold terminal-yellow">
                Registration Bonus
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={settings.currency_registration_bonus}
                  onChange={(e) => handleInputChange('currency_registration_bonus', e.target.value)}
                  className="bg-bloomberg-darkgray border border-bloomberg-gray text-bloomberg-yellow px-3 py-2 rounded font-mono text-sm focus:border-bloomberg-orange focus:outline-none"
                  required
                />
                <span className="text-xs terminal-gray">
                  M-Coin amount given to new users upon registration
                </span>
              </div>
            </div>

            {/* Daily Login Bonus */}
            <div className="space-y-2">
              <label className="block text-sm font-mono font-bold terminal-yellow">
                Daily Login Bonus
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={settings.currency_daily_login_bonus}
                  onChange={(e) => handleInputChange('currency_daily_login_bonus', e.target.value)}
                  className="bg-bloomberg-darkgray border border-bloomberg-gray text-bloomberg-yellow px-3 py-2 rounded font-mono text-sm focus:border-bloomberg-orange focus:outline-none"
                  required
                />
                <span className="text-xs terminal-gray">
                  M-Coin amount given for daily login (once per day)
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-4 border-t border-bloomberg-gray">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-bloomberg-orange text-black font-bold rounded hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saving ? 'SAVING...' : 'SAVE SETTINGS'}
              </button>

              {message && (
                <div className={`text-sm font-mono ${
                  message.type === 'success' ? 'terminal-green' : 'text-red-400'
                }`}>
                  {message.text}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Current Values Preview */}
        <div className="bloomberg-panel">
          <div className="flex items-center gap-2 mb-4 text-sm font-mono">
            <span className="terminal-green">$</span>
            <span className="terminal-orange">preview</span>
            <span className="terminal-blue">--current-values</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
            <div className="bg-bloomberg-darkgray p-3 rounded">
              <div className="terminal-blue mb-1">URL_SLUG_COST</div>
              <div className="terminal-yellow text-lg font-bold">{settings.currency_url_slug_cost}</div>
            </div>
            <div className="bg-bloomberg-darkgray p-3 rounded">
              <div className="terminal-blue mb-1">REGISTRATION_BONUS</div>
              <div className="terminal-green text-lg font-bold">{settings.currency_registration_bonus}</div>
            </div>
            <div className="bg-bloomberg-darkgray p-3 rounded">
              <div className="terminal-blue mb-1">DAILY_LOGIN_BONUS</div>
              <div className="terminal-orange text-lg font-bold">{settings.currency_daily_login_bonus}</div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}