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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400" />
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
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Students</span>
          </button>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Select Verified Student:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="bg-[#0c182c] border border-[#1d3558] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {studentsList.map((st) => (
                <option key={st.id} value={st.id} className="bg-[#0c182c]">
                  {st.name} ({st.apaar_id || 'No APAAR'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Certificate PDF</span>
        </button>
      </div>

      {/* Official Certificate Layout */}
      <div className="bg-[#0b1526] border-4 border-[#c8a84e] p-8 md:p-12 rounded-2xl shadow-2xl relative overflow-hidden text-slate-100">
        {/* Ornate corner borders */}
        <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

        {/* Diagonal Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 rotate-[-25deg]">
          <span className="text-8xl font-black uppercase text-amber-300">
            AICTE DEMO PROTOTYPE
          </span>
        </div>

        {/* Certificate Header */}
        <div className="text-center pb-6 border-b border-[#254472]/60 relative z-10">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full bg-[#081220] rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold tracking-widest text-amber-400 uppercase font-serif">
            ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
          </h2>
          <p className="text-[11px] uppercase tracking-widest text-slate-400 mt-1 font-semibold">
            Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070
          </p>
          <p className="text-sm font-bold text-white tracking-wide mt-3 uppercase border-y border-amber-500/30 py-1.5 inline-block px-6 bg-amber-500/5">
            Student Enrollment & APAAR Verification Certificate
          </p>
        </div>

        {/* Certificate Body */}
        <div className="py-8 space-y-6 text-xs md:text-sm text-slate-200 relative z-10 leading-relaxed font-sans">
          <div className="flex justify-between items-center text-xs text-slate-400 pb-2">
            <span>Certificate ID: <strong className="font-mono text-amber-300">{certData?.certificate_id}</strong></span>
            <span>Issued Date: <strong className="text-white">{certData?.issued_at}</strong></span>
          </div>

          <p className="text-justify text-sm">
            This is to certify that the student record detailed below has been officially reconciled and validated in accordance with the AICTE Sanctioned Intake Guidelines and authenticated with the National Automated Permanent Academic Account Registry (APAAR / DigiLocker NDEAR Registry).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-[#081220]/90 border border-[#1d3862]">
            <div>
              <span className="text-slate-400 text-[11px] uppercase">Candidate Full Name</span>
              <p className="text-base font-bold text-white mt-0.5">{certData?.student?.name}</p>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] uppercase">One Nation APAAR ID</span>
              <p className="text-base font-bold font-mono text-amber-400 mt-0.5">
                {certData?.student?.apaar_id}
              </p>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] uppercase">Approved Institution</span>
              <p className="font-semibold text-white mt-0.5">
                {certData?.institution?.name} ({certData?.institution?.aicte_id})
              </p>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] uppercase">Academic Programme</span>
              <p className="font-semibold text-white mt-0.5">
                {certData?.programme?.name} ({certData?.programme?.code})
              </p>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] uppercase">Date of Birth & Gender</span>
              <p className="text-slate-200 mt-0.5">
                {certData?.student?.dob} · {certData?.student?.gender} ({certData?.student?.category})
              </p>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] uppercase">Academic Year Cycle</span>
              <p className="text-slate-200 mt-0.5 font-semibold">
                {certData?.programme?.academic_year}
              </p>
            </div>
          </div>
        </div>

        {/* Certificate Footer / QR / Signatures */}
        <div className="pt-6 border-t border-[#254472]/60 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 text-xs">
          {/* QR Code Verification Block */}
          <div className="flex items-center gap-3 p-3 bg-[#081220] rounded-xl border border-[#1b3459]">
            <div className="w-14 h-14 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
              <QrCode className="w-12 h-12 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Digitally Authenticated</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Scan QR or visit apaar.aicte-india.org to verify authenticity.
              </p>
            </div>
          </div>

          {/* Authorized Signatory */}
          <div className="text-center sm:text-right">
            <div className="w-36 h-0.5 bg-amber-400/80 mx-auto sm:ml-auto mb-2" />
            <p className="font-bold text-white">Member Secretary</p>
            <p className="text-[11px] text-slate-400">All India Council for Technical Education</p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-slate-500 mt-6 tracking-wide uppercase border-t border-slate-800/80 pt-3 relative z-10">
          Prototype Verification Document · Smart India Hackathon 2026 · Problem Statement SIH26263
        </p>
      </div>
    </div>
  );
};
