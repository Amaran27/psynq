'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useSettingsStore } from '../stores/settings.store';
import { useAdapterStore } from '../stores/adapter.store';
import Link from 'next/link';

export const SettingsContainer: React.FC = () => {
  const { user, isLoggedIn } = useAuthStore();
  const { settingsAdapter, initializeAdapter } = useAdapterStore();
  const { 
    tenants, 
    isLoading, 
    error, 
    setApiAdapter, 
    loadTenants
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'telephony' | 'storage' | 'tenants'>('general');

  useEffect(() => {
    initializeAdapter();
  }, [initializeAdapter]);

  useEffect(() => {
    if (settingsAdapter) {
      setApiAdapter(settingsAdapter);
    }
  }, [settingsAdapter, setApiAdapter]);

  useEffect(() => {
    if (isLoggedIn && user?.roles.includes('system_admin')) {
      loadTenants();
    }
  }, [isLoggedIn, user, loadTenants]);

  if (!isLoggedIn) return <div className="p-10 text-slate-600">Please login to access settings.</div>;
  
  const isAdmin = user?.roles.includes('admin') || user?.roles.includes('system_admin');
  if (!isAdmin) return <div className="p-10 text-red-600 font-bold">Access denied. Admins only.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 shadow-xl text-slate-300 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center space-x-2 text-white hover:text-blue-400 transition group">
            <div className="bg-slate-800 p-1.5 rounded group-hover:bg-blue-600 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
            </div>
            <span className="font-bold">Dashboard</span>
          </Link>
          <h2 className="text-xl font-bold mt-8 text-white tracking-tight">System Console</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Version 1.0.0</p>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto">
          <NavItem active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="⚙️">General</NavItem>
          <NavItem active={activeTab === 'telephony'} onClick={() => setActiveTab('telephony')} icon="📞">Telephony</NavItem>
          <NavItem active={activeTab === 'storage'} onClick={() => setActiveTab('storage')} icon="📁">Storage</NavItem>
          {user?.roles.includes('system_admin') && (
            <NavItem active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} icon="🏢">Tenants</NavItem>
          )}
        </nav>
        <div className="p-6 bg-slate-950 text-xs text-slate-500 border-t border-slate-800">
            Organization: <span className="text-slate-300 font-bold">{user?.organizationId || 'System'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-12 bg-white">
        <div className="max-w-4xl">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8 shadow-sm rounded flex items-center space-x-3">
                <span className="text-2xl">⚠️</span>
                <div>
                    <p className="font-bold">System Error</p>
                    <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'telephony' && <TelephonySettings />}
            {activeTab === 'storage' && <StorageSettings />}
            {activeTab === 'tenants' && <TenantManagement />}
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ children, active, onClick, icon }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-6 py-4 flex items-center space-x-3 transition-all ${active ? 'bg-blue-600 text-white shadow-lg relative z-10' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
        <span className="text-xl filter drop-shadow-sm">{icon}</span>
        <span className="font-semibold tracking-wide">{children}</span>
        {active && <div className="absolute right-0 w-1 h-8 bg-white rounded-l-full" />}
    </button>
);

const GeneralSettings = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-3xl font-black mb-2 text-slate-900">General Settings</h3>
            <p className="text-slate-500 mb-8 font-medium text-lg">Manage your organization's identity and global preferences.</p>
            
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">🚧</div>
                <h4 className="text-xl font-bold text-slate-800">Coming Soon</h4>
                <p className="text-slate-500 max-w-xs mt-2">Brand customization, logo upload, and timezone preferences are currently in development.</p>
            </div>
        </div>
    );
};

