import React, { useState, useEffect } from 'react';
import { integrationsApi } from '../api/client';
import { Modal } from '../components/ui/Modal';
import {
  Network,
  ShieldCheck,
  Play,
  Settings,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Test Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [testInput, setTestInput] = useState('');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadIntegrations() {
      try {
        setLoading(true);
        const data = await integrationsApi.list();
        setIntegrations(data);
      } catch (err) {
        console.error('Error fetching integrations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadIntegrations();
  }, []);

  const openTestModal = (service: any) => {
    setSelectedService(service);
    setTestResponse(null);
    setTestInput(
      service.service_name === 'apaar'
        ? '240000000001'
        : service.service_name === 'digilocker'
        ? '240000000001'
        : service.service_name === 'aicte'
        ? 'RX-1001'
        : 'C-12345'
    );
    setTestModalOpen(true);
  };

  const runTest = async () => {
    if (!selectedService) return;
    setTesting(true);
    setTestResponse(null);
    try {
      const payload: any = {};
      if (selectedService.service_name === 'apaar') payload.apaar_id = testInput;
      if (selectedService.service_name === 'digilocker') {
        payload.apaar_id = testInput;
        payload.student_name = 'Aarav Sharma';
      }
      if (selectedService.service_name === 'aicte') payload.aicte_id = testInput;
      if (selectedService.service_name === 'aishe') payload.aishe_code = testInput;

      const res = await integrationsApi.mockCheck(selectedService.service_name, payload);
      setTestResponse(res);
    } catch (err: any) {
      setTestResponse({ error: err.message || 'Request failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Notice Banner */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
              Registry connectors are in sandbox mode
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              None of these connectors is connected to a government system. Each one is a local mock adapter that returns fixed or rule-based sample responses, so real integration would need official API access and authorisation.
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-blue-100 text-blue-800 border border-blue-300 shrink-0">
          Sandbox
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          <span>Integrations & Connectors</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Connectors for APAAR, DigiLocker / NAD, AICTE approval and AISHE lookups. Production access requires authorised onboarding with each registry.
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {item.badge}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-violet-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-violet-500" aria-hidden="true" />
                  <span>Sandbox — production not connected</span>
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 tracking-wide">{item.display_name}</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>

              <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 font-mono truncate">
                Endpoint: <span className="text-blue-700 font-semibold">{item.endpoint}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Last check: {item.last_checked}</span>
              <button
                onClick={() => openTestModal(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Sandbox Test</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Test Mock Verification Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title={`Sandbox Test: ${selectedService?.display_name || ''}`}
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Runs a query against the sandbox connector to check the response format. Sandbox results are not registry results.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Query Identifier ({selectedService?.service_name === 'apaar' ? 'APAAR ID' : 'Target Code / ID'})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
              />
              <button
                onClick={runTest}
                disabled={testing || !testInput}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {testing ? 'Testing...' : 'Execute Test'}
              </button>
            </div>
          </div>

          {/* Response Payload */}
          {testResponse && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sandbox response:</span>
                </span>
                <span className="text-[10px] font-mono text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 font-semibold">
                  SANDBOX
                </span>
              </div>
              <pre className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
