import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { certificateApi, studentsApi } from '../api/client';
import { Award, Printer, ArrowLeft, QrCode, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CertificatePreviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student_id');
  const navigate = useNavigate();

  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [certData, setCertData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load verified students for dropdown selector
        const res = await studentsApi.list({ validation_status: 'valid', limit: 20 });
        setStudentsList(res.items);

        const targetId = studentIdParam || (res.items.length > 0 ? res.items[0].id : null);
        if (targetId) {
          setSelectedStudentId(targetId);
          const cert = await certificateApi.getPreview(targetId);
          setCertData(cert);
        }
      } catch (err) {
        console.error('Error loading certificate data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentIdParam]);

  const handleStudentChange = async (newId: string) => {
    setSelectedStudentId(newId);
    try {
      const cert = await certificateApi.getPreview(newId);
      setCertData(cert);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Students</span>
          </button>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">Select Verified Student:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
            >
              {studentsList.map((st) => (
                <option key={st.id} value={st.id} className="bg-white text-slate-800">
                  {st.name} ({st.apaar_id || 'No APAAR'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Certificate PDF</span>
        </button>
      </div>

      {/* Official Certificate Layout */}
      <div className="bg-white border-4 border-[#c8a84e] p-8 md:p-12 rounded-2xl shadow-xl relative overflow-hidden text-slate-800">
        {/* Ornate corner borders */}
        <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-[#c8a84e] pointer-events-none" />
        <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-[#c8a84e] pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-[#c8a84e] pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-[#c8a84e] pointer-events-none" />

        {/* Diagonal Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 rotate-[-25deg]">
          <span className="text-8xl font-black uppercase text-slate-900">
            AICTE OFFICIAL AUTHENTICATED
          </span>
        </div>

        {/* Certificate Header */}
        <div className="text-center pb-6 border-b border-slate-200 relative z-10">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-amber-500 p-0.5 flex items-center justify-center shadow-md">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-700" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-widest text-blue-950 uppercase font-serif">
            ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
          </h2>
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1 font-semibold">
            Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070
          </p>
          <p className="text-sm font-bold text-blue-900 tracking-wide mt-3 uppercase border-y border-amber-300 py-1.5 inline-block px-6 bg-amber-50/80 rounded">
            Student Enrollment & APAAR Verification Certificate
          </p>
        </div>

        {/* Certificate Body */}
        <div className="py-8 space-y-6 text-xs md:text-sm text-slate-700 relative z-10 leading-relaxed font-sans">
          <div className="flex justify-between items-center text-xs text-slate-500 pb-2">
            <span>Certificate ID: <strong className="font-mono text-blue-700 font-semibold">{certData?.certificate_id}</strong></span>
            <span>Issued Date: <strong className="text-slate-900">{certData?.issued_at}</strong></span>
          </div>

          <p className="text-justify text-sm text-slate-700">
            This is to certify that the student record detailed below has been officially reconciled and validated in accordance with the AICTE Sanctioned Intake Guidelines and authenticated with the National Automated Permanent Academic Account Registry (APAAR / DigiLocker NDEAR Registry).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-500 text-[11px] uppercase font-medium">Candidate Full Name</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{certData?.student?.name}</p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-medium">One Nation APAAR ID</span>
              <p className="text-base font-bold font-mono text-blue-700 mt-0.5">
                {certData?.student?.apaar_id}
              </p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-medium">Approved Institution</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {certData?.institution?.name} ({certData?.institution?.aicte_id})
              </p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-medium">Academic Programme</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {certData?.programme?.name} ({certData?.programme?.code})
              </p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-medium">Date of Birth & Gender</span>
              <p className="text-slate-800 mt-0.5 font-medium">
                {certData?.student?.dob} · {certData?.student?.gender} ({certData?.student?.category})
              </p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-medium">Academic Year Cycle</span>
              <p className="text-slate-800 mt-0.5 font-semibold">
                {certData?.programme?.academic_year}
              </p>
            </div>
          </div>
        </div>

        {/* Certificate Footer / QR / Signatures */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 text-xs">
          {/* QR Code Verification Block */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
              <QrCode className="w-12 h-12 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Digitally Authenticated</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Scan QR or visit apaar.aicte-india.org to verify authenticity.
              </p>
            </div>
          </div>

          {/* Authorized Signatory */}
          <div className="text-center sm:text-right">
            <div className="w-36 h-0.5 bg-blue-900 mx-auto sm:ml-auto mb-2" />
            <p className="font-bold text-slate-900">Member Secretary</p>
            <p className="text-[11px] text-slate-500">All India Council for Technical Education</p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-slate-400 mt-6 tracking-wide uppercase border-t border-slate-200 pt-3 relative z-10">
          Prototype Verification Document · Smart India Hackathon 2026 · Problem Statement SIH26263
        </p>
      </div>
    </div>
  );
};