const TelephonySettings = () => {
    const { settings, loadSetting, updateSetting, isLoading } = useSettingsStore();
    const [provider, setProvider] = useState('');

    useEffect(() => { loadSetting('telephony.provider'); }, [loadSetting]);
    useEffect(() => { if (settings['telephony.provider']) setProvider(settings['telephony.provider'].value); }, [settings]);

    const handleSave = async () => {
        await updateSetting('telephony.provider', provider, false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
            <h3 className="text-3xl font-black mb-2 text-slate-900">Telephony Routing</h3>
            <p className="text-slate-500 mb-8 font-medium text-lg">Select and configure your active carrier integrations.</p>
            
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-10">
                    <label className="block text-sm font-black text-slate-500 uppercase tracking-widest mb-3">Active Provider Strategy</label>
                    <div className="grid grid-cols-3 gap-4">
                        <ProviderOption active={provider === 'twilio'} onClick={() => setProvider('twilio')} title="Twilio" icon="☁️" />
                        <ProviderOption active={provider === 'asterisk'} onClick={() => setProvider('asterisk')} title="Asterisk" icon="⚡" />
                        <ProviderOption active={provider === 'infobip'} onClick={() => setProvider('infobip')} title="Infobip" icon="📱" />
                    </div>
                </div>

                {provider === 'twilio' && <TwilioConfig />}
                {provider === 'asterisk' && <AsteriskConfig />}

                <button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="mt-10 w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:bg-slate-300"
                >
                    {isLoading ? 'Processing...' : 'Apply Telephony Settings'}
                </button>
            </div>
        </div>
    );
};

const ProviderOption = ({ active, onClick, title, icon }: any) => (
    <button 
        onClick={onClick}
        className={`p-6 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${active ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-400'}`}
    >
        <span className="text-3xl mb-2">{icon}</span>
        <span className="font-bold">{title}</span>
    </button>
);

const TwilioConfig = () => {
    const { settings, loadSetting, updateSetting } = useSettingsStore();
    const [config, setConfig] = useState({ accountSid: '', authToken: '', phoneNumber: '', backendUrl: '' });

    useEffect(() => {
        loadSetting('telephony.twilio.config');
    }, [loadSetting]);

    useEffect(() => {
        if (settings['telephony.twilio.config']) {
            setConfig(settings['telephony.twilio.config'].value || {});
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        updateSetting('telephony.twilio.config', config, true);
    };

    return (
        <div className="space-y-6 border-t border-slate-100 pt-10 mt-6 text-slate-800">
            <h4 className="font-bold text-xl text-slate-800">Cloud API Integration</h4>
            <div className="grid grid-cols-1 gap-6">
                <ConfigInput label="Account SID" name="accountSid" value={config.accountSid} onChange={handleChange} placeholder="AC..." />
                <ConfigInput label="Auth Token" name="authToken" type="password" value={config.authToken} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-6">
                    <ConfigInput label="Primary Number" name="phoneNumber" value={config.phoneNumber} onChange={handleChange} placeholder="+1..." />
                    <ConfigInput label="Webhook URL" name="backendUrl" value={config.backendUrl} onChange={handleChange} placeholder="https://api.yourdomain.com" />
                </div>
            </div>
            <button onClick={handleSave} className="text-sm font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Rotate Credentials</button>
        </div>
    );
};

const AsteriskConfig = () => {
    const { settings, loadSetting, updateSetting } = useSettingsStore();
    const [config, setConfig] = useState({ url: '', username: '', password: '', app: '' });

    useEffect(() => { loadSetting('telephony.asterisk.config'); }, [loadSetting]);
    useEffect(() => { if (settings['telephony.asterisk.config']) setConfig(settings['telephony.asterisk.config'].value || {}); }, [settings]);

    const handleChange = (e: any) => setConfig({ ...config, [e.target.name]: e.target.value });
    const handleSave = () => updateSetting('telephony.asterisk.config', config, true);

    return (
        <div className="space-y-6 border-t border-slate-100 pt-10 mt-6 text-slate-800">
            <h4 className="font-bold text-xl text-slate-800">On-Premise ARI Bridge</h4>
            <div className="grid grid-cols-2 gap-6">
                <ConfigInput label="ARI WebSocket URL" name="url" value={config.url} onChange={handleChange} placeholder="http://127.0.0.1:8088" />
                <ConfigInput label="Stasis Username" name="username" value={config.username} onChange={handleChange} />
                <ConfigInput label="Stasis Password" name="password" type="password" value={config.password} onChange={handleChange} />
                <ConfigInput label="App Identifier" name="app" value={config.app} onChange={handleChange} placeholder="psynq-app" />
            </div>
            <button onClick={handleSave} className="text-sm font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Update Bridge Config</button>
        </div>
    );
};

const StorageSettings = () => {
    const { settings, loadSetting, updateSetting, isLoading } = useSettingsStore();
    const [provider, setProvider] = useState('');

    useEffect(() => { loadSetting('storage.provider'); }, [loadSetting]);
    useEffect(() => { if (settings['storage.provider']) setProvider(settings['storage.provider'].value); }, [settings]);

    const handleSave = async () => { await updateSetting('storage.provider', provider, false); };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-3xl font-black mb-2 text-slate-900">Universal Storage</h3>
            <p className="text-slate-500 mb-8 font-medium text-lg">Direct the storage of call recordings and media assets.</p>
            
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-10">
                    <label className="block text-sm font-black text-slate-500 uppercase tracking-widest mb-3">Active Storage Engine</label>
                    <select 
                        value={provider} 
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-500 focus:ring-0 outline-none transition-all"
                    >
                        <option value="local">📁 Local Filesystem (Developer Mode)</option>
                        <option value="s3">☁️ Amazon S3 (Scalable Cloud)</option>
                        <option value="minio">🧊 MinIO (S3 Compatible On-Prem)</option>
                    </select>
                </div>

                {provider === 's3' && <S3Config />}
                {provider === 'minio' && <MinioConfig />}

                <button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="mt-10 w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-800 transition shadow-xl"
                >
                    {isLoading ? 'Applying...' : 'Update Storage Engine'}
                </button>
            </div>
        </div>
    );
};

const S3Config = () => {
    const { settings, loadSetting, updateSetting } = useSettingsStore();
    const [config, setConfig] = useState({ accessKeyId: '', secretAccessKey: '', region: '', bucket: '' });

    useEffect(() => { loadSetting('storage.s3.config'); }, [loadSetting]);
    useEffect(() => { if (settings['storage.s3.config']) setConfig(settings['storage.s3.config'].value || {}); }, [settings]);

    const handleChange = (e: any) => setConfig({ ...config, [e.target.name]: e.target.value });
    const handleSave = () => updateSetting('storage.s3.config', config, true);

    return (
        <div className="space-y-6 border-t border-slate-100 pt-10 mt-6 text-slate-800">
            <h4 className="font-bold text-xl text-slate-800">AWS Credentials</h4>
            <div className="grid grid-cols-2 gap-6">
                <ConfigInput label="Access Key ID" name="accessKeyId" value={config.accessKeyId} onChange={handleChange} />
                <ConfigInput label="Secret Access Key" name="secretAccessKey" value={config.secretAccessKey} onChange={handleChange} type="password" />
                <ConfigInput label="Region" name="region" value={config.region} onChange={handleChange} placeholder="us-east-1" />
                <ConfigInput label="Bucket Name" name="bucket" value={config.bucket} onChange={handleChange} />
            </div>
            <button onClick={handleSave} className="text-sm font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Save S3 Keys</button>
        </div>
    );
};

const MinioConfig = () => {
    const { settings, loadSetting, updateSetting } = useSettingsStore();
    const [config, setConfig] = useState({ endpoint: '', accessKey: '', secretKey: '', bucket: '', port: '9000', useSSL: false });

    useEffect(() => { loadSetting('storage.minio.config'); }, [loadSetting]);
    useEffect(() => { if (settings['storage.minio.config']) setConfig(settings['storage.minio.config'].value || {}); }, [settings]);

    const handleChange = (e: any) => setConfig({ ...config, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    const handleSave = () => updateSetting('storage.minio.config', config, true);

    return (
        <div className="space-y-6 border-t border-slate-100 pt-10 mt-6 text-slate-800">
            <h4 className="font-bold text-xl text-slate-800">Cluster Credentials</h4>
            <div className="grid grid-cols-2 gap-6">
                <ConfigInput label="Endpoint" name="endpoint" value={config.endpoint} onChange={handleChange} placeholder="localhost" />
                <ConfigInput label="Port" name="port" value={config.port} onChange={handleChange} />
                <ConfigInput label="Access Key" name="accessKey" value={config.accessKey} onChange={handleChange} />
                <ConfigInput label="Secret Key" name="secretKey" value={config.secretKey} onChange={handleChange} type="password" />
                <ConfigInput label="Bucket" name="bucket" value={config.bucket} onChange={handleChange} />
                <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                    <input type="checkbox" name="useSSL" checked={config.useSSL} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <label className="font-bold text-slate-700">Force Secure SSL</label>
                </div>
            </div>
            <button onClick={handleSave} className="text-sm font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Update Cluster Auth</button>
        </div>
    );
};

const ConfigInput = ({ label, ...props }: any) => (
    <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
        <input className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold focus:border-blue-500 focus:bg-white focus:ring-0 outline-none transition-all placeholder-slate-300 text-slate-800" {...props} />
    </div>
);

const TenantManagement = () => {
    const { tenants, createTenant, isLoading } = useSettingsStore();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createTenant(name, slug);
        setName('');
        setSlug('');
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-3xl font-black mb-2 text-slate-900">Identity & Tenants</h3>
            <p className="text-slate-500 mb-8 font-medium text-lg">Scale your system by adding and managing isolated business units.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 sticky top-10">
                        <h4 className="font-black text-xl mb-6 text-slate-800">New Organization</h4>
                        <div className="space-y-6">
                            <ConfigInput label="Display Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Acme Corp" />
                            <ConfigInput label="URL Slug" value={slug} onChange={(e: any) => setSlug(e.target.value)} placeholder="acme" />
                            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg hover:bg-green-700 transition shadow-lg shadow-green-100">
                                {isLoading ? 'Generating...' : 'Launch Tenant'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <h4 className="font-black text-slate-400 uppercase tracking-widest text-sm ml-2">Active Organizations ({tenants.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-800">
                        {tenants.map(tenant => (
                            <div key={tenant.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-50 transition">🏢</div>
                                    <span className={`px-3 py-1 text-xs font-black uppercase tracking-tighter rounded-full ${tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {tenant.isActive ? 'Healthy' : 'Suspended'}
                                    </span>
                                </div>
                                <h5 className="font-black text-xl text-slate-800">{tenant.name}</h5>
                                <p className="text-slate-400 text-xs mt-1 font-mono">slug: {tenant.slug}</p>
                                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-300 font-mono">{tenant.id}</span>
                                    <button className="text-blue-600 font-black text-xs hover:underline">Manage Config</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};